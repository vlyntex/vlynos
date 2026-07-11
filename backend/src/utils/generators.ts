import crypto from 'crypto';
import prisma from './db';

// Generate a random password of length 12
export const generateRandomPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  return Array.from(crypto.randomFillSync(new Uint32Array(12)))
    .map((x) => chars[x % chars.length])
    .join('');
};

// Generate a secure 32-byte hex key for Vendors
export const generateVendorKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Sequentially generate Employee ID (VLY-000001)
export const generateEmployeeId = async (): Promise<string> => {
  const lastUser = await prisma.user.findFirst({
    where: { employeeId: { startsWith: 'VLY-' } },
    orderBy: { employeeId: 'desc' },
  });

  if (!lastUser || !lastUser.employeeId) {
    return 'VLY-000001';
  }

  const lastNum = parseInt(lastUser.employeeId.split('-')[1] || '0', 10);
  const nextNum = lastNum + 1;
  return `VLY-${String(nextNum).padStart(6, '0')}`;
};

export const generateEmployeeIds = async (count: number): Promise<string[]> => {
  const lastUser = await prisma.user.findFirst({
    where: { employeeId: { startsWith: 'VLY-' } },
    orderBy: { employeeId: 'desc' },
  });

  let lastNum = 0;
  if (lastUser && lastUser.employeeId) {
    lastNum = parseInt(lastUser.employeeId.split('-')[1] || '0', 10);
  }

  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    ids.push(`VLY-${String(lastNum + i).padStart(6, '0')}`);
  }
  return ids;
};

// Sequentially generate Vendor Code (VND-0001)
export const generateVendorCode = async (): Promise<string> => {
  const lastVendor = await prisma.vendor.findFirst({
    where: { code: { startsWith: 'VND-' } },
    orderBy: { code: 'desc' },
  });

  if (!lastVendor || !lastVendor.code) {
    return 'VND-0001';
  }

  const lastNum = parseInt(lastVendor.code.split('-')[1] || '0', 10);
  const nextNum = lastNum + 1;
  return `VND-${String(nextNum).padStart(4, '0')}`;
};
