import prisma from '../utils/db';

export const ReportsService = {
  getTasksReport: async (user: any, filters: any, page: number = 1, limit: number = 100) => {
    let where: any = {};
    
    if (user.role === 'VENDOR') {
      where.vendorId = user.vendorId;
    } else if (filters.vendorName) {
      where.vendor = { name: { contains: filters.vendorName, mode: 'insensitive' } };
    }

    if (filters.workerName) {
      where.worker = {
        OR: [
          { firstName: { contains: filters.workerName, mode: 'insensitive' } },
          { lastName: { contains: filters.workerName, mode: 'insensitive' } }
        ]
      };
    }
    if (filters.status) where.status = filters.status;
    if (filters.taskId) where.taskId = { contains: filters.taskId, mode: 'insensitive' };
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const total = await prisma.task.count({ where });
    const pending = await prisma.task.count({ where: { ...where, status: 'IN_REVIEW' } });
    const accepted = await prisma.task.count({ where: { ...where, status: 'APPROVED' } });
    const rejected = await prisma.task.count({ where: { ...where, status: 'REJECTED' } });

    const tasks = await prisma.task.findMany({
      where,
      include: {
        worker: { select: { firstName: true, lastName: true, employeeId: true } },
        vendor: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: limit > 0 ? (page - 1) * limit : 0,
      take: limit > 0 ? limit : undefined
    });

    return {
      summary: { totalTasks: total, pending, accepted, rejected },
      data: tasks.map(t => ({
        id: t.id,
        taskId: t.taskId,
        taskName: t.taskName,
        status: t.status,
        partnerName: t.vendor?.name,
        developerName: `${t.worker?.firstName} ${t.worker?.lastName}`,
        submittedAt: t.submittedAt,
        acceptedAt: t.acceptedAt,
        rejectedAt: t.rejectedAt,
        rejectionReason: t.rejectionReason,
        createdAt: t.createdAt
      }))
    };
  },

  getWorkersReport: async (user: any, filters: any, page: number = 1, limit: number = 100) => {
    let where: any = { role: 'WORKER' };
    
    if (user.role === 'VENDOR') {
      where.vendorId = user.vendorId;
    } else if (filters.vendorName) {
      where.vendor = { name: { contains: filters.vendorName, mode: 'insensitive' } };
    }

    if (filters.status) where.accountStatus = filters.status;

    const total = await prisma.user.count({ where });

    const workers = await prisma.user.findMany({
      where,
      include: { vendor: { select: { name: true } }, tasks: true },
      orderBy: { createdAt: 'desc' },
      skip: limit > 0 ? (page - 1) * limit : 0,
      take: limit > 0 ? limit : undefined
    });

    const data = workers.map(w => {
      const totalTasks = w.tasks.length;
      const pending = w.tasks.filter(t => t.status === 'IN_REVIEW').length;
      const accepted = w.tasks.filter(t => t.status === 'APPROVED').length;
      const rejected = w.tasks.filter(t => t.status === 'REJECTED').length;
      const rate = (totalTasks > 0 ? ((accepted / totalTasks) * 100).toFixed(2) : '0.00');

      return {
        developerName: `${w.firstName} ${w.lastName}`,
        partnerName: w.vendor?.name || 'N/A',
        accountStatus: w.accountStatus,
        totalTasks,
        pending,
        accepted,
        rejected,
        acceptanceRate: rate + '%'
      };
    });

    return {
      summary: { totalWorkers: total },
      data
    };
  },

  getVendorsReport: async (user: any, filters: any, page: number = 1, limit: number = 100) => {
    if (user.role !== 'MANAGEMENT') throw new Error('Forbidden');

    let where: any = {};
    if (filters.status) where.status = filters.status;

    const total = await prisma.vendor.count({ where });

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        users: { where: { role: 'WORKER' } },
        tasks: true
      },
      orderBy: { createdAt: 'desc' },
      skip: limit > 0 ? (page - 1) * limit : 0,
      take: limit > 0 ? limit : undefined
    });

    const data = vendors.map(v => {
      const activeWorkers = v.users.filter(u => u.accountStatus === 'ACTIVE').length;
      const totalTasks = v.tasks.length;
      const pending = v.tasks.filter(t => t.status === 'IN_REVIEW').length;
      const accepted = v.tasks.filter(t => t.status === 'APPROVED').length;
      const rejected = v.tasks.filter(t => t.status === 'REJECTED').length;
      const rate = (totalTasks > 0 ? ((accepted / totalTasks) * 100).toFixed(2) : '0.00');

      return {
        vendorCode: v.code,
        vendorName: v.name,
        status: v.status,
        totalWorkers: v.users.length,
        activeWorkers,
        totalTasks,
        pending,
        accepted,
        rejected,
        acceptanceRate: rate + '%'
      };
    });

    return {
      summary: { totalVendors: total },
      data
    };
  }
};
