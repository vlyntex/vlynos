import { Router } from 'express';
import { listNotifications, getUnreadCount, markRead, markAllRead, subscribePush } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.post('/push/subscribe', subscribePush);

export default router;
