import { Router, Request, Response } from 'express';
import prisma from '../utils/db';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    logger.error('Database health check failed', error, req.id);
  }

  res.status(200).json({
    status: 'ok',
    api: 'running',
    database: dbStatus,
    uptime: process.uptime(),
    version: config.version,
    requestId: req.id
  });
});

export default router;
