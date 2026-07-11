import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { config } from '../config';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required', requestId: req.id });
      return;
    }

    const domain = config.companyDomain;
    if (!email.endsWith(`@${domain}`)) {
      res.status(403).json({ message: 'Only company emails are allowed', requestId: req.id });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Check rate limit before validating password
    const recentFails = await prisma.loginAttempt.count({
      where: { email, success: false, timestamp: { gt: new Date(Date.now() - 15 * 60 * 1000) } }
    });

    if (recentFails >= 5) {
      if (recentFails === 5) {
        await prisma.systemAlert.create({ data: { type: 'SECURITY_ALERT', message: `Account locked: 5 failed login attempts in 15 mins for ${email}` }});
        logger.security(`Account locked due to 5 failed logins: ${email}`, req.id);
      }
      res.status(429).json({ message: 'Account locked for 15 minutes due to too many failed attempts.', requestId: req.id });
      return;
    }

    if (!user || user.accountStatus !== 'ACTIVE') {
      await prisma.loginAttempt.create({ data: { email, ip: req.ip || req.socket.remoteAddress || '', success: false } });
      
      logger.security(`Failed login attempt for email: ${email}`, req.id);
      res.status(401).json({ message: 'Invalid credentials or inactive account', requestId: req.id });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      await prisma.loginAttempt.create({ data: { email, ip: req.ip || req.socket.remoteAddress || '', success: false } });
      
      logger.security(`Invalid password for email: ${email}`, req.id);
      res.status(401).json({ message: 'Invalid credentials', requestId: req.id });
      return;
    }

    await prisma.loginAttempt.create({ data: { email, ip: req.ip || req.socket.remoteAddress || '', success: true } });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        ip: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
      }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, sessionId: session.id },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    logger.info(`User logged in: ${user.id}`, req.id);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      },
      requestId: req.id
    });
  } catch (error) {
    logger.error('Login error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      if (decoded.sessionId) {
        await prisma.session.update({ where: { id: decoded.sessionId }, data: { isValid: false } });
      }
    } catch (e) {
      // ignore
    }
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
  });
  logger.info(`User logged out`, req.id);
  res.status(200).json({ message: 'Logged out successfully', requestId: req.id });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        accountStatus: true,
        notifyTasks: true,
        notifyGroups: true,
        notifyAnnouncements: true,
        notifyBrowser: true,
        notifySounds: true,
        quietHoursStart: true,
        quietHoursEnd: true,
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found', requestId: req.id });
      return;
    }

    res.status(200).json({ user, requestId: req.id });
  } catch (error) {
    logger.error('Get me error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const updateNotificationSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { notifyTasks, notifyGroups, notifyAnnouncements, notifyBrowser, notifySounds, quietHoursStart, quietHoursEnd } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        notifyTasks: notifyTasks !== undefined ? notifyTasks : undefined,
        notifyGroups: notifyGroups !== undefined ? notifyGroups : undefined,
        notifyAnnouncements: notifyAnnouncements !== undefined ? notifyAnnouncements : undefined,
        notifyBrowser: notifyBrowser !== undefined ? notifyBrowser : undefined,
        notifySounds: notifySounds !== undefined ? notifySounds : undefined,
        quietHoursStart: quietHoursStart !== undefined ? quietHoursStart : undefined,
        quietHoursEnd: quietHoursEnd !== undefined ? quietHoursEnd : undefined,
      },
      select: {
        notifyTasks: true,
        notifyGroups: true,
        notifyAnnouncements: true,
        notifyBrowser: true,
        notifySounds: true,
        quietHoursStart: true,
        quietHoursEnd: true,
      }
    });

    res.status(200).json({ settings: user });
  } catch (err) {
    logger.error('Update notification settings error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ message: 'Old and new passwords are required', requestId: req.id });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ message: 'User not found', requestId: req.id });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Incorrect old password', requestId: req.id });
      return;
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      res.status(400).json({ message: 'Password must be at least 8 chars long and contain an uppercase, lowercase, number and special char', requestId: req.id });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date()
      }
    });

    logger.info(`User changed password: ${req.user!.id}`, req.id);
    res.status(200).json({ message: 'Password updated successfully', requestId: req.id });
  } catch (error) {
    logger.error('Change password error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};
