import { Request, Response } from 'express';
import prisma from '../utils/db';
import { logger } from '../utils/logger';

export const listDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const documents = await prisma.handbookDocument.findMany({
      include: {
        author: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ documents, requestId: req.id as string });
  } catch (error) {
    logger.error('List handbook documents error', error, req.id as string);
    res.status(500).json({ message: 'Internal server error', requestId: req.id as string });
  }
};

export const createDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content } = req.body;
    const file = req.file;
    
    if (!title || !content) {
      res.status(400).json({ message: 'Missing required fields', requestId: req.id as string });
      return;
    }

    const document = await prisma.handbookDocument.create({
      data: {
        title,
        content,
        fileUrl: file ? `/uploads/handbook/${file.filename}` : null,
        fileName: file ? file.originalname : null,
        authorId: req.user!.id
      }
    });

    logger.audit('HANDBOOK_DOCUMENT_CREATED', req, { documentId: document.id });
    res.status(201).json({ message: 'Document created successfully', document, requestId: req.id as string });
  } catch (error) {
    logger.error('Create handbook document error', error, req.id as string);
    res.status(500).json({ message: 'Internal server error', requestId: req.id as string });
  }
};

export const updateDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { title, content } = req.body;
    const file = req.file;

    const document = await prisma.handbookDocument.findUnique({ where: { id } });
    if (!document) {
      res.status(404).json({ message: 'Document not found', requestId: req.id as string });
      return;
    }

    const updateData: any = { title, content };
    if (file) {
      updateData.fileUrl = `/uploads/handbook/${file.filename}`;
      updateData.fileName = file.originalname;
    }

    const updatedDocument = await prisma.handbookDocument.update({
      where: { id },
      data: updateData
    });

    logger.audit('HANDBOOK_DOCUMENT_UPDATED', req, { documentId: id });
    res.status(200).json({ message: 'Document updated successfully', document: updatedDocument, requestId: req.id as string });
  } catch (error) {
    logger.error('Update handbook document error', error, req.id as string);
    res.status(500).json({ message: 'Internal server error', requestId: req.id as string });
  }
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const document = await prisma.handbookDocument.findUnique({ where: { id } });
    if (!document) {
      res.status(404).json({ message: 'Document not found', requestId: req.id as string });
      return;
    }

    await prisma.handbookDocument.delete({ where: { id } });
    
    logger.audit('HANDBOOK_DOCUMENT_DELETED', req, { documentId: id });
    res.status(200).json({ message: 'Document deleted successfully', requestId: req.id as string });
  } catch (error) {
    logger.error('Delete handbook document error', error, req.id as string);
    res.status(500).json({ message: 'Internal server error', requestId: req.id as string });
  }
};
