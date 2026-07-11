import { Request, Response } from 'express';
import prisma from '../utils/db';
import { logger } from '../utils/logger';

export const listNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    let whereClause: any = { recipientUserId: req.user!.id };

    if (search) {
      const s = String(search).toLowerCase();
      whereClause.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { message: { contains: s, mode: 'insensitive' } }
      ];
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ notifications });
  } catch (err) {
    logger.error('List notifications error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await prisma.notification.count({
      where: { recipientUserId: req.user!.id, isRead: false }
    });
    res.status(200).json({ count });
  } catch (err) {
    logger.error('Get unread count error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const notification = await prisma.notification.findFirst({
      where: { id, recipientUserId: req.user!.id }
    });

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() }
    });

    logger.audit('NOTIFICATION_READ', req, { notificationId: id });
    res.status(200).json({ message: 'Marked as read' });
  } catch (err) {
    logger.error('Mark read error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAllRead = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { recipientUserId: req.user!.id, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    res.status(200).json({ message: 'All marked as read' });
  } catch (err) {
    logger.error('Mark all read error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const subscribePush = async (req: Request, res: Response): Promise<void> => {
  try {
    const { endpoint, keys, deviceName, browser } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      res.status(400).json({ message: 'Invalid subscription object' });
      return;
    }

    const sub = await prisma.pushSubscription.findFirst({ where: { endpoint } });
    if (sub) {
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { userId: req.user!.id, isActive: true, lastUsedAt: new Date() }
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId: req.user!.id,
          endpoint,
          publicKey: keys.p256dh,
          authKey: keys.auth,
          deviceName,
          browser
        }
      });
    }

    res.status(200).json({ message: 'Subscribed' });
  } catch (err) {
    logger.error('Push subscribe error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
