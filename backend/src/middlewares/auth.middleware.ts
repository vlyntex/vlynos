import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { config } from '../config';
import prisma from '../utils/db';
import { getSetting } from '../utils/settings';

interface JwtPayload {
  id: string;
  role: string;
  vendorId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.token;
    if (!token) {
      res.status(401).json({ message: 'Authentication required', requestId: req.id });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    if (decoded.sessionId) {
      const session = await prisma.session.findUnique({ where: { id: decoded.sessionId } });
      if (!session || !session.isValid) {
        res.status(401).json({ message: 'Session expired or revoked' });
        return;
      }

      // Session Fingerprinting Check (Device Hijacking Protection)
      if (session.userAgent !== req.headers['user-agent']) {
        logger.warn(`User-agent changed for session ${decoded.sessionId}. Expected: ${session.userAgent}, Got: ${req.headers['user-agent']}`, req.id);
        // Only block in production to prevent local development issues when browser updates
        if (config.nodeEnv === 'production') {
          res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'strict' });
          res.status(401).json({ message: 'Session invalidated due to security policy' });
          return;
        }
      }
      
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (session.lastActivityAt < fiveMinsAgo) {
        prisma.session.update({ where: { id: session.id }, data: { lastActivityAt: new Date() } }).catch(console.error);
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { vendor: true }
    });

    if (user && user.role !== 'MANAGEMENT') {
      const isMaintenance = await getSetting('MAINTENANCE_MODE');
      if (isMaintenance === 'true') {
        if (decoded.sessionId) {
          await prisma.session.update({ where: { id: decoded.sessionId }, data: { isValid: false } }).catch(() => {});
        }
        res.clearCookie('token', { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'strict' });
        res.status(503).json({ message: 'System is under maintenance.' });
        return;
      }
    }

    if (!user || user.accountStatus !== 'ACTIVE') {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        domain: process.env.COMPANY_EMAIL_DOMAIN
      });
      res.status(403).json({ message: 'Account is inactive or suspended', requestId: req.id });
      return;
    }

    req.user = {
      ...decoded,
      vendorId: user.vendorId || undefined
    };
    next();
  } catch (error) {
    logger.error('Authentication failed', error, req.id);
    res.status(401).json({ message: 'Invalid or expired token', requestId: req.id });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required', requestId: req.id });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.security(`Forbidden access attempt by user ${req.user.id} for role(s) ${roles.join(',')}`, req.id);
      res.status(403).json({ message: 'Forbidden: insufficient permissions', requestId: req.id });
      return;
    }

    next();
  };
};
