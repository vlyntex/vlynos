export declare const logger: {
    info: (message: string, reqId?: string, ...meta: any[]) => void;
    error: (message: string, error?: any, reqId?: string) => void;
    warn: (message: string, reqId?: string, ...meta: any[]) => void;
    security: (message: string, reqId?: string, ...meta: any[]) => void;
    audit: (action: string, req: any, meta?: {
        userId?: string;
        employeeId?: string;
        [key: string]: any;
    }) => void;
};
//# sourceMappingURL=logger.d.ts.map