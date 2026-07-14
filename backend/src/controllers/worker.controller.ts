import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { generateEmployeeId, generateEmployeeIds, generateRandomPassword } from '../utils/generators';
import { NotificationService } from '../services/notification.service';
import { ActivityService } from '../services/activity.service';
import { onlineUsers } from '../sockets/chat.socket';

export const createWorker = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, vendorId } = req.body;

    let finalVendorId = vendorId;
    if (req.user!.role === 'VENDOR') {
      const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
      finalVendorId = u?.vendorId;
    }

    if (!firstName || !lastName || !email || !finalVendorId) {
      res.status(400).json({ message: 'Missing required fields', requestId: req.id });
      return;
    }

    if (!email.endsWith('@dev.vlyntech.com')) {
      res.status(400).json({ message: 'Email must belong to @dev.vlyntech.com domain', requestId: req.id });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ message: 'Email already in use', requestId: req.id });
      return;
    }

    const employeeId = await generateEmployeeId();
    const tempPassword = generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    const worker = await prisma.user.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        passwordHash,
        role: 'WORKER',
        mustChangePassword: true,
        vendorId: finalVendorId
      },
      select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, vendorId: true }
    });

    logger.audit('WORKER_CREATED', req, { targetUserId: worker.id, employeeId: worker.employeeId });
    
    await ActivityService.create({ actorUserId: req.user!.id, action: 'WORKER_CREATED', entityType: 'USER', entityId: worker.id });
    await NotificationService.create({
      recipientUserId: worker.id,
      title: 'Welcome to VlynTech',
      message: 'Your account has been created.',
      type: 'SYSTEM',
      relatedEntityType: 'USER',
      relatedEntityId: worker.id
    });
    
    res.status(201).json({
      message: 'Worker created successfully',
      worker,
      tempPassword,
      requestId: req.id
    });
  } catch (error) {
    logger.error('Create worker error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const bulkCreateWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workers } = req.body; // Array of { firstName, lastName, email, vendorId? }

    if (!Array.isArray(workers) || workers.length === 0) {
      res.status(400).json({ message: 'Invalid or empty workers array', requestId: req.id });
      return;
    }

    let finalVendorId: string | undefined;
    if (req.user!.role === 'VENDOR') {
      const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
      finalVendorId = u?.vendorId || undefined;
    }

    const results = [];
    const errors = [];

    // Filter out invalid workers first
    const validWorkers = [];
    for (let i = 0; i < workers.length; i++) {
      const w = workers[i];
      const vendorId = finalVendorId || w.vendorId;

      if (!w.firstName || !w.lastName || !w.email || !vendorId) {
        errors.push({ index: i, email: w.email, message: 'Missing required fields' });
        continue;
      }

      if (!w.email.endsWith('@dev.vlyntech.com')) {
        errors.push({ index: i, email: w.email, message: 'Email must belong to @dev.vlyntech.com domain' });
        continue;
      }
      
      validWorkers.push({ ...w, originalIndex: i, vendorId });
    }

    if (validWorkers.length > 0) {
      // Check for existing emails in bulk
      const validEmails = validWorkers.map(w => w.email);
      const existingUsers = await prisma.user.findMany({
        where: { email: { in: validEmails } },
        select: { email: true }
      });
      const existingEmails = new Set(existingUsers.map(u => u.email));

      const workersToInsert = validWorkers.filter(w => {
        if (existingEmails.has(w.email)) {
          errors.push({ index: w.originalIndex, email: w.email, message: 'Email already in use' });
          return false;
        }
        return true;
      });

      if (workersToInsert.length > 0) {
        // Generate sequential employee IDs efficiently
        const employeeIds = await generateEmployeeIds(workersToInsert.length);
        
        // Prepare passwords and hashes in parallel
        const passwordMap = new Map<string, string>(); // email -> tempPassword
        const workersData = await Promise.all(workersToInsert.map(async (w, idx) => {
          const tempPassword = generateRandomPassword();
          passwordMap.set(w.email, tempPassword);
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(tempPassword, salt);
          
          return {
            employeeId: employeeIds[idx],
            firstName: w.firstName,
            lastName: w.lastName,
            email: w.email,
            passwordHash,
            role: 'WORKER' as any,
            mustChangePassword: true,
            vendorId: w.vendorId
          };
        }));

        try {
          // Perform bulk insert
          const createdUsers = await prisma.user.createManyAndReturn({
            data: workersData,
            skipDuplicates: true,
            select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, vendorId: true }
          });
          
          for (const worker of createdUsers) {
            results.push({
              worker,
              tempPassword: passwordMap.get(worker.email)
            });
          }
        } catch (err: any) {
          logger.error('Error during bulk createManyAndReturn', err, req.id);
          throw err;
        }
      }
    }

    logger.audit('WORKERS_BULK_CREATED', req, { successCount: results.length, errorCount: errors.length });
    
    res.status(201).json({
      message: `Successfully created ${results.length} workers. ${errors.length} failed.`,
      results,
      errors,
      requestId: req.id
    });
  } catch (error) {
    logger.error('Bulk create workers error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const listWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    let whereClause: any = { role: 'WORKER', accountStatus: { not: 'INACTIVE' } };

    // Vendor can only see their own workers
    if (req.user!.role === 'VENDOR') {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      whereClause.vendorId = user?.vendorId;
    }

    if (search) {
      const s = String(search);
      whereClause.OR = [
        { employeeId: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { vendor: { name: { contains: s, mode: 'insensitive' } } },
        { vendor: { code: { contains: s, mode: 'insensitive' } } }
      ];
    }

    const workers = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, accountStatus: true, vendor: { select: { name: true, code: true } } }
    });

    const workersWithOnlineStatus = workers.map(w => ({
      ...w,
      isOnline: onlineUsers.has(w.id)
    }));

    res.status(200).json({ workers: workersWithOnlineStatus, requestId: req.id });
  } catch (error) {
    logger.error('List workers error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const getWorker = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const worker = await prisma.user.findUnique({
      where: { id: id as string },
      select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, role: true, accountStatus: true, vendorId: true, vendor: { select: { name: true } } }
    });

    if (!worker) {
      res.status(404).json({ message: 'Worker not found', requestId: req.id });
      return;
    }

    if (req.user!.role === 'WORKER' && req.user!.id !== worker.id) {
      res.status(403).json({ message: 'Forbidden', requestId: req.id });
      return;
    }

    if (req.user!.role === 'VENDOR') {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (worker.vendorId !== user?.vendorId) {
        res.status(403).json({ message: 'Forbidden', requestId: req.id });
        return;
      }
    }

    res.status(200).json({ worker, requestId: req.id });
  } catch (error) {
    logger.error('Get worker error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

  export const updateWorker = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id) as string;
      const { firstName, lastName, vendorId } = req.body;
  
      // Fetch worker first
      const existingWorker = await prisma.user.findUnique({ where: { id: id as string } });
      if (!existingWorker) {
        res.status(404).json({ message: 'Worker not found', requestId: req.id });
        return;
      }
  
      if (req.user!.role === 'VENDOR') {
        const vendorUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
        if (existingWorker.vendorId !== vendorUser?.vendorId) {
          res.status(403).json({ message: 'Forbidden', requestId: req.id });
          return;
        }
      }
  
      // VENDOR cannot change vendorId
      const newVendorId = req.user!.role === 'MANAGEMENT' ? vendorId : existingWorker.vendorId;
  
      const worker = await prisma.user.update({
        where: { id: id as string },
        data: { firstName, lastName, vendorId: newVendorId },
        select: { id: true, employeeId: true, firstName: true, lastName: true, vendorId: true }
      });

    logger.audit('WORKER_UPDATED', req, { targetUserId: worker.id, employeeId: worker.employeeId });
    res.status(200).json({ message: 'Worker updated', worker, requestId: req.id });
  } catch (error) {
    logger.error('Update worker error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const disableWorker = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      res.status(400).json({ message: 'Invalid status', requestId: req.id });
      return;
    }

    const existingWorker = await prisma.user.findUnique({ where: { id: id as string } });
    if (!existingWorker) {
      res.status(404).json({ message: 'Worker not found', requestId: req.id });
      return;
    }

    if (req.user!.role === 'VENDOR') {
      const vendorUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (existingWorker.vendorId !== vendorUser?.vendorId) {
        res.status(403).json({ message: 'Forbidden', requestId: req.id });
        return;
      }
    }

    await prisma.user.update({
      where: { id: id as string },
      data: { accountStatus: status }
    });

    logger.audit('WORKER_STATUS_CHANGED', req, { targetUserId: id, newStatus: status });
    res.status(200).json({ message: `Worker marked as ${status}`, requestId: req.id });
  } catch (error) {
    logger.error('Disable worker error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    
    const tempPassword = generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await prisma.user.update({
      where: { id: id as string },
      data: { passwordHash, mustChangePassword: true }
    });

    logger.audit('PASSWORD_RESET', req, { targetUserId: id });
    res.status(200).json({ message: 'Password reset successfully', tempPassword, requestId: req.id });
  } catch (error) {
    logger.error('Reset password error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const deleteWorker = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;

    const existingWorker = await prisma.user.findUnique({ where: { id: id as string } });
    if (!existingWorker) {
      res.status(404).json({ message: 'Worker not found', requestId: req.id });
      return;
    }

    if (req.user!.role === 'VENDOR') {
      const vendorUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (existingWorker.vendorId !== vendorUser?.vendorId) {
        res.status(403).json({ message: 'Forbidden', requestId: req.id });
        return;
      }
    }

    // Soft delete: deactivate rather than hard-delete, since workers with any
    // task/activity history can't be removed from the database without breaking
    // that history (Postgres blocks it via foreign key constraints anyway).
    await prisma.user.update({
      where: { id: id as string },
      data: { accountStatus: 'INACTIVE' }
    });

    logger.audit('WORKER_DEACTIVATED', req, { targetUserId: id });
    res.status(200).json({ message: 'Worker deactivated successfully', requestId: req.id });
  } catch (error) {
    logger.error('Delete worker error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};
