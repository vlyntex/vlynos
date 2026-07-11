import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Allow safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt auth routes that don't need CSRF or set the cookie
  if (req.path === '/api/v1/auth/csrf' || req.path === '/api/v1/auth/login') {
    return next();
  }

  const tokenFromCookie = req.cookies['csrfToken'];
  const tokenFromHeader = req.headers['x-csrf-token'];

  if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
    logger.security(`CSRF validation failed for ${req.ip}. Token mismatch.`, req.id);
    res.status(403).json({ message: 'Invalid CSRF token', requestId: req.id });
    return;
  }

  next();
};

export const generateCsrfToken = (req: Request, res: Response): void => {
  const token = crypto.randomBytes(32).toString('hex');
  
  res.cookie('csrfToken', token, {
    httpOnly: false, // Must be readable by frontend JS to set header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  res.status(200).json({ token });
};
