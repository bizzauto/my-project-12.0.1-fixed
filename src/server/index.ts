import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import path from 'path';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import analyticsRoutes from './routes/analytics.js';
import appointmentsRoutes from './routes/appointments.js';
import automationRoutes from './routes/automation.js';
import businessRoutes from './routes/business.js';
import campaignsRoutes from './routes/campaigns.js';
import chatbotRoutes from './routes/chatbot.js';
import contactsRoutes from './routes/contacts.js';
import documentsRoutes from './routes/documents.js';
import ecommerceRoutes from './routes/ecommerce.js';
import emailRoutes from './routes/email.js';
import evolutionRoutes from './routes/evolution.js';
import googleBusinessRoutes from './routes/google-business.js';
import indiamartEmailRoutes from './routes/indiamart-email.js';
import integrationsRoutes from './routes/integrations.js';
import intelligenceRoutes from './routes/intelligence.js';
import leadsRoutes from './routes/leads.js';
import notificationsRoutes from './routes/notifications.js';
import postersRoutes from './routes/posters.js';
import postsRoutes from './routes/posts.js';
import instagramRoutes from './routes/instagram.js';
import qwenPreviewRoutes from './routes/qwen-preview.js';
import reportsRoutes from './routes/reports.js';
import reviewsRoutes from './routes/reviews.js';
import settingsRoutes from './routes/settings.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import superAdminRoutes from './routes/super-admin.js';
import teamRoutes from './routes/team.js';
import twoFactorRoutes from './routes/twoFactor.js';
import webhooksRoutes from './routes/webhooks.js';
import surveysRoutes from './routes/surveys.js';
import whatsappRoutes from './routes/whatsapp.js';
import whatsappCatalogRoutes from './routes/whatsapp-catalog.js';
import workflowRoutes from './routes/workflows.js';
import paymentLinksRoutes from './routes/payment-links.js';
import blogRoutes from './routes/blog.js';
import clientPortalRoutes from './routes/client-portal.js';
import conversationsRoutes from './routes/conversations.js';
import agencyRoutes from './routes/agency.js';
import coursesRoutes from './routes/courses.js';
import triggerLinksRoutes from './routes/trigger-links.js';
import reviewRequestsRoutes from './routes/review-requests.js';
import customFieldsRoutes from './routes/custom-fields.js';
import funnelsRoutes from './routes/funnels.js';
import smsMarketingRoutes from './routes/sms-marketing.js';
import cartRecoveryRoutes from './routes/cart-recovery.js';
import liveChatRoutes from './routes/live-chat.js';
import referralsRoutes from './routes/referrals.js';
import videoMeetingsRoutes from './routes/video-meetings.js';
import supportTicketsRoutes from './routes/support-tickets.js';
import { securityHeaders, apiSecurityHeaders } from './middleware/security.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Prisma with optimized connection pool
export const prisma = new PrismaClient({
  log: NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com", "https://fonts.googleapis.com", "https://cdn.razorpay.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameSrc: ["'self'", "https://checkout.razorpay.com", "https://api.razorpay.com"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
// Trust proxy — required when behind a reverse proxy (Nginx, Coolify, Cloudflare)
// so that rate-limiter and req.ip use the real client IP from X-Forwarded-For
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://bizzautoai.com',
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Additional security headers
app.use(securityHeaders);

// Request ID middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// API Security Headers
app.use('/api', apiSecurityHeaders);

// Global API Rate Limiter (1000 requests per 15 minutes per IP)
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health'), // Skip health checks
});
app.use('/api', globalApiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/evolution', evolutionRoutes);
app.use('/api/google-business', googleBusinessRoutes);
app.use('/api/indiamart-email', indiamartEmailRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/posters', postersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/qwen-preview', qwenPreviewRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/two-factor', twoFactorRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/whatsapp-catalog', whatsappCatalogRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/payment-links', paymentLinksRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/trigger-links', triggerLinksRoutes);
app.use('/api/review-requests', reviewRequestsRoutes);
app.use('/api/custom-fields', customFieldsRoutes);
app.use('/api/funnels', funnelsRoutes);
app.use('/api/sms-marketing', smsMarketingRoutes);
app.use('/api/cart-recovery', cartRecoveryRoutes);
app.use('/api/live-chat', liveChatRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/video-meetings', videoMeetingsRoutes);
app.use('/api/support-tickets', supportTicketsRoutes);

// Test endpoints (development only)
if (NODE_ENV !== 'production') {
  app.get('/test-get', (req, res) => {
    res.json({ success: true, method: 'GET' });
  });

  app.post('/test-nobody', (req, res) => {
    res.json({ success: true, method: 'POST', hasBody: !!req.body });
  });

  app.post('/test', (req, res) => {
    res.json({ success: true, body: req.body });
  });
}

// Health check - comprehensive
app.get('/health', async (req, res) => {
  try {
    const { getHealthCheck } = await import('./utils/healthCheck.js');
    const health = await getHealthCheck();
    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      version: '1.0.0',
    });
  }
});

// Liveness probe (for Kubernetes/Docker)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness probe (for Kubernetes/Docker)
app.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
  }
});

// Serve uploads directory (always)
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// Serve frontend in production
if (NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', '..', 'dist', 'client');
  app.use(express.static(clientBuildPath));
  app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    } else {
      res.status(404).json({ success: false, error: 'Route not found' });
    }
  });
}
// Startup validation for critical secrets
(async () => {
  try {
    const { validateEnvironment, printValidationResult } = await import('./utils/envValidator.js');
    const result = validateEnvironment();
    printValidationResult(result);

    if (!result.valid && NODE_ENV === 'production') {
      logger.error('CRITICAL: Environment validation failed. Server starting in degraded mode.');
    }
  } catch (e) {
    // Fallback basic check
    const missing: string[] = [];
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.ENCRYPTION_KEY) missing.push('ENCRYPTION_KEY');
    if (missing.length > 0) {
      const msg = `CRITICAL: Missing required environment variables: ${missing.join(', ')}`;
      logger.warn(msg);
      console.warn(`WARNING: ${msg}`);
    }
  }
})();

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Graceful shutdown
process.on('unhandledRejection', (error: any) => {
  console.error('UNHANDLED REJECTION:', error);
  console.error('Stack:', error?.stack);
  logger.error('Unhandled Rejection:', error);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    await prisma.$disconnect();
  } catch (e) {
    // ignore disconnect errors during shutdown
  }
  logger.on('finish', () => process.exit(0));
  logger.end();
  setTimeout(() => process.exit(0), 5000); // Force exit after 5s
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  try {
    await prisma.$disconnect();
  } catch (e) {
    // ignore
  }
  logger.on('finish', () => process.exit(0));
  logger.end();
  setTimeout(() => process.exit(0), 5000);
});

process.on('uncaughtException', async (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  logger.error('Uncaught Exception:', error);
  // Exit after uncaught exception - process is in undefined state
  setTimeout(() => process.exit(1), 1000);
});

// Start server
console.log(`Starting server on ${HOST}:${PORT} in ${NODE_ENV} mode`);
app.listen(Number(PORT), () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});

// Export authenticate middleware for use in routes
export { authenticate } from './middleware/auth.js';

export default app;
