import { Router } from 'express';
import { listActivity } from '../controllers/activity.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', listActivity);
export default router;
