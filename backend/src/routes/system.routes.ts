import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { 
  getHealth, getBackups, createBackup, downloadBackup, deleteBackup, restoreBackup,
  getLogs, getErrors, getSecurityOverview, forceLogout, revokeAllSessions, resolveAlert,
  getSettings, updateSetting 
} from '../controllers/system.controller';
import { Request, Response, NextFunction } from 'express';

const router = Router();

const requireManagement = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'MANAGEMENT') {
    res.status(403).json({ message: 'Forbidden: Management access required' });
    return;
  }
  next();
};

router.use(authenticate, requireManagement);

router.get('/health', getHealth);

router.get('/backups', getBackups);
router.post('/backups', createBackup);
router.get('/backups/:id/download', downloadBackup);
router.post('/backups/:id/restore', restoreBackup);
router.delete('/backups/:id', deleteBackup);

router.get('/logs', getLogs);
router.get('/errors', getErrors);

router.get('/security', getSecurityOverview);
router.post('/security/logout', forceLogout);
router.post('/security/revoke-all', revokeAllSessions);
router.post('/security/alerts/:id/resolve', resolveAlert);

router.get('/settings', getSettings);
router.post('/settings', updateSetting);

export default router;
