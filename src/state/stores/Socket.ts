/* eslint-disable no-console */
import GracefulWebSocket    from 'graceful-ws';
import {action, observable} from 'mobx';
import {XHUpload}           from '../../utils/XHUpload';
import {files, Keys}        from './Files';
import {uploads}            from './Uploads';

export type ConnectionState = 'connected' | 'disconnected';

class Socket {
    @observable public connectionState: ConnectionState;
    private readonly ws: GracefulWebSocket;
    private sessionKey: string | null;

    constructor() {
        this.ws = new GracefulWebSocket(env.WS_ENDPOINT);
        this.connectionState = 'disconnected';
        this.sessionKey = null;

        this.ws.addEventListener('connected', () => {
            this.updateState('connected');
            console.log('[WS] Connected!');

            // Try to re-establish connection or create a new session
            if (this.sessionKey !== null) {
                this.sendMessage('restore-session', this.sessionKey);
            } else {
                this.sendMessage('create-session');
            }
        });

        this.ws.addEventListener('disconnected', () => {
            this.updateState('disconnected');
            console.log('[WS] Disconnected!');
        });

        this.ws.addEventListener('message', e => {
            try {
                const {type, payload} = JSON.parse((e as MessageEvent).data);
                this.onMessage(type, payload);
            } catch (e) {
                console.error(e);
            }
        });
    }

    public sendMessage(type: string, payload: unknown = null): void {
        this.ws.send(JSON.stringify({type, payload}));
    }

    @action
    private updateState(newState: ConnectionState) {
        this.connectionState = newState;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private onMessage(type: string, payload: any): void {
        switch (type) {
            case 'restore-session': {
                files.enableFiles(payload.files);
                this.sessionKey = payload.key;
                break;
            }
            case 'new-session': {
                this.sessionKey = payload;
                break;
            }
            case 'file-registrations': {
                files.enableFiles(payload as Keys);
                break;
            }
            case 'file-request': {
                const {fileId, downloadId} = payload;

                const item = files.listedFiles.find(
                    value => value.id === fileId
                );

                if (!item) {
                    console.warn('[WS] File not longer available...');
                    break;
                }

                uploads.registerUpload(
                    downloadId, item,
                    new XHUpload(`${env.API_ENDPOINT}/file/${downloadId}`, item.file)
                );

                break;
            }
            case 'download-cancelled': {
                uploads.updateUploadState(payload, 'peer-cancelled');
                break;
            }
            default: {
                console.warn(`[WS] Unknown action: ${type}`);
            }
        }
    }

}

export const socket = new Socket();
