import { Server, Socket } from 'socket.io';
import { parse } from 'cookie';
import { getSetting } from '../utils/settings';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { setIoInstance, NotificationService } from '../services/notification.service';
import { ActivityService } from '../services/activity.service';

export const onlineUsers = new Map<string, string>();

export const setupChatSocket = (io: Server) => {
  setIoInstance(io);

  io.use(async (socket: Socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) return next(new Error('Authentication error'));
      
      const parsedCookies = parse(cookies);
      const token = parsedCookies.token;
      
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      
      if (user && user.role !== 'MANAGEMENT') {
      const isMaintenance = await getSetting('MAINTENANCE_MODE');
      if (isMaintenance === 'true') {
        return next(new Error('Maintenance Mode'));
      }
    }

    if (!user || user.accountStatus !== 'ACTIVE') {
        return next(new Error('Authentication error'));
      }

      (socket as any).user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('Socket connected:', socket.id);
    const user = (socket as any).user;
    
    // Setup unique user room for live notifications
    socket.join(`user_${user.id}`);
    
    onlineUsers.set(user.id, socket.id);
    io.emit('user_status_changed', { userId: user.id, status: 'ONLINE' });

    prisma.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } }).catch();

    socket.on('join_chat', async (chatId: string) => {
      try {
        const chat = await prisma.chat.findUnique({ where: { id: chatId }, include: { members: true } });
        if (!chat) return;

        let authorized = false;
        if (chat.type === 'GLOBAL' || chat.type === 'ANNOUNCEMENT') authorized = true;
        else if (chat.type === 'VENDOR') authorized = user.role === 'MANAGEMENT' || user.vendorId === chat.vendorId;
        else authorized = chat.members.some(m => m.userId === user.id);

        if (authorized) socket.join(chatId);
      } catch (err) {
        logger.error('Socket join_chat error', err);
      }
    });

    socket.on('send_message', async (data: { chatId: string, text: string }) => {
      console.log('Received send_message event:', data);
      try {
        const { chatId, text } = data;
        if (!text || text.trim() === '') return;
        if (text.length > 2000) return;

        const chat = await prisma.chat.findUnique({ where: { id: chatId }, include: { members: true } });
        console.log('Chat found:', chat?.id, 'Type:', chat?.type);
        if (!chat || chat.archived) {
          console.log('Chat not found or archived');
          return;
        }

        let authorized = false;
        if (chat.type === 'GLOBAL') authorized = true;
        else if (chat.type === 'ANNOUNCEMENT') authorized = user.role === 'MANAGEMENT'; 
        else if (chat.type === 'VENDOR') authorized = user.role === 'MANAGEMENT' || user.vendorId === chat.vendorId;
        else authorized = chat.members.some(m => m.userId === user.id);

        console.log('Authorized to send:', authorized);
        if (!authorized) return;

        const message = await prisma.message.create({
          data: { chatId, senderId: user.id, message: text.trim() },
          include: { sender: { select: { firstName: true, lastName: true, employeeId: true } } }
        });

        await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

        io.to(chatId).emit('new_message', message);
        
        if (chat.type === 'DIRECT' || chat.type === 'GROUP') {
          chat.members.forEach(m => {
            if (m.userId !== user.id) {
              io.to(`user_${m.userId}`).emit('new_message', message);
            }
          });
        } else if (chat.type === 'GLOBAL' || chat.type === 'ANNOUNCEMENT') {
          socket.broadcast.emit('new_message', message);
        } else if (chat.type === 'VENDOR') {
          const sockets = await io.fetchSockets();
          sockets.forEach(s => {
            const u = (s as any).user;
            if (u && u.id !== user.id) {
              if (u.role === 'MANAGEMENT' || u.vendorId === chat.vendorId) {
                s.emit('new_message', message);
              }
            }
          });
        }

        if (chat.type === 'ANNOUNCEMENT') {
          await ActivityService.create({ actorUserId: user.id, action: 'POSTED_ANNOUNCEMENT', entityType: 'CHAT', entityId: chat.id });
          await NotificationService.createBulkAnnouncement('New Announcement', text.trim());
        } else if (chat.type === 'GLOBAL') {
          await NotificationService.createBulkAnnouncement(`New Message in ${chat.name}`, text.trim());
        } else if (chat.type === 'DIRECT' || chat.type === 'GROUP') {
          for (const m of chat.members) {
            if (m.userId !== user.id) {
              await NotificationService.create({
                recipientUserId: m.userId,
                title: `New Message in ${chat.name || 'Chat'}`,
                message: text.trim(),
                type: 'SYSTEM',
                relatedEntityType: 'CHAT',
                relatedEntityId: chat.id
              });
            }
          }
        } else if (chat.type === 'VENDOR') {
          // Notify vendor users
          const vendorUsers = await prisma.user.findMany({
            where: { vendorId: chat.vendorId }
          });
          for (const vu of vendorUsers) {
            if (vu.id !== user.id) {
              await NotificationService.create({
                recipientUserId: vu.id,
                title: `New Message in ${chat.name}`,
                message: text.trim(),
                type: 'SYSTEM',
                relatedEntityType: 'CHAT',
                relatedEntityId: chat.id
              });
            }
          }
          // Also notify MANAGEMENT if sender is VENDOR, etc. For simplicity, anyone not sender gets notified if they are Management or Vendor.
          const mgmtUsers = await prisma.user.findMany({ where: { role: 'MANAGEMENT' } });
          for (const mu of mgmtUsers) {
            if (mu.id !== user.id) {
              await NotificationService.create({
                recipientUserId: mu.id,
                title: `New Message in ${chat.name}`,
                message: text.trim(),
                type: 'SYSTEM',
                relatedEntityType: 'CHAT',
                relatedEntityId: chat.id
              });
            }
          }
        }

      } catch (err) {
        logger.error('Socket send_message error', err);
      }
    });

    socket.on('typing_start', async (data: { chatId: string }) => {
      socket.to(data.chatId).emit('typing_start', { chatId: data.chatId, userId: user.id });
    });

    socket.on('typing_end', async (data: { chatId: string }) => {
      socket.to(data.chatId).emit('typing_end', { chatId: data.chatId, userId: user.id });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(user.id);
      io.emit('user_status_changed', { userId: user.id, status: 'OFFLINE' });
      prisma.user.update({ where: { id: user.id }, data: { lastSeen: new Date(), presence: 'OFFLINE' } }).catch();
    });
  });
};
