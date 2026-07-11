import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';
import prisma from '../utils/db';

export const globalErrorHandler = async (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.error('Unhandled Exception', err, req.id);

  try {
    await prisma.errorLog.create({
      data: {
        userId: (req as any).user?.id,
        requestId: req.id,
        error: err.message,
        stackTrace: err.stack || null,
        route: req.originalUrl
      }
    });
  } catch (dbErr) {
    logger.error('Failed to write to ErrorLog', dbErr);
  }

  res.status(500).json({
    message: 'Internal server error',
    requestId: req.id,
    ...(config.nodeEnv === 'development' ? { error: err.message } : {})
  });
};
