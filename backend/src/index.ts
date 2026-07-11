import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { assignRequestId } from './middlewares/requestId.middleware';
import { globalErrorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import vendorRoutes from './routes/vendor.routes';
import workerRoutes from './routes/worker.routes';
import taskRoutes from './routes/task.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import activityRoutes from './routes/activity.routes';
import reportsRoutes from './routes/reports.routes';
import systemRoutes from './routes/system.routes';
import handbookRoutes from './routes/handbook.routes';
import prisma from './utils/db';
import { startTaskLockJob, startNotificationExpiryJob, startReportCleanupJob, startSystemCleanupJobs } from './utils/jobs';
import { setupChatSocket } from './sockets/chat.socket';
import { initializeSystemChats } from './utils/chatInit';

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

const corsOptions = {
  origin: config.nodeEnv === 'production' ? config.frontendUrl : true,
  credentials: true,
};

const io = new Server(httpServer, {
  cors: corsOptions,
});

// Setup Socket.IO Logic
setupChatSocket(io);

// Request ID assignment FIRST
app.use(assignRequestId);

app.use(helmet());
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for dev/testing
  message: { message: 'Too many requests, please try again later.' },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Increased to avoid blocking logins during dev
  message: { message: 'Too many auth requests, please try again later.' },
});

import { csrfProtection } from './middlewares/csrf.middleware';

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(config.cookieSecret));

// Apply CSRF Protection globally
app.use(csrfProtection);

// Routes with /api/v1/ prefix
app.use('/api/v1/health', healthRoutes);

// Serve uploaded files securely
app.use('/uploads', express.static('uploads'));

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/handbook', handbookRoutes);

// Global Error Handler LAST
app.use(globalErrorHandler);

// Start background jobs & Initializers
startTaskLockJob();
startNotificationExpiryJob();
startReportCleanupJob();
startSystemCleanupJobs();
initializeSystemChats();

httpServer.listen(config.port, () => {
  logger.info(`Server v${config.version} running on port ${config.port}`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  io.close(() => {
    logger.info('Socket.IO stopped.');
  });
  
  httpServer.close(async () => {
    logger.info('Express server stopped.');
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
