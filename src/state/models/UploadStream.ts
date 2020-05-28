import {ListedFile}                        from '@state/models/ListedFile';
import {UploadLike, UploadLikeSimpleState} from '@state/models/types';
import {settings}                          from '@state/stores/Settings';
import {socket}                            from '@state/stores/Socket';
import {on}                                from '@utils/events';
import {uid}                               from '@utils/uid';
import {action, computed, observable}      from 'mobx';

type PendingStream = {
    url: string;
    range: [number, number];
};

export type UploadStreamState = 'idle' |
    'awaiting-approval' |
    'running' |
    'paused' |
    'cancelled';

export class UploadStream implements UploadLike<UploadStreamState> {
    @observable public streaming = false;
    @observable public progress = 0;
    public readonly streamKey: string;
    public readonly listedFile: ListedFile;
    public readonly id: string;

    // Current stream state
    @observable public state: UploadStreamState = 'idle';

    // Internal chunks
    @observable private uploads: Map<string, XMLHttpRequest> = new Map();

    // Pending uploads in case it's paused or is awaiting user-approval
    private pendingUploads: Map<string, PendingStream> = new Map();

    constructor(streamKey: string, listedFile: ListedFile) {
        this.streamKey = streamKey;
        this.listedFile = listedFile;
        this.id = uid(); // TODO: Redundant?
        this.update(settings.get('autoPause') ? 'awaiting-approval' : 'running');
    }

    @computed
    get activeUploads(): number {
        return this.uploads.size;
    }

    @computed
    get currentSpeed(): number {
        return 0;
    }

    @computed
    get simpleState(): UploadLikeSimpleState {
        if (this.uploads.size) {
            return 'active';
        }

        return 'done';
    }

    @action
    public cancelStream(key: string): boolean {
        const req = this.uploads.get(key);

        if (!req) {
            return false;
        } else if (this.pendingUploads.get(key)) {
            return true;
        }

        const {readyState} = req;
        this.uploads.delete(key);

        if (readyState > XMLHttpRequest.UNSENT && readyState < XMLHttpRequest.DONE) {
            req.abort();
        }

        return true;
    }

    @action
    public consume(range: [number, number], url: string, id: string) {
        if (this.state !== 'running') {
            this.pendingUploads.set(id, {range, url});
            return;
        }

        const {file} = this.listedFile;
        const xhr = new XMLHttpRequest();

        // Disable timeouts entirely
        // See https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/timeout
        xhr.timeout = 0;

        let lastLoad = 0;
        on(xhr.upload, [
            'progress',
            'error',
            'load'
        ], (e: ProgressEvent) => {
            switch (e.type) {

                // Track upload progress
                case 'progress': {
                    this.progress += (e.loaded - lastLoad);
                    lastLoad = e.loaded;
                    break;
                }

                // Remove on finish
                case 'error':
                case 'load': {
                    this.uploads.delete(id);
                }
            }
        });

        // Transfer bytes
        xhr.open('POST', url, true);
        xhr.send(file.slice(range[0], range[1], file.type));
        this.uploads.set(id, xhr);
    }

    update(status: UploadStreamState): boolean {
        const {state} = this;

        switch (status) {
            case 'awaiting-approval':
            case 'idle': {
                if (state !== 'idle') {
                    return false;
                }

                break;
            }
            case 'paused': {
                if (state !== 'running') {
                    return false;
                }

                break;
            }
            case 'running': {
                if (state === 'running' || state === 'cancelled') {
                    return false;
                }

                break;
            }
            case 'cancelled': {

                // Cancel all streams
                for (const [key, req] of this.uploads) {
                    const {readyState} = req;
                    this.uploads.delete(key);

                    if (readyState > XMLHttpRequest.UNSENT && readyState < XMLHttpRequest.DONE) {
                        req.abort();
                    }
                }

                // Cancel stream-key server-side
                socket.sendMessage('cancel-stream', this.streamKey);
            }
        }

        this.state = status;

        // Start pending streams
        if (status === 'running' && this.pendingUploads.size) {
            for (const [key, {range, url}] of this.pendingUploads) {
                this.consume(range, url, key);
            }

            this.pendingUploads.clear();
        }

        return true;
    }
}