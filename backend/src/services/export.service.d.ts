export declare const ExportService: {
    queueReport: (userId: string, reportType: any, filters: any) => Promise<{
        error: string;
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ReportJobStatus;
        userId: string;
        reportType: import(".prisma/client").$Enums.ReportType;
        filters: string;
        fileUrl: string;
        downloadCount: number;
        lastDownloadedAt: Date;
        completedAt: Date;
    }>;
    processJob: (jobId: string) => Promise<void>;
    jsonToCsv: (data: any[]) => string;
};
//# sourceMappingURL=export.service.d.ts.map