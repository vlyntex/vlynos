import prisma from './db';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';
import { getSetting } from './settings';

export const startTaskLockJob = () => {
  setInterval(async () => {
    try {
      const now = new Date();
      const unlockedTasks = await prisma.task.findMany({
        where: {
          isLocked: false,
          lockedAt: { lte: now }
        }
      });

      if (unlockedTasks.length > 0) {
        for (const task of unlockedTasks) {
          await prisma.task.update({
            where: { id: task.id },
            data: { isLocked: true }
          });
          
          await prisma.taskHistory.create({
            data: {
              taskId: task.id,
              action: 'LOCKED',
              performedById: task.workerId, 
              details: JSON.stringify({ reason: '5-minute window expired automatically' })
            }
          });

          logger.info(`Task locked automatically: ${task.taskId}`);
        }
      }
    } catch (error) {
      logger.error('Background task lock job error', error);
    }
  }, 30000); 
};

export const startNotificationExpiryJob = () => {
  // Run once a day (24 hours)
  setInterval(async () => {
    try {
      const notifRetention = parseInt(await getSetting('NOTIFICATION_RETENTION_DAYS')) || 90;
      const now = new Date();
      const cutoff = new Date(now.getTime() - notifRetention * 24 * 60 * 60 * 1000);

      const sysDeleted = await prisma.notification.deleteMany({
        where: { type: 'SYSTEM', createdAt: { lt: cutoff } }
      });

      const taskDeleted = await prisma.notification.deleteMany({
        where: { type: { in: ['TASK_CREATED', 'TASK_ACCEPTED', 'TASK_REJECTED', 'GROUP_INVITE'] }, createdAt: { lt: cutoff } }
      });

      const annDeleted = await prisma.notification.deleteMany({
        where: { type: 'ANNOUNCEMENT', createdAt: { lt: cutoff } }
      });

      if (sysDeleted.count > 0 || taskDeleted.count > 0 || annDeleted.count > 0) {
        logger.info(`Notification expiry job cleared ${sysDeleted.count} sys, ${taskDeleted.count} task, ${annDeleted.count} ann`);
      }
    } catch (error) {
      logger.error('Background notification expiry job error', error);
    }
  }, 24 * 60 * 60 * 1000);
};

export const startReportCleanupJob = () => {
  // Run once a day
  setInterval(async () => {
    try {
      const reportRetention = parseInt(await getSetting('REPORT_RETENTION_DAYS')) || 7;
      const now = new Date();
      const cutoff = new Date(now.getTime() - reportRetention * 24 * 60 * 60 * 1000);

      const expiredJobs = await prisma.reportJob.findMany({
        where: {
          createdAt: { lt: cutoff },
          status: { in: ['COMPLETED', 'FAILED'] }
        }
      });

      for (const job of expiredJobs) {
        if (job.fileUrl) {
          const filePath = path.join(__dirname, '../../uploads/reports', job.fileUrl);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }

      const updated = await prisma.reportJob.updateMany({
        where: {
          createdAt: { lt: cutoff },
          status: { in: ['COMPLETED', 'FAILED'] }
        },
        data: {
          status: 'EXPIRED',
          fileUrl: null
        }
      });

      if (updated.count > 0) {
        logger.info(`Expired and cleaned up ${updated.count} old report jobs.`);
      }
    } catch (err) {
      logger.error('Error during report cleanup job', err);
    }
  }, 24 * 60 * 60 * 1000);
};

export const startSystemCleanupJobs = () => {
  setInterval(async () => {
    try {
      const sessionRetention = parseInt(await getSetting('SESSION_RETENTION_DAYS')) || 14;
      
      const now = new Date();
      const sessionCutoff = new Date(now.getTime() - sessionRetention * 24 * 60 * 60 * 1000);
      
      await prisma.session.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isValid: false },
            { createdAt: { lt: sessionCutoff } }
          ]
        }
      });

      const backupCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oldBackups = await prisma.backup.findMany({
        where: { createdAt: { lt: backupCutoff } }
      });

      for (const backup of oldBackups) {
        const p = path.join(__dirname, '../../backups', backup.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
        await prisma.backup.delete({ where: { id: backup.id } });
      }

    } catch (err) {
      logger.error('System cleanup jobs error', err);
    }
  }, 12 * 60 * 60 * 1000);
};
