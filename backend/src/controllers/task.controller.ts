import { Request, Response } from 'express';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { NotificationService } from '../services/notification.service';
import { ActivityService } from '../services/activity.service';

const createHistory = async (taskId: string, action: string, performedById: string, details?: any) => {
  await prisma.taskHistory.create({
    data: {
      taskId,
      action,
      performedById,
      details: details ? JSON.stringify(details) : null
    }
  });
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId, taskName, startedAt, expectedEndDate } = req.body;
    
    if (!taskId || !taskName || !startedAt) {
      res.status(400).json({ message: 'Missing required fields', requestId: req.id });
      return;
    }

    const existingTask = await prisma.task.findUnique({ where: { taskId } });
    if (existingTask) {
      res.status(409).json({ message: 'Task ID already exists', requestId: req.id });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.vendorId) {
      res.status(403).json({ message: 'User must belong to a vendor to create tasks', requestId: req.id });
      return;
    }

    const lockedAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now
    
    // Default expected end date to 24 hours from startedAt if not provided
    const parsedStartedAt = new Date(startedAt);
    const parsedExpectedEndDate = expectedEndDate ? new Date(expectedEndDate) : new Date(parsedStartedAt.getTime() + 24 * 60 * 60 * 1000);

    const task = await prisma.task.create({
      data: {
        taskId,
        taskName,
        workerId: user.id,
        vendorId: user.vendorId,
        lockedAt,
        status: 'IN_PROGRESS',
        startedAt: parsedStartedAt,
        expectedEndDate: parsedExpectedEndDate
      }
    });

    await createHistory(task.id, 'CREATED', user.id);
    logger.audit('TASK_CREATED', req, { taskId: task.taskId });

    await ActivityService.create({ actorUserId: user.id, action: 'TASK_SUBMITTED', entityType: 'TASK', entityId: task.id });
    const mgmtUsers = await prisma.user.findMany({ where: { role: 'MANAGEMENT', accountStatus: 'ACTIVE' } });
    for (const m of mgmtUsers) {
      await NotificationService.create({
        recipientUserId: m.id,
        title: 'Task Submitted',
        message: `Task ${task.taskId} submitted by ${user.firstName} ${user.lastName}`,
        type: 'TASK_CREATED',
        relatedEntityType: 'TASK',
        relatedEntityId: task.id
      });
    }

    res.status(201).json({ message: 'Task created', task, requestId: req.id });
  } catch (error) {
    logger.error('Create task error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const editTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const { taskId, taskName } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ message: 'Task not found', requestId: req.id });
      return;
    }

    if (task.isLocked || Date.now() >= task.lockedAt.getTime()) {
      res.status(403).json({ message: 'Task is locked and cannot be edited', requestId: req.id });
      return;
    }

    if (task.workerId !== req.user!.id) {
      res.status(403).json({ message: 'Forbidden: You can only edit your own tasks', requestId: req.id });
      return;
    }

    if (taskId && taskId !== task.taskId) {
      const existing = await prisma.task.findUnique({ where: { taskId } });
      if (existing) {
        res.status(409).json({ message: 'Task ID already exists', requestId: req.id });
        return;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { taskId, taskName }
    });

    await createHistory(task.id, 'EDITED', req.user!.id, { oldTaskId: task.taskId, newTaskId: taskId });
    logger.audit('TASK_EDITED', req, { taskId: updatedTask.taskId });

    res.status(200).json({ message: 'Task updated', task: updatedTask, requestId: req.id });
  } catch (error) {
    logger.error('Edit task error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const submitTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const { endedAt } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ message: 'Task not found', requestId: req.id });
      return;
    }

    if (task.workerId !== req.user!.id) {
      res.status(403).json({ message: 'Forbidden: You can only submit your own tasks', requestId: req.id });
      return;
    }

    if (task.status !== 'IN_PROGRESS') {
      res.status(400).json({ message: `Task is not in progress (current status: ${task.status})`, requestId: req.id });
      return;
    }

    const end = endedAt ? new Date(endedAt) : new Date();
    const start = task.startedAt;
    
    // Calculate time spent in minutes
    const timeSpentMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'IN_REVIEW',
        endedAt: end,
        timeSpentMinutes,
        submittedAt: new Date()
      }
    });

    await createHistory(task.id, 'SUBMITTED', req.user!.id);
    logger.audit('TASK_SUBMITTED', req, { taskId: updatedTask.taskId, timeSpentMinutes });

    res.status(200).json({ message: 'Task submitted', task: updatedTask, requestId: req.id });
  } catch (error) {
    logger.error('Submit task error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ message: 'Task not found', requestId: req.id });
      return;
    }

    if (task.isLocked || Date.now() >= task.lockedAt.getTime()) {
      res.status(403).json({ message: 'Task is locked and cannot be deleted', requestId: req.id });
      return;
    }

    if (task.workerId !== req.user!.id) {
      res.status(403).json({ message: 'Forbidden', requestId: req.id });
      return;
    }

    await prisma.taskHistory.create({
      data: { taskId: task.id, action: 'DELETED', performedById: req.user!.id }
    });

    await prisma.task.delete({ where: { id } });
    logger.audit('TASK_DELETED', req, { taskId: task.taskId });

    res.status(200).json({ message: 'Task deleted', requestId: req.id });
  } catch (error) {
    logger.error('Delete task error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const listTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, isLocked } = req.query;
    let whereClause: any = {};
    const userRole = req.user!.role;

    if (userRole === 'WORKER') {
      whereClause.workerId = req.user!.id;
    } else if (userRole === 'VENDOR') {
      const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
      whereClause.vendorId = u?.vendorId;
    }

    if (status) {
      whereClause.status = status;
    }
    if (isLocked !== undefined && isLocked !== '') {
      whereClause.isLocked = isLocked === 'true';
    }

    if (search) {
      const s = String(search);
      whereClause.OR = [
        { taskId: { contains: s, mode: 'insensitive' } },
        { taskName: { contains: s, mode: 'insensitive' } }
      ];

      if (userRole === 'MANAGEMENT') {
        whereClause.OR.push(
          { worker: { firstName: { contains: s, mode: 'insensitive' } } },
          { worker: { lastName: { contains: s, mode: 'insensitive' } } },
          { worker: { employeeId: { contains: s, mode: 'insensitive' } } },
          { vendor: { name: { contains: s, mode: 'insensitive' } } }
        );
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        worker: { select: { firstName: true, lastName: true, employeeId: true } },
        vendor: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ tasks, requestId: req.id });
  } catch (error) {
    logger.error('List tasks error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const getTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        worker: { select: { firstName: true, lastName: true, employeeId: true } },
        vendor: { select: { name: true } },
        history: { 
          include: { performedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!task) {
      res.status(404).json({ message: 'Task not found', requestId: req.id });
      return;
    }

    const userRole = req.user!.role;
    if (userRole === 'WORKER' && task.workerId !== req.user!.id) {
      res.status(403).json({ message: 'Forbidden', requestId: req.id });
      return;
    }
    if (userRole === 'VENDOR') {
      const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (task.vendorId !== u?.vendorId) {
        res.status(403).json({ message: 'Forbidden', requestId: req.id });
        return;
      }
    }

    res.status(200).json({ task, requestId: req.id });
  } catch (error) {
    logger.error('Get task error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const acceptTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const { managementComment } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ message: 'Task not found', requestId: req.id });
      return;
    }

    if (!task.isLocked && Date.now() < task.lockedAt.getTime()) {
      res.status(403).json({ message: 'Task is not locked yet', requestId: req.id });
      return;
    }

    if (task.status !== 'IN_REVIEW') {
      res.status(400).json({ message: `Task cannot be accepted from status ${task.status}`, requestId: req.id });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: 'APPROVED', acceptedAt: new Date(), approvedById: req.user!.id, managementComment }
    });

    await createHistory(task.id, 'APPROVED', req.user!.id, { comment: managementComment });
    logger.audit('TASK_APPROVED', req, { taskId: task.taskId });

    await ActivityService.create({ actorUserId: req.user!.id, action: 'TASK_APPROVED', entityType: 'TASK', entityId: task.id });
    await NotificationService.create({
      recipientUserId: task.workerId,
      title: 'Task Accepted',
      message: `Your task ${task.taskId} was accepted.`,
      type: 'TASK_ACCEPTED',
      relatedEntityType: 'TASK',
      relatedEntityId: task.id
    });

    res.status(200).json({ message: 'Task accepted', task: updatedTask, requestId: req.id });
  } catch (error) {
    logger.error('Accept task error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};

export const rejectTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const { rejectionReason, managementComment } = req.body;

    if (!rejectionReason) {
      res.status(400).json({ message: 'Rejection reason is required', requestId: req.id });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ message: 'Task not found', requestId: req.id });
      return;
    }

    if (!task.isLocked && Date.now() < task.lockedAt.getTime()) {
      res.status(403).json({ message: 'Task is not locked yet', requestId: req.id });
      return;
    }

    if (task.status !== 'IN_REVIEW') {
      res.status(400).json({ message: `Task cannot be rejected from status ${task.status}`, requestId: req.id });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: 'REJECTED', rejectedAt: new Date(), approvedById: req.user!.id, rejectionReason, managementComment }
    });

    await createHistory(task.id, 'REJECTED', req.user!.id, { reason: rejectionReason, comment: managementComment });
    logger.audit('TASK_REJECTED', req, { taskId: task.taskId });

    await ActivityService.create({ actorUserId: req.user!.id, action: 'TASK_REJECTED', entityType: 'TASK', entityId: task.id });
    await NotificationService.create({
      recipientUserId: task.workerId,
      title: 'Task Rejected',
      message: `Your task ${task.taskId} was rejected. Reason: ${rejectionReason}`,
      type: 'TASK_REJECTED',
      relatedEntityType: 'TASK',
      relatedEntityId: task.id
    });

    res.status(200).json({ message: 'Task rejected', task: updatedTask, requestId: req.id });
  } catch (error) {
    logger.error('Reject task error', error, req.id);
    res.status(500).json({ message: 'Internal server error', requestId: req.id });
  }
};
