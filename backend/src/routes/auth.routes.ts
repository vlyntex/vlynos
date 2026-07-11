import { Router } from 'express';
import { login, logout, getMe, changePassword, updateNotificationSettings } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

import { generateCsrfToken } from '../middlewares/csrf.middleware';

const router = Router();

router.get('/csrf', generateCsrfToken);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/settings/notifications', authenticate, updateNotificationSettings);
router.post('/change-password', authenticate, changePassword);

export default router;
