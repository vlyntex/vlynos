import webpush from 'web-push';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { Server } from 'socket.io';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:admin@vlyntech.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('VAPID keys not set. Web push notifications will be disabled.');
}

let ioInstance: Server | null = null;
export const setIoInstance = (io: Server) => { ioInstance = io; };
export const getIoInstance = () => ioInstance;

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

export const NotificationService = {
  getPublicKey: () => VAPID_PUBLIC_KEY,

  create: async (params: CreateNotificationParams) => {
    try {
      if (params.dedupKey) {
        const existing = await prisma.notification.findFirst({
          where: { dedupKey: params.dedupKey, recipientUserId: params.recipientUserId }
        });
        if (existing) return;
      }

      const user = await prisma.user.findUnique({ where: { id: params.recipientUserId } });
      if (!user) return;

      const priority = params.priority || 'NORMAL';

      // Check user preferences based on type
      if (params.type.startsWith('TASK_') && !user.notifyTasks) return;
      if (params.type === 'GROUP_INVITE' && !user.notifyGroups) return;
      if (params.type === 'ANNOUNCEMENT' && priority !== 'IMPORTANT' && !user.notifyAnnouncements) return;

      const notification = await prisma.notification.create({ 
        data: {
          recipientUserId: params.recipientUserId,
          title: params.title,
          message: params.message,
          type: params.type,
          priority: priority,
          dedupKey: params.dedupKey,
          relatedEntityType: params.relatedEntityType,
          relatedEntityId: params.relatedEntityId
        } 
      });
      
      logger.audit('NOTIFICATION_CREATED', null as any, { notificationId: notification.id, recipientUserId: user.id });

      let deliveryStatus: 'PENDING' | 'DELIVERED' | 'FAILED' = 'PENDING';
      let deliveredAt: Date | null = null;

      // 1. Live Notification via Socket.IO
      if (ioInstance) {
        ioInstance.to(`user_${user.id}`).emit('new_notification', notification);
      }

      // 2. Web Push Notification
      if (user.notifyBrowser) {
        const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id, isActive: true } });
        const payload = JSON.stringify({
          title: notification.title,
          body: notification.message,
          data: { url: `/notifications` }
        });

        if (subs.length > 0) {
          deliveryStatus = 'FAILED';
          for (const sub of subs) {
            try {
              await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: { p256dh: sub.publicKey, auth: sub.authKey }
              }, payload);
              await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } });
              deliveryStatus = 'DELIVERED';
              deliveredAt = new Date();
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await prisma.pushSubscription.update({ where: { id: sub.id }, data: { isActive: false } });
              } else {
                logger.error(`Push notification failed for sub ${sub.id}`, err);
              }
            }
          }
        }
      }

      await prisma.notification.update({
        where: { id: notification.id },
        data: { deliveryStatus, deliveredAt }
      });

    } catch (err) {
      logger.error('Failed to create notification', err);
    }
  },

  createBulkAnnouncement: async (title: string, message: string, priority: 'NORMAL' | 'IMPORTANT' = 'NORMAL') => {
    // Run asynchronously
    setImmediate(async () => {
      try {
        const users = await prisma.user.findMany({ where: { accountStatus: 'ACTIVE' } });
        for (const user of users) {
          await NotificationService.create({
            recipientUserId: user.id,
            title,
            message,
            type: 'ANNOUNCEMENT',
            priority
          });
        }
      } catch (err) {
        logger.error('Failed to create bulk announcement', err);
      }
    });
  }
};
