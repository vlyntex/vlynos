import { Server } from 'socket.io';
export declare const setIoInstance: (io: Server) => void;
interface CreateNotificationParams {
    recipientUserId: string;
    title: string;
    message: string;
    type: any;
    priority?: 'NORMAL' | 'IMPORTANT';
    dedupKey?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
}
export declare const NotificationService: {
    getPublicKey: () => string;
    create: (params: CreateNotificationParams) => Promise<void>;
    createBulkAnnouncement: (title: string, message: string, priority?: 'NORMAL' | 'IMPORTANT') => Promise<void>;
};
export {};
//# sourceMappingURL=notification.service.d.ts.map