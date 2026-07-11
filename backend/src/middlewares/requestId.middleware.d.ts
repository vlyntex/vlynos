import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            id: string;
        }
    }
}
export declare const assignRequestId: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestId.middleware.d.ts.map