import { Router } from 'express';
import { createTask, editTask, deleteTask, listTasks, getTask, acceptTask, rejectTask, submitTask } from '../controllers/task.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Accessible by all authenticated (roles filter inside listTasks/getTask)
router.get('/', listTasks);
router.get('/:id', getTask);

// Worker only
router.post('/', requireRole(['WORKER']), createTask);
router.put('/:id', requireRole(['WORKER']), editTask);
router.delete('/:id', requireRole(['WORKER']), deleteTask);
router.patch('/:id/submit', requireRole(['WORKER']), submitTask);

// Management only
router.patch('/:id/accept', requireRole(['MANAGEMENT']), acceptTask);
router.patch('/:id/reject', requireRole(['MANAGEMENT']), rejectTask);

export default router;
