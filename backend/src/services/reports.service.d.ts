export declare const ReportsService: {
    getTasksReport: (user: any, filters: any, page?: number, limit?: number) => Promise<{
        summary: {
            totalTasks: number;
            pending: number;
            accepted: number;
            rejected: number;
        };
        data: {
            id: string;
            taskId: string;
            taskName: string;
            status: import(".prisma/client").$Enums.TaskStatus;
            vendor: string;
            worker: string;
            submittedAt: Date;
            acceptedAt: Date;
            rejectedAt: Date;
            rejectionReason: string;
            createdAt: Date;
        }[];
    }>;
    getWorkersReport: (user: any, filters: any, page?: number, limit?: number) => Promise<{
        summary: {
            totalWorkers: number;
        };
        data: {
            employeeId: string;
            firstName: string;
            lastName: string;
            vendorName: string;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            totalTasks: number;
            pending: number;
            accepted: number;
            rejected: number;
            acceptanceRate: string;
        }[];
    }>;
    getVendorsReport: (user: any, filters: any, page?: number, limit?: number) => Promise<{
        summary: {
            totalVendors: number;
        };
        data: {
            vendorCode: string;
            vendorName: string;
            status: import(".prisma/client").$Enums.AccountStatus;
            totalWorkers: number;
            activeWorkers: number;
            totalTasks: number;
            pending: number;
            accepted: number;
            rejected: number;
            acceptanceRate: string;
        }[];
    }>;
};
//# sourceMappingURL=reports.service.d.ts.map