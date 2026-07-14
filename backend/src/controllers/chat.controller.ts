import { Request, Response } from 'express';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { NotificationService } from '../services/notification.service';
import { ActivityService } from '../services/activity.service';

export const listChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { search } = req.query;

    let whereClause: any = { OR: [] };
    
    // System Chats
    whereClause.OR.push({ type: 'GLOBAL' }, { type: 'ANNOUNCEMENT' });
    if (user.role === 'MANAGEMENT') {
      whereClause.OR.push({ type: 'VENDOR' });
    } else if (user.vendorId) {
      whereClause.OR.push({ type: 'VENDOR', vendorId: user.vendorId });
    }

    // Custom Chats
    whereClause.OR.push({ members: { some: { userId: user.id } } });

    const allAccessibleChats = await prisma.chat.findMany({
      where: whereClause,
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { message: true, createdAt: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Filter text search if needed
    let filteredChats = allAccessibleChats;
    if (search) {
      const s = String(search).toLowerCase();
      filteredChats = filteredChats.filter(c => c.name?.toLowerCase().includes(s));
    }

    // Resolve unread counts and names
    const processedChats = await Promise.all(filteredChats.map(async (chat) => {
      let unreadCount = 0;
      
      const memberInfo = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId: chat.id, userId: user.id } }
      });
      
      if (memberInfo) {
        unreadCount = await prisma.message.count({
          where: {
            chatId: chat.id,
            createdAt: { gt: memberInfo.lastReadAt },
            senderId: { not: user.id }
          }
        });
      } else {
        unreadCount = await prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: user.id }
          }
        });
      }

      if (chat.type === 'DIRECT') {
        const otherMember = chat.members.find(m => m.userId !== user.id);
        if (otherMember) {
          chat.name = `${otherMember.user.firstName} ${otherMember.user.lastName}`;
        }
      }

      const lastMessageText = chat.messages.length > 0 ? chat.messages[0].message : null;
      const lastMessageTime = chat.messages.length > 0 ? chat.messages[0].createdAt : chat.updatedAt;

      // Ensure we don't send massive data arrays unnecessarily
      const { messages, ...chatWithoutMessages } = chat;

      return {
        ...chatWithoutMessages,
        unreadCount,
        lastMessageText,
        lastMessageTime
      };
    }));

    res.status(200).json({ chats: processedChats });
  } catch (err) {
    logger.error('List chats error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const user = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;

    const chat = await prisma.chat.findUnique({ where: { id }, include: { members: true } });
    if (!chat) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    let authorized = false;
    if (chat.type === 'GLOBAL' || chat.type === 'ANNOUNCEMENT') authorized = true;
    else if (chat.type === 'VENDOR') authorized = user.role === 'MANAGEMENT' || user.vendorId === chat.vendorId;
    else authorized = chat.members.some(m => m.userId === user.id);

    if (!authorized) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: { sender: { select: { firstName: true, lastName: true, employeeId: true } } }
    });

    res.status(200).json({ messages: messages.reverse() });
  } catch (err) {
    logger.error('Get messages error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDirectMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { otherUserId } = req.body;
    const user = req.user!;

    if (otherUserId === user.id) {
      res.status(400).json({ message: 'Cannot DM yourself' });
      return;
    }

    const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });
    if (!otherUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check existing DM
    const existingChat = await prisma.chat.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: user.id } } },
          { members: { some: { userId: otherUserId } } }
        ]
      },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
      }
    });

    if (existingChat) {
      // Modify name for the response like in listChats
      const otherMember = existingChat.members.find(m => m.userId !== user.id);
      if (otherMember) existingChat.name = `${otherMember.user.firstName} ${otherMember.user.lastName}`;
      res.status(200).json({ chat: existingChat });
      return;
    }

    const newChat = await prisma.chat.create({
      data: {
        name: 'DM',
        type: 'DIRECT',
        members: {
          create: [{ userId: user.id }, { userId: otherUserId }]
        }
      },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
      }
    });

    const otherMember = newChat.members.find(m => m.userId !== user.id);
    if (otherMember) newChat.name = `${otherMember.user.firstName} ${otherMember.user.lastName}`;

    res.status(201).json({ chat: newChat });
  } catch (err) {
    logger.error('Create DM error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, userIds } = req.body; // array of userIds
    const user = req.user!;

    if (!name) {
      res.status(400).json({ message: 'Group name required' });
      return;
    }

    // Verify permissions for adding users
    if (user.role === 'VENDOR') {
      const u = await prisma.user.findUnique({ where: { id: user.id } });
      const requestedUsers = await prisma.user.findMany({ where: { id: { in: userIds || [] } } });
      for (const reqUser of requestedUsers) {
        if (reqUser.vendorId !== u?.vendorId && reqUser.role !== 'MANAGEMENT') {
          res.status(403).json({ message: 'Vendors can only add their own workers' });
          return;
        }
      }
    }

    const membersData = [{ userId: user.id }];
    if (userIds && Array.isArray(userIds)) {
      userIds.forEach((id: string) => {
        if (id !== user.id) membersData.push({ userId: id });
      });
    }

    const newGroup = await prisma.chat.create({
      data: {
        name,
        type: 'GROUP',
        ownerId: user.id,
        members: { create: membersData }
      },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
      }
    });

    logger.audit('GROUP_CREATED', req, { chatId: newGroup.id });
    await ActivityService.create({ actorUserId: user.id, action: 'GROUP_CREATED', entityType: 'CHAT', entityId: newGroup.id });
    
    if (userIds && Array.isArray(userIds)) {
      for (const id of userIds) {
        if (id !== user.id) {
          await NotificationService.create({
            recipientUserId: id,
            title: 'Added to Group',
            message: `You were added to group: ${name}`,
            type: 'GROUP_INVITE',
            relatedEntityType: 'CHAT',
            relatedEntityId: newGroup.id
          });
        }
      }
    }
    
    res.status(201).json({ chat: newGroup });
  } catch (err) {
    logger.error('Create group error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const archiveGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const user = req.user!;

    const chat = await prisma.chat.findUnique({ where: { id } });
    if (!chat || chat.type !== 'GROUP') {
      res.status(404).json({ message: 'Group not found' });
      return;
    }

    if (chat.ownerId !== user.id && user.role !== 'MANAGEMENT') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.chat.update({
      where: { id },
      data: { archived: true, archivedAt: new Date(), archivedBy: user.id }
    });

    logger.audit('GROUP_ARCHIVED', req, { chatId: id });
    res.status(200).json({ message: 'Group archived' });
  } catch (err) {
    logger.error('Archive group error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const deleteChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const user = req.user!;

    if (user.role !== 'MANAGEMENT') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const chat = await prisma.chat.findUnique({ where: { id } });
    if (!chat) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    if (chat.type === 'GLOBAL' || chat.type === 'ANNOUNCEMENT' || chat.type === 'VENDOR') {
      res.status(400).json({ message: 'System chats cannot be deleted' });
      return;
    }

    await prisma.chat.delete({ where: { id } });

    logger.audit('CHAT_DELETED', req, { chatId: id });
    await ActivityService.create({ actorUserId: user.id, action: 'CHAT_DELETED', entityType: 'CHAT', entityId: id });

    res.status(200).json({ message: 'Chat deleted' });
  } catch (err) {
    logger.error('Delete chat error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const addGroupMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id) as string;
    const { userIds } = req.body;
    const user = req.user!;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ message: 'User IDs required' });
      return;
    }

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!chat || chat.type !== 'GROUP') {
      res.status(404).json({ message: 'Group not found' });
      return;
    }

    // Verify user is in the group
    if (!chat.members.some(m => m.userId === user.id) && user.role !== 'MANAGEMENT') {
      res.status(403).json({ message: 'Not a member of this group' });
      return;
    }

    // Verify permissions for adding users
    if (user.role === 'VENDOR') {
      const u = await prisma.user.findUnique({ where: { id: user.id } });
      const requestedUsers = await prisma.user.findMany({ where: { id: { in: userIds } } });
      for (const reqUser of requestedUsers) {
        if (reqUser.vendorId !== u?.vendorId && reqUser.role !== 'MANAGEMENT') {
          res.status(403).json({ message: 'Vendors can only add their own workers' });
          return;
        }
      }
    }

    const existingMemberIds = chat.members.map(m => m.userId);
    const newMembers = userIds.filter((id: string) => !existingMemberIds.includes(id));

    if (newMembers.length > 0) {
      await prisma.chat.update({
        where: { id },
        data: {
          members: {
            create: newMembers.map((userId: string) => ({ userId }))
          }
        }
      });

      for (const newMemberId of newMembers) {
        await NotificationService.create({
          recipientUserId: newMemberId,
          title: 'Added to Group',
          message: `You were added to group: ${chat.name}`,
          type: 'GROUP_INVITE',
          relatedEntityType: 'CHAT',
          relatedEntityId: chat.id
        });
      }
      
      logger.audit('GROUP_MEMBERS_ADDED', req as any, { chatId: id, newMembers });
      await ActivityService.create({ actorUserId: user.id, action: 'GROUP_MEMBERS_ADDED', entityType: 'CHAT', entityId: id });
    }

    res.status(200).json({ message: 'Members added successfully' });
  } catch (err) {
    logger.error('Add group members error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const search = String(req.query.search || '').trim();
    
    if (!search || search.length < 2) {
      res.status(200).json({ users: [] });
      return;
    }

    let whereClause: any = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
      accountStatus: 'ACTIVE',
      id: { not: user.id } // exclude self
    };

    // Apply visibility constraints based on role
    if (user.role === 'VENDOR') {
      whereClause = {
        AND: [
          whereClause,
          { OR: [{ role: 'MANAGEMENT' }, { vendorId: user.vendorId }] }
        ]
      };
    } else if (user.role === 'WORKER') {
      whereClause = {
        AND: [
          whereClause,
          { OR: [{ role: 'MANAGEMENT' }, { vendorId: user.vendorId }] }
        ]
      };
    }
    // Management can see everyone, so no extra constraints

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        vendor: { select: { name: true } }
      },
      take: 10
    });

    res.status(200).json({ users });
  } catch (err) {
    logger.error('Search users error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const sendMessage = async (req: import('express').Request, res: import('express').Response): Promise<void> => {
  try {
    const chatId = String(req.params.id) as string;
    const { message: text } = req.body;
    const user = req.user!;
    if (!text || text.trim() === '') {
      res.status(400).json({ message: 'Message is required' });
      return;
    }
    const prisma = require('../utils/db').default;
    const chat = await prisma.chat.findUnique({ where: { id: chatId }, include: { members: true } });
    if (!chat || chat.archived) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }
    let authorized = false;
    if (chat.type === 'GLOBAL') authorized = true;
    else if (chat.type === 'ANNOUNCEMENT') authorized = user.role === 'MANAGEMENT'; 
    else if (chat.type === 'VENDOR') authorized = user.role === 'MANAGEMENT' || user.vendorId === chat.vendorId;
    else authorized = chat.members.some((m: any) => m.userId === user.id);
    if (!authorized) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const message = await prisma.message.create({
      data: { chatId, senderId: user.id, message: text.trim() },
      include: { sender: { select: { firstName: true, lastName: true, employeeId: true } } }
    });
    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    
    const { getIoInstance } = require('../services/notification.service');
    const io = getIoInstance();
    if (io) {
      io.to(chatId).emit('new_message', message);
      
      // Also emit to all individual user rooms so they see it even if they haven't joined the chat room
      if (chat.type === 'DIRECT' || chat.type === 'GROUP') {
        chat.members.forEach((m: any) => {
          if (m.userId !== user.id) {
            io.to(`user_${m.userId}`).emit('new_message', message);
          }
        });
      } else if (chat.type === 'GLOBAL' || chat.type === 'ANNOUNCEMENT') {
        io.emit('new_message', message);
      } else if (chat.type === 'VENDOR') {
        // Broadly emit to the vendor room if we had one, but for now we can just emit to everyone and let frontend filter,
        // or we manually find vendor users. To be safe, emit globally and let the frontend filter if needed.
        io.emit('new_message', message);
      }
    }
    
    res.status(201).json({ message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const markAsRead = async (req: import('express').Request, res: import('express').Response): Promise<void> => {
  try {
    const chatId = String(req.params.id) as string;
    const user = req.user!;
    const prisma = require('../utils/db').default;
    
    // Upsert ChatMember lastReadAt so System Chats work
    await prisma.chatMember.upsert({
      where: { chatId_userId: { chatId, userId: user.id } },
      update: { lastReadAt: new Date() },
      create: { chatId, userId: user.id, lastReadAt: new Date() }
    });

    // Mark messages as READ where recipient is user
    await prisma.message.updateMany({
      where: { 
        chatId, 
        senderId: { not: user.id },
        status: { not: 'READ' }
      },
      data: { status: 'READ' }
    });
    
    const { getIoInstance } = require('../services/notification.service');
    const io = getIoInstance();
    if (io) {
      // Notify sender that their messages were read
      io.to(chatId).emit('messages_read', { chatId, readByUserId: user.id });
    }

    res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    console.error('markAsRead error', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
