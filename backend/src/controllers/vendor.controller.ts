import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { generateVendorCode, generateVendorKey, generateRandomPassword, generateEmployeeId } from '../utils/generators';
import { NotificationService } from '../services/notification.service';
import { ActivityService } from '../services/activity.service';

export const createVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, firstName, lastName } = req.body;

    if (!name || !email || !firstName || !lastName) {
      res.status(400).json({ message: 'Missing required fields', requestId: req.id });
      return;
    }

    if (!/^[a-zA-Z0-9._%+-]+@dev\.vlyntech\.com$/.test(email)) {
      res.status(400).json({ message: 'Email must belong to @dev.vlyntech.com domain', requestId: req.id });
      return;
    }

    const existingVendor = await prisma.vendor.findUnique({ where: { email } });
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingVendor || existingUser) {
      res.status(409).json({ message: 'Email already in use', requestId: req.id });
      return;
    }

    const code = `VLYN-${Math.floor(1000 + Math.random() * 9000)}`;
    const tempPassword = generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);
    const employeeId = await generateEmployeeId();

    const vendor = await prisma.$transaction(async (tx) => {
      const newVendor = await tx.vendor.create({
        data: {
          name,
          email,
          code: code,
          key: code,
          status: 'ACTIVE'
        }
      });

      await tx.user.create({
        data: {
          employeeId,
          firstName,
          lastName,
          email,
          passwordHash,
          role: 'VENDOR',
          mustChangePassword: true,
          vendorId: newVendor.id
        }
      });

      return newVendor;
    });

    logger.audit('VENDOR_CREATED', req, { vendorId: vendor.id, vendorCode: vendor.code });
    
    const vendorUser = await prisma.user.findFirst({ where: { vendorId: vendor.id, role: 'VENDOR' } });
    if (vendorUser) {
      await ActivityService.create({ actorUserId: req.user!.id, action: 'VENDOR_CREATED', entityType: 'VENDOR', entityId: vendor.id });
      await NotificationService.create({
        recipientUserId: vendorUser.id,
        title: 'Welcome to VlynTech',
        message: 'Your vendor account has been created.',
        type: 'SYSTEM',
        relatedEntityType: 'VENDOR',
        relatedEntityId: vendor.id
      });
    }
    
    res.status(201).json({
      message: 'Vendor created successfully',
      vendor,
      tempPassword,
      requestId: req.id
    });
  } catch (error) {
    logger.error('Create vendor error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const listVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    let whereClause = {};

    if (search) {
      const s = String(search);
      whereClause = {
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { code: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } }
        ]
      };
    }

    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      select: { id: true, name: true, code: true, email: true, status: true, createdAt: true }
    });

    res.status(200).json({ vendors, requestId: req.id });
  } catch (error) {
    logger.error('List vendors error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const getVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const vendor = await prisma.vendor.findUnique({
      where: { id: id as string },
      select: { id: true, name: true, code: true, email: true, status: true, createdAt: true, updatedAt: true }
    });

    if (!vendor) {
      res.status(404).json({ message: 'Vendor not found', requestId: req.id });
      return;
    }

    res.status(200).json({ vendor, requestId: req.id });
  } catch (error) {
    logger.error('Get vendor error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const updateVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const { name, email } = req.body;

    if (email && !email.endsWith('@dev.vlyntech.com')) {
      res.status(400).json({ message: 'Email must belong to @dev.vlyntech.com domain', requestId: req.id });
      return;
    }

    const vendor = await prisma.vendor.update({
      where: { id: id as string },
      data: { name, email },
      select: { id: true, name: true, code: true, email: true, status: true }
    });

    logger.audit('VENDOR_UPDATED', req, { vendorId: vendor.id, vendorCode: vendor.code });
    res.status(200).json({ message: 'Vendor updated', vendor, requestId: req.id });
  } catch (error) {
    logger.error('Update vendor error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const disableVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      res.status(400).json({ message: 'Invalid status', requestId: req.id });
      return;
    }

    await prisma.vendor.update({
      where: { id: id as string },
      data: { status }
    });

    logger.audit('VENDOR_STATUS_CHANGED', req, { targetVendorId: id, newStatus: status });
    res.status(200).json({ message: `Vendor marked as ${status}`, requestId: req.id });
  } catch (error) {
    logger.error('Disable vendor error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const regenerateKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const { note } = req.body;
    const newKey = generateVendorKey();
    
    await prisma.vendor.update({
      where: { id: id as string },
      data: { key: newKey }
    });

    logger.audit('VENDOR_KEY_REGENERATED', req, { targetVendorId: id, note });
    res.status(200).json({ message: 'Vendor key regenerated', requestId: req.id });
  } catch (error) {
    logger.error('Regenerate key error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const getMyVendorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { vendor: true }
    });

    if (!user || !user.vendorId || !user.vendor) {
      res.status(404).json({ message: 'Vendor profile not found', requestId: req.id });
      return;
    }

    const { key, ...vendorSafe } = user.vendor;
    res.status(200).json({ vendor: vendorSafe, requestId: req.id });
  } catch (error) {
    logger.error('Get my vendor profile error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const deleteVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;

    // Delete associated users first
    await prisma.user.deleteMany({
      where: { vendorId: id as string }
    });

    await prisma.vendor.delete({
      where: { id: id as string }
    });

    logger.audit('VENDOR_DELETED', req, { targetVendorId: id });
    res.status(200).json({ message: 'Vendor deleted successfully', requestId: req.id });
  } catch (error) {
    logger.error('Delete vendor error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};
