import { Router } from 'express';
import { createVendor, listVendors, getVendor, updateVendor, deleteVendor, disableVendor, regenerateKey, getMyVendorProfile } from '../controllers/vendor.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Vendor Only
router.get('/me', requireRole(['VENDOR']), getMyVendorProfile);

// Management Only
router.use(requireRole(['MANAGEMENT']));
router.post('/', createVendor);
router.get('/', listVendors);
router.get('/:id', getVendor);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);
router.patch('/:id/status', disableVendor);
router.patch('/:id/key', regenerateKey);

export default router;
