import type { StateCreator } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
}

export interface NotificationState {
    notifications: Notification[];
}

export interface NotificationActions {
    addNotification: (message: string, type: NotificationType, duration?: number) => void;
    removeNotification: (id: string) => void;
}

export const initialNotificationState: NotificationState = {
    notifications: [],
};

export const createNotificationSlice: StateCreator<
    NotificationState & NotificationActions,
    [],
    [],
    NotificationState & NotificationActions
> = (set) => ({
    ...initialNotificationState,

    addNotification: (message, type, duration = 3000) => {
        const id = crypto.randomUUID();
        set((state) => ({
            notifications: [...state.notifications, { id, message, type, duration }]
        }));

        if (duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id)
                }));
            }, duration);
        }
    },

    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
    })),
});
