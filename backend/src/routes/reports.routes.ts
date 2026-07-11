import { Router } from 'express';
import { getTasksReport, getWorkersReport, getVendorsReport, downloadReport } from '../controllers/reports.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/tasks', authenticate, getTasksReport);
router.get('/workers', authenticate, getWorkersReport);
router.get('/vendors', authenticate, getVendorsReport);
router.get('/downloads/:id', authenticate, downloadReport);

export default router;
