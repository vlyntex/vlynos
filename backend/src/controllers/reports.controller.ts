import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import prisma from '../utils/db';
import { ReportsService } from '../services/reports.service';
import { ExportService } from '../services/export.service';
import fs from 'fs';
import path from 'path';

export const getTasksReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, page, startDate, endDate, status, vendorId, workerId, vendorName, workerName, taskId } = req.query;
    const filters = { startDate, endDate, status, vendorId, workerId, vendorName, workerName, taskId };

    await prisma.reportHistory.create({
      data: {
        userId: req.user!.id,
        reportType: 'TASKS',
        filters: JSON.stringify(filters)
      }
    });

    if (format === 'csv') {
      const job = await ExportService.queueReport(req.user!.id, 'TASKS', filters);
      res.status(202).json({ message: 'CSV export started', jobId: job.id });
      return;
    }

    const p = parseInt(page as string) || 1;
    const result = await ReportsService.getTasksReport(req.user, filters, p, 100);
    res.status(200).json(result);
  } catch (err) {
    logger.error('Get tasks report error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getWorkersReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, page, status, vendorId, vendorName } = req.query;
    const filters = { status, vendorId, vendorName };

    await prisma.reportHistory.create({
      data: {
        userId: req.user!.id,
        reportType: 'WORKERS',
        filters: JSON.stringify(filters)
      }
    });

    if (format === 'csv') {
      const job = await ExportService.queueReport(req.user!.id, 'WORKERS', filters);
      res.status(202).json({ message: 'CSV export started', jobId: job.id });
      return;
    }

    const p = parseInt(page as string) || 1;
    const result = await ReportsService.getWorkersReport(req.user, filters, p, 100);
    res.status(200).json(result);
  } catch (err) {
    logger.error('Get workers report error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getVendorsReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, page, status } = req.query;
    const filters = { status };

    await prisma.reportHistory.create({
      data: {
        userId: req.user!.id,
        reportType: 'VENDORS',
        filters: JSON.stringify(filters)
      }
    });

    if (format === 'csv') {
      const job = await ExportService.queueReport(req.user!.id, 'VENDORS', filters);
      res.status(202).json({ message: 'CSV export started', jobId: job.id });
      return;
    }

    const p = parseInt(page as string) || 1;
    const result = await ReportsService.getVendorsReport(req.user, filters, p, 100);
    res.status(200).json(result);
  } catch (err: any) {
    logger.error('Get vendors report error', err);
    res.status(err.message === 'Forbidden' ? 403 : 500).json({ message: err.message === 'Forbidden' ? 'Forbidden' : 'Internal server error' });
  }
};

export const downloadReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = req.params.id as string;

    const job = await prisma.reportJob.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ message: 'Report job not found' });
      return;
    }

    if (job.userId !== req.user!.id && req.user!.role !== 'MANAGEMENT') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    if (job.status !== 'COMPLETED' || !job.fileUrl) {
      res.status(400).json({ message: 'Report is not ready or has expired' });
      return;
    }

    const reportsDir = path.resolve(__dirname, '../../uploads/reports');
    const filePath = path.resolve(reportsDir, job.fileUrl);

    if (!filePath.startsWith(reportsDir)) {
      res.status(400).json({ message: 'Invalid file path' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'File not found on disk' });
      return;
    }

    // Increment download counter
    await prisma.reportJob.update({
      where: { id: jobId },
      data: { 
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date()
      }
    });

    res.download(filePath, job.fileUrl, (err) => {
      if (err) {
        logger.error('File download error', err);
      }
    });
  } catch (err) {
    logger.error('Download report error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
