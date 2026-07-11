import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  cookieSecret: process.env.COOKIE_SECRET || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  companyDomain: process.env.COMPANY_EMAIL_DOMAIN || 'vlyntech.com',
  version: '1.0.0-alpha',
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Validation
if (!config.jwtSecret) throw new Error('JWT_SECRET is missing');
if (!config.cookieSecret) throw new Error('COOKIE_SECRET is missing');
if (!config.databaseUrl) throw new Error('DATABASE_URL is missing');
