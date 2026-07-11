import prisma from './db';

const DEFAULTS: Record<string, string> = {
  'COMPANY_NAME': 'VlynTech',
  'CLIENT_NAME': 'Snorkel',
  'TASK_EDIT_WINDOW': '5',
  'REPORT_RETENTION_DAYS': '7',
  'NOTIFICATION_RETENTION_DAYS': '90',
  'LOG_RETENTION_DAYS': '30',
  'SESSION_RETENTION_DAYS': '14',
  'MAINTENANCE_MODE': 'false'
};

export const getSetting = async (key: string): Promise<string> => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (setting) return setting.value;

    if (DEFAULTS[key] !== undefined) {
      const defVal = DEFAULTS[key] as string;
      await prisma.systemSetting.create({
        data: { key, value: defVal }
      });
      return defVal;
    }
  } catch (e) {
    // If DB isn't ready, return default
    return DEFAULTS[key] || '';
  }
  return '';
};
