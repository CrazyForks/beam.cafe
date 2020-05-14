import {settings} from './Settings';

export type NotificationPayload = {
    title: string;
    body?: string;
    image?: string;
};

export type ResolveNotification = 'click' | 'close' | string | null;

// Currently active notifications
const pendingRequests = new Map<string, (s: ResolveNotification) => void>();

// UID Generator
const uid = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e14).toString(36)}`;

// Wait until service worker is initialized
navigator.serviceWorker.ready.then(() => {

    // Listen to resolved notifications
    navigator.serviceWorker.addEventListener('message', ev => {
        const {type, tag, action} = ev.data;

        if (type === 'notify-reply') {
            const resolver = pendingRequests.get(tag);

            if (resolver) {
                resolver(action);
            }
        }
    });
});

// Internal notification-request function
// TODO: What about actions on chromium-based browsers?
const requestNotification = (options: NotificationPayload, interaction = false): string | null => {

    // Check if notifications are enabled
    if (settings.get('notifications') !== true) {
        return null;
    }

    const {controller} = navigator.serviceWorker;

    if (!controller) {
        return null;
    }

    const tag = uid();
    controller.postMessage({
        type: 'notify',
        data: {interaction, ...options},
        tag
    });

    return tag;
};

/**
 * Shows a notification and expects a response from the user
 * @param options
 */
export const showNotification = async (options: NotificationPayload): Promise<ResolveNotification> => {
    return new Promise<ResolveNotification>(resolve => {
        const tag = requestNotification(options, true);

        if (tag) {
            pendingRequests.set(tag, resolve);
        } else {
            resolve(null);
        }
    });
};


/**
 * Shows a notification without reacting to any user-interaction, returns boolean
 * whether the notification got displayed.
 * @param options
 */
export const pushNotification = (options: NotificationPayload): boolean => {
    return requestNotification(options, false) !== null;
};
