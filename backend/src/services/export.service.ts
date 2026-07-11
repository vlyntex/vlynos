import fs from 'fs';
import path from 'path';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { NotificationService } from './notification.service';
import { ReportsService } from './reports.service';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const ExportService = {
  queueReport: async (userId: string, reportType: any, filters: any) => {
    const job = await prisma.reportJob.create({
      data: {
        userId,
        reportType,
        filters: JSON.stringify(filters),
        status: 'QUEUED'
      }
    });

    setImmediate(() => ExportService.processJob(job.id));
    return job;
  },

  processJob: async (jobId: string) => {
    try {
      await prisma.reportJob.update({ where: { id: jobId }, data: { status: 'PROCESSING' } });
      const job = await prisma.reportJob.findUnique({ where: { id: jobId }, include: { user: true } });
      if (!job) return;

      const filters = JSON.parse(job.filters);
      let csvString = '';
      let dataCsv = '';

      if (job.reportType === 'TASKS') {
        const result = await ReportsService.getTasksReport(job.user, filters, 1, 0); 
        dataCsv = ExportService.jsonToCsv(result.data);
      } else if (job.reportType === 'WORKERS') {
        const result = await ReportsService.getWorkersReport(job.user, filters, 1, 0);
        dataCsv = ExportService.jsonToCsv(result.data);
      } else if (job.reportType === 'VENDORS') {
        const result = await ReportsService.getVendorsReport(job.user, filters, 1, 0);
        dataCsv = ExportService.jsonToCsv(result.data);
      }

      csvString = dataCsv;

      const fileName = `${job.reportType.toLowerCase()}_${uuidv4()}.csv`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      
      fs.writeFileSync(filePath, csvString, 'utf-8');

      await prisma.reportJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', fileUrl: fileName, completedAt: new Date() }
      });

      await NotificationService.create({
        recipientUserId: job.userId,
        title: 'Report Ready',
        message: `Your ${job.reportType.toLowerCase()} report is ready for download.`,
        type: 'SYSTEM',
        relatedEntityType: 'REPORT',
        relatedEntityId: job.id
      });

    } catch (err: any) {
      logger.error('Export job error', err);
      await prisma.reportJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: err.message, completedAt: new Date() }
      });
      const job = await prisma.reportJob.findUnique({ where: { id: jobId } });
      if (job) {
        await NotificationService.create({
          recipientUserId: job.userId,
          title: 'Report Failed',
          message: `Your ${job.reportType.toLowerCase()} report failed to generate.`,
          type: 'SYSTEM'
        });
      }
    }
  },

  jsonToCsv: (data: any[]) => {
    if (!data || data.length === 0) return 'No records found';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    csvRows.push(headers.map(h => `"${h}"`).join(','));
    
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }
};
