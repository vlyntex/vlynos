import { Request, Response } from 'express';
import prisma from '../utils/db';
import { logger } from '../utils/logger';

export const listActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { action, entityType, date, searchUser } = req.query;

    let whereClause: any = {};

    if (user.role === 'WORKER') {
      whereClause.actorUserId = user.id;
    } else if (user.role === 'VENDOR') {
      const u = await prisma.user.findUnique({ where: { id: user.id } });
      const vendorWorkers = await prisma.user.findMany({ where: { vendorId: u?.vendorId } });
      const validIds = [user.id, ...vendorWorkers.map(w => w.id)];
      whereClause.actorUserId = { in: validIds };
    }

    if (action) whereClause.action = String(action);
    if (entityType) whereClause.entityType = String(entityType);
    if (date) {
      const d = new Date(String(date));
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      whereClause.createdAt = { gte: d, lt: nextDay };
    }
    if (searchUser) {
      whereClause.actor = {
        OR: [
          { firstName: { contains: String(searchUser), mode: 'insensitive' } },
          { lastName: { contains: String(searchUser), mode: 'insensitive' } }
        ]
      };
    }

    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: { actor: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100 // limit to recent
    });

    res.status(200).json({ activities });
  } catch (err) {
    logger.error('List activity error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
