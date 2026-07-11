import { Router } from 'express';
import { listChats, getMessages, createDirectMessage, createGroup, archiveGroup, searchUsers, sendMessage, addGroupMembers, markAsRead } from '../controllers/chat.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);


router.get('/', listChats);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/read', markAsRead);
router.post('/direct', createDirectMessage);
router.post('/group', requireRole(['MANAGEMENT', 'VENDOR']), createGroup);
router.post('/group/:id/members', addGroupMembers);
router.patch('/group/:id/archive', requireRole(['MANAGEMENT', 'VENDOR']), archiveGroup);
router.get('/users', searchUsers);

export default router;
