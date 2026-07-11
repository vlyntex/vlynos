import { Router } from 'express';
import { createWorker, bulkCreateWorkers, listWorkers, getWorker, updateWorker, deleteWorker, disableWorker, resetPassword } from '../controllers/worker.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Management & Vendor can list and get
router.get('/', requireRole(['MANAGEMENT', 'VENDOR']), listWorkers);
router.get('/:id', getWorker); // Auth handles Worker own profile check

// Management and Vendor
router.post('/bulk', requireRole(['MANAGEMENT', 'VENDOR']), bulkCreateWorkers);
router.post('/', requireRole(['MANAGEMENT', 'VENDOR']), createWorker);
router.put('/:id', requireRole(['MANAGEMENT', 'VENDOR']), updateWorker);
router.delete('/:id', requireRole(['MANAGEMENT', 'VENDOR']), deleteWorker);
router.patch('/:id/status', requireRole(['MANAGEMENT', 'VENDOR']), disableWorker);
router.patch('/:id/password', requireRole(['MANAGEMENT']), resetPassword);

export default router;
