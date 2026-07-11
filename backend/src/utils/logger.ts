import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname, '../../logs');
const appLogsDir = path.join(logsDir, 'application');
const errorLogsDir = path.join(logsDir, 'errors');
const securityLogsDir = path.join(logsDir, 'security');

[logsDir, appLogsDir, errorLogsDir, securityLogsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const getTimestamp = () => new Date().toISOString();
const getDateStr = () => getTimestamp().split('T')[0];

const appendLog = (dir: string, file: string, message: string) => {
  const rotatedFile = file.replace('.log', `-${getDateStr()}.log`);
  const filePath = path.join(dir, rotatedFile);
  fs.appendFileSync(filePath, `${message}\n`);
};

export const logger = {
  info: (message: string, reqId?: string, ...meta: any[]) => {
    const prefix = reqId ? `[REQ:${reqId}] ` : '';
    const logStr = `[INFO] ${getTimestamp()} - ${prefix}${message} ${meta.length ? JSON.stringify(meta) : ''}`;
    console.log(logStr);
    appendLog(appLogsDir, 'app.log', logStr);
  },
  error: (message: string, error?: any, reqId?: string) => {
    const prefix = reqId ? `[REQ:${reqId}] ` : '';
    const errStr = error instanceof Error ? error.stack || error.message : JSON.stringify(error);
    const logStr = `[ERROR] ${getTimestamp()} - ${prefix}${message} ${errStr}`;
    console.error(logStr);
    appendLog(errorLogsDir, 'error.log', logStr);
  },
  warn: (message: string, reqId?: string, ...meta: any[]) => {
    const prefix = reqId ? `[REQ:${reqId}] ` : '';
    const logStr = `[WARN] ${getTimestamp()} - ${prefix}${message} ${meta.length ? JSON.stringify(meta) : ''}`;
    console.warn(logStr);
    appendLog(appLogsDir, 'app.log', logStr);
  },
  security: (message: string, reqId?: string, ...meta: any[]) => {
    const prefix = reqId ? `[REQ:${reqId}] ` : '';
    const logStr = `[SECURITY] ${getTimestamp()} - ${prefix}${message} ${meta.length ? JSON.stringify(meta) : ''}`;
    console.log(logStr);
    appendLog(securityLogsDir, 'security.log', logStr);
  },
  audit: (action: string, req: any, meta?: { userId?: string, employeeId?: string, [key: string]: any }) => {
    const reqId = req?.id || 'NO_REQ';
    const ipAddress = req?.ip || req?.socket?.remoteAddress || 'UNKNOWN_IP';
    const userId = meta?.userId || req?.user?.id || 'UNKNOWN_USER';
    const employeeId = meta?.employeeId || 'UNKNOWN_EMP';

    const logStr = `[AUDIT] ${getTimestamp()} - [REQ:${reqId}] | IP:${ipAddress} | USER:${userId} | EMP:${employeeId} | ACTION:${action} | META:${JSON.stringify(meta || {})}`;
    console.log(logStr);
    appendLog(securityLogsDir, 'audit.log', logStr);
  }
};
