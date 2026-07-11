import prisma from './db';
import { logger } from './logger';

export const initializeSystemChats = async () => {
  try {
    // GLOBAL
    let globalChat = await prisma.chat.findFirst({ where: { type: 'GLOBAL' } });
    if (!globalChat) {
      await prisma.chat.create({ data: { name: 'Global Company Chat', type: 'GLOBAL' } });
      logger.info('Created Global Chat');
    }

    // ANNOUNCEMENT
    let announcementChat = await prisma.chat.findFirst({ where: { type: 'ANNOUNCEMENT' } });
    if (!announcementChat) {
      await prisma.chat.create({ data: { name: 'Announcements', type: 'ANNOUNCEMENT' } });
      logger.info('Created Announcement Chat');
    }

    // VENDOR CHATS
    const vendors = await prisma.vendor.findMany();
    for (const vendor of vendors) {
      let vendorChat = await prisma.chat.findFirst({ where: { type: 'VENDOR', vendorId: vendor.id } });
      if (!vendorChat) {
        await prisma.chat.create({ data: { name: `${vendor.name} Team`, type: 'VENDOR', vendorId: vendor.id } });
        logger.info(`Created Vendor Chat for ${vendor.name}`);
      }
    }
  } catch (error) {
    logger.error('Failed to initialize system chats', error);
  }
};
