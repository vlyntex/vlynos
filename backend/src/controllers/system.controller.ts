import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import prisma from '../utils/db';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config';
import crypto from 'crypto';
import UAParser from 'ua-parser-js';

const execFileAsync = promisify(execFile);

const BACKUPS_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// ==========================================
// 1. HEALTH
// ==========================================
export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    let dbStatus = 'UP';
    let dbVersion = 'Unknown';
    let dbConnections = 0;
    try {
      const verRes: any[] = await prisma.$queryRaw`SELECT version();`;
      dbVersion = verRes[0]?.version || 'Unknown';
      const connRes: any[] = await prisma.$queryRaw`SELECT count(*) FROM pg_stat_activity;`;
      dbConnections = parseInt(connRes[0]?.count || '0');
    } catch (e) {
      dbStatus = 'DOWN';
    }

    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const cpus = os.cpus();
    const uptime = process.uptime();

    let diskUsage = 'Unknown';
    try {
      const stat = fs.statfsSync(__dirname);
      const totalDisk = stat.blocks * stat.bsize;
      const freeDisk = stat.bfree * stat.bsize;
      diskUsage = `${((totalDisk - freeDisk) / totalDisk * 100).toFixed(2)}% used`;
    } catch (e) {}

    const sessionCount = await prisma.session.count({ where: { isValid: true } });
    const alerts = await prisma.systemAlert.findMany({ where: { isResolved: false }, orderBy: { createdAt: 'desc' } });

    res.status(200).json({
      api: 'UP',
      database: dbStatus,
      dbVersion,
      dbConnections,
      activeSessions: sessionCount,
      diskUsage,
      memoryUsage: `${((totalMem - freeMem) / totalMem * 100).toFixed(2)}% used`,
      cpuCount: cpus.length,
      uptime,
      version: '1.0.0',
      alerts
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==========================================
// 2. BACKUPS
// ==========================================
export const getBackups = async (req: Request, res: Response): Promise<void> => {
  try {
    const backups = await prisma.backup.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json(backups);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.dump`;
    const filePath = path.join(BACKUPS_DIR, filename);
    const dbUrl = config.databaseUrl || 'postgresql://postgres:postgres@localhost:5432/vlyntech_dev';
    
    res.status(202).json({ message: 'Backup started' });

    try {
      // Use Custom Format (-Fc) which is natively compressed
      await execFileAsync('pg_dump', [dbUrl, '-Fc', '-f', filePath]);
      const stat = fs.statSync(filePath);
      
      if (stat.size === 0) throw new Error('Backup file size is 0');

      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      await prisma.backup.create({
        data: {
          filename,
          size: stat.size,
          status: 'COMPLETED',
          hash
        }
      });
      logger.info(`Backup completed: ${filename} (Hash: ${hash})`);
    } catch (e: any) {
      logger.error('pg_dump error', e);
      await prisma.backup.create({ data: { filename, size: 0, status: 'FAILED' } });
      await prisma.systemAlert.create({
        data: { type: 'BACKUP_FAILED', message: `Backup ${filename} failed to generate.` }
      });
    }
  } catch (err) {
    logger.error('Create backup error', err);
  }
};

export const restoreBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: String(req.params.id) } });
    if (!backup || backup.status !== 'COMPLETED') {
      res.status(404).json({ message: 'Backup not found' });
      return;
    }
    const filePath = path.resolve(BACKUPS_DIR, backup.filename);
    if (!filePath.startsWith(path.resolve(BACKUPS_DIR))) {
      res.status(400).json({ message: 'Invalid backup path' });
      return;
    }
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'File not found on disk' });
      return;
    }

    const dbUrl = config.databaseUrl || 'postgresql://postgres:postgres@localhost:5432/vlyntech_dev';
    
    // -c cleanly drops existing objects, -d connects to target db
    // This blocks the API until restore completes. MVP approach.
    await execFileAsync('pg_restore', ['-c', '-d', dbUrl, filePath]);
    
    logger.security(`Management executed database restore using: ${backup.filename}`, req.id);
    res.status(200).json({ message: 'Database successfully restored.' });
  } catch (err: any) {
    logger.error('Restore backup error', err);
    res.status(500).json({ message: 'Restore failed' });
  }
};

export const downloadBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: String(req.params.id) } });
    if (!backup || backup.status !== 'COMPLETED') {
      res.status(404).json({ message: 'Backup not found' });
      return;
    }
    const filePath = path.resolve(BACKUPS_DIR, backup.filename);
    if (!filePath.startsWith(path.resolve(BACKUPS_DIR))) {
      res.status(400).json({ message: 'Invalid backup path' });
      return;
    }
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'File not found on disk' });
      return;
    }
    res.download(filePath, backup.filename);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: String(req.params.id) } });
    if (!backup) {
      res.status(404).json({ message: 'Backup not found' });
      return;
    }
    const filePath = path.resolve(BACKUPS_DIR, backup.filename);
    if (!filePath.startsWith(path.resolve(BACKUPS_DIR))) {
      res.status(400).json({ message: 'Invalid backup path' });
      return;
    }
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.backup.delete({ where: { id: String(req.params.id) } });
    res.status(200).json({ message: 'Backup deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==========================================
// 3. LOGS
// ==========================================
export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type = 'app', date = new Date().toISOString().split('T')[0] } = req.query;
    let logDir = 'application';
    if (type === 'error') logDir = 'errors';
    if (type === 'security' || type === 'audit') logDir = 'security';
    const filename = `${type}-${date}.log`;
    const logsDir = path.resolve(__dirname, '../../logs', logDir);
    const filePath = path.resolve(logsDir, filename);
    if (!filePath.startsWith(logsDir)) {
      res.status(400).json({ message: 'Invalid log path' });
      return;
    }
    if (!fs.existsSync(filePath)) {
      res.status(200).json({ logs: [] });
      return;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0).reverse().slice(0, 500); 
    res.status(200).json({ logs: lines });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==========================================
// 4. ERRORS
// ==========================================
export const getErrors = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = await prisma.errorLog.findMany({ orderBy: { timestamp: 'desc' }, take: 100 });
    res.status(200).json(errors);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==========================================
// 5. SECURITY & SESSIONS
// ==========================================
export const getSecurityOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const failedLogins = await prisma.loginAttempt.findMany({
      where: { success: false },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const activeSessionsRaw = await prisma.session.findMany({
      where: { isValid: true },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { lastActivityAt: 'desc' },
      take: 50
    });

    const activeSessions = activeSessionsRaw.map(s => {
      const parser = typeof UAParser === 'function' ? new (UAParser as any)(s.userAgent || '') : new (UAParser as any).UAParser(s.userAgent || '');
      const browser = parser.getBrowser();
      const os = parser.getOS();
      return {
        ...s,
        browser: browser.name ? `${browser.name} ${browser.version || ''}` : 'Unknown Browser',
        os: os.name ? `${os.name} ${os.version || ''}` : 'Unknown OS'
      };
    });

    const alerts = await prisma.systemAlert.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ failedLogins, activeSessions, alerts });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resolveAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.systemAlert.update({
      where: { id: String(req.params.id) },
      data: { isResolved: true }
    });
    res.status(200).json({ message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const forceLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    await prisma.session.update({ where: { id: sessionId }, data: { isValid: false } });
    res.status(200).json({ message: 'Session revoked' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const revokeAllSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    await prisma.session.updateMany({ where: { userId }, data: { isValid: false } });
    res.status(200).json({ message: 'All sessions revoked for user' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==========================================
// 6. SETTINGS
// ==========================================
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.systemSetting.findMany();
    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value } = req.body;
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    res.status(200).json(setting);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
