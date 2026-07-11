import { Router } from 'express';
import { listDocuments, createDocument, updateDocument, deleteDocument } from '../controllers/handbook.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/handbook/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const router = Router();

router.use(authenticate);

// Everyone can view documents
router.get('/', listDocuments);

// Only management can add/edit/delete
router.post('/', requireRole(['MANAGEMENT']), upload.single('file'), createDocument);
router.put('/:id', requireRole(['MANAGEMENT']), upload.single('file'), updateDocument);
router.delete('/:id', requireRole(['MANAGEMENT']), deleteDocument);

export default router;
