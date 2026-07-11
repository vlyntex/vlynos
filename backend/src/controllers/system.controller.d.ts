import { Request, Response } from 'express';
export declare const getHealth: (req: Request, res: Response) => Promise<void>;
export declare const getBackups: (req: Request, res: Response) => Promise<void>;
export declare const createBackup: (req: Request, res: Response) => Promise<void>;
export declare const restoreBackup: (req: Request, res: Response) => Promise<void>;
export declare const downloadBackup: (req: Request, res: Response) => Promise<void>;
export declare const deleteBackup: (req: Request, res: Response) => Promise<void>;
export declare const getLogs: (req: Request, res: Response) => Promise<void>;
export declare const getErrors: (req: Request, res: Response) => Promise<void>;
export declare const getSecurityOverview: (req: Request, res: Response) => Promise<void>;
export declare const resolveAlert: (req: Request, res: Response) => Promise<void>;
export declare const forceLogout: (req: Request, res: Response) => Promise<void>;
export declare const revokeAllSessions: (req: Request, res: Response) => Promise<void>;
export declare const getSettings: (req: Request, res: Response) => Promise<void>;
export declare const updateSetting: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=system.controller.d.ts.map
