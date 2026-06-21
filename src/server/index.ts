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

// Security imports
import { 
  globalRateLimiter, 
  authRateLimiter, 
  loginRateLimiter,
  uploadRateLimiter,
  speedLimiter,
  aiApiRateLimiter 
} from './middleware/rateLimiters.js';
import { 
  securityHeaders, 
  additionalSecurityHeaders,
  inputSanitizer 
} from './middleware/security.js';
import { 
  ipBlockMiddleware,
  ipWhitelist 
} from './middleware/ipSecurity.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import referralRoutes from './routes/referrals.js';
import aiRoutes from './routes/ai.js';
import analyticsRoutes from './routes/analytics.js';
import appointmentsRoutes from './routes/appointments.js';
import automationRoutes from './routes/automation.js';
import businessRoutes from './routes/business.js';
import campaignsRoutes from './routes/campaigns.js';
import chatbotRoutes from './routes/chatbot.js';
import contactsRoutes from './routes/contacts.js';
import customerDataSecurityRoutes from './routes/customer-data-security.routes.js';
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
import socialAccountsRoutes from './routes/social-accounts.js';
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
import claudeWhatsAppRoutes from './routes/claude-whatsapp.js';
import unofficialWhatsAppRoutes from './routes/unofficial-whatsapp.js';
import cartRecoveryRoutes from './routes/cart-recovery.js';
import liveChatRoutes from './routes/live-chat.js';
import videoMeetingsRoutes from './routes/video-meetings.js';
import supportTicketsRoutes from './routes/support-tickets.js';
import voiceCallsRoutes from './routes/voice-calls.js';
import whatsappMediaCleanupRoutes from './routes/whatsapp-media-cleanup.routes.js';
import dograhWebhookRoutes from './routes/dograh-webhook.js';
import walletRoutes from './routes/wallet.js';
import loyaltyRoutes from './routes/loyalty.js';
import ledgerRoutes from './routes/ledger.js';
import goalsRoutes from './routes/goals.js';
import crmInvoicesRoutes from './routes/crm-invoices.js';
import dealsRoutes from './routes/deals.js';
import pipelinesRoutes from './routes/pipelines.js';
import storePublicRoutes from './routes/store-public.js';
import storeFeaturesRoutes from './routes/store-features.js';
import storeAdvancedRoutes from './routes/store-advanced.js';
import storeCustomizeRoutes from './routes/store-customize.js';
import jimiTtsRoutes from './routes/jimi-tts.js';
import avaRoutes from './routes/ava.js';
import { apiSecurityHeaders } from './middleware/security.js';
import { validateCSRF } from './middleware/csrf.js';
import { sanitizeInput } from './middleware/sanitize.js';
import { apiVersioning } from './middleware/api-versioning.js';
import { requestCounting } from './middleware/request-counting.js';
import { cacheResponse, getCacheStats, invalidateCache } from './middleware/cache.js';
import adminAnalyticsRoutes from './routes/admin-analytics.js';
import monitoringRoutes from './routes/monitoring.js';
import dataExportRoutes from './routes/data-export.js';
import v2Routes from './routes/v2/index.js';
import { piiMaskingMiddleware, sanitizeRequestBody } from './middleware/pii-masking.js';
import { auditMiddleware } from './services/audit.service.js';
import dbPoolRoutes from './routes/db-pool.js';
import auditRetentionRoutes from './routes/audit-retention.js';
import { startSlowQueryLogger } from './middleware/slow-query-logger.js';
import { requestTimeout } from './middleware/request-timeout.js';
import { circuitBreaker } from './services/circuit-breaker.service.js';
import { shutdownWebhookWorker } from './services/webhook-retry.service.js';
import { startAuditPruneCron, stopAuditPruneCron } from './services/audit-prune.service.js';
import adminInfrastructureRoutes from './routes/admin-infrastructure.js';
import admissionRoutes from './routes/admission.js';
import caCopilotRoutes from './routes/ca-copilot.js';
import caFileCompareRoutes from './routes/ca-file-compare.js';
import leadFinderRoutes from './routes/lead-finder.js';
import aiOutreachRoutes from './routes/ai-outreach.js';
import whiteLabelRoutes from './routes/white-label.js';
import vcardRoutes from './routes/vcard.js';
import websiteRoutes from './routes/websites.js';
import surveyRoutes from './routes/surveys.js';
import ssoRoutes from './routes/sso.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Prisma with optimized connection pool
// connection_limit defaults to num_cpus * 2 + 1; pool_timeout controls wait time
const POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '0');
const poolUrl = POOL_SIZE > 0
  ? `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes('?') ? '&' : '?'}connection_limit=${POOL_SIZE}&pool_timeout=10`
  : process.env.DATABASE_URL;

const slowQueryEnabled = process.env.SLOW_QUERY_LOG_ENABLED !== 'false' && NODE_ENV === 'production';
export const prisma = new PrismaClient({
  log: [
    'error',
    'warn',
    ...(slowQueryEnabled ? ['query' as const] : []),
  ],
  datasources: {
    db: {
      url: poolUrl,
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

// Trust proxy — required when behind a reverse proxy (Nginx, Coolify, Cloudflare)
// so that rate-limiter and req.ip use the real client IP from X-Forwarded-For
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://bizzautoai.com',
  credentials: true,
}));
app.use(compression());
app.use(morgan(':method :url :status :response-time ms :req[host] :user-agent', {
  stream: { write: (message) => logger.info(message.trim()) },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Additional security headers
app.use(securityHeaders);

// Request ID middleware — also sets X-Request-Id response header
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Global input sanitization — XSS prevention on all request inputs
app.use(sanitizeInput);

// PII masking middleware — masks sensitive customer data in logs
app.use(piiMaskingMiddleware);

// Sanitize request body — removes XSS from request data
app.use(sanitizeRequestBody);

// API versioning — extracts version from path/header/query
app.use('/api', apiVersioning);

// Auto-invalidate cache on mutations
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // After successful mutation, invalidate cache for this business
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateCache((req as any).user?.businessId);
      }
      return originalJson(body);
    };
  }
  next();
});

// Request timeout — prevent slow-client DoS
app.use(requestTimeout());

// NEW: IP Blocking & Rate Limiting Middlewares
app.use(ipBlockMiddleware);
app.use(speedLimiter);

// Request counting middleware — feeds /api/metrics with real traffic data
app.use('/api', requestCounting);

// NEW: AI API Rate Limiter (stricter for expensive calls)
app.use('/api/ai', aiApiRateLimiter);

// NEW: Upload Rate Limiter
app.use('/upload', uploadRateLimiter);

// Audit log middleware — automatically logs state-changing API requests
app.use('/api', auditMiddleware);

// API Security Headers
app.use('/api', apiSecurityHeaders);

// Global API Rate Limiter (1000 requests per 15 minutes per IP)
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skip: (req) => req.path.startsWith('/health'), // Skip health checks
});
app.use('/api', globalApiLimiter);

// Stricter rate limiter for write/mutation endpoints (100 requests per 15 minutes per IP)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many write requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});
// Apply write limiter to high-risk mutation routes
const mutationRoutes = ['/contacts', '/campaigns', '/posts', '/documents', '/leads', '/workflows', '/email', '/sms-marketing'];
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const isMutation = mutationRoutes.some(route => req.path.startsWith(route));
    if (isMutation) {
      return writeLimiter(req, res, next);
    }
  }
  next();
});

// API Routes

// CSRF validation for authenticated state-changing routes
// Applied globally — each route that needs CSRF will check X-CSRF-Token header
// GET/HEAD/OPTIONS are always allowed (safe methods)
app.use('/api', (req, res, next) => {
  // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  // Skip CSRF for public endpoints (no auth needed)
  const publicPaths = ['/api/store', '/api/auth', '/api/health'];
  if (publicPaths.some(p => req.path.startsWith(p.replace('/api', '')))) {
    return next();
  }
  // Skip CSRF for webhook endpoints (they use webhook-secret validation instead)
  const webhookPaths = ['/dograh/webhook'];
  if (webhookPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  // Apply CSRF validation to all other POST/PUT/PATCH/DELETE requests
  validateCSRF(req, res, next);
});

// Public store routes (no auth required)
app.use('/api/store', storePublicRoutes);
app.use('/api/auth', authRateLimiter);
app.use('/api/auth/login', loginRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/customer-security', customerDataSecurityRoutes);
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
app.use('/api/social-accounts', socialAccountsRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/two-factor', twoFactorRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/whatsapp-media/cleanup', whatsappMediaCleanupRoutes);
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
app.use('/api/claude-whatsapp', claudeWhatsAppRoutes);
app.use('/api/unofficial-whatsapp', unofficialWhatsAppRoutes);
app.use('/api/cart-recovery', cartRecoveryRoutes);
app.use('/api/live-chat', liveChatRoutes);
app.use('/api/video-meetings', videoMeetingsRoutes);
app.use('/api/support-tickets', supportTicketsRoutes);
app.use('/api/voice-calls', voiceCallsRoutes);
app.use('/api/dograh/webhook', dograhWebhookRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/crm-invoices', crmInvoicesRoutes);
app.use('/api/deals', dealsRoutes);
  app.use('/api/pipelines', pipelinesRoutes);
  app.use('/api/admission', admissionRoutes);
app.use('/api/ca-copilot', caCopilotRoutes);
app.use('/api/ca-copilot', caFileCompareRoutes);
app.use('/api/lead-finder', leadFinderRoutes);
app.use('/api/outreach', aiOutreachRoutes);
app.use('/api/wl', whiteLabelRoutes);
app.use('/api/vcard', vcardRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/store-features', storeFeaturesRoutes);
app.use('/api/store-advanced', storeAdvancedRoutes);
app.use('/api/store-customize', storeCustomizeRoutes);
app.use('/api/jimi', jimiTtsRoutes);
app.use('/api/ava', avaRoutes);

// Phase 3: Admin Platform Analytics (SUPER_ADMIN only)
app.use('/api/admin', adminAnalyticsRoutes);

// Audit log retention management (SUPER_ADMIN only)
app.use('/api/admin/audit-retention', auditRetentionRoutes);

// Enterprise infrastructure management (SUPER_ADMIN only)
app.use('/api/admin/infrastructure', adminInfrastructureRoutes);

// Phase 3: Monitoring & Observability (no auth — for LB/monitoring tools)
app.use('/api', monitoringRoutes);

// Phase 4: Enterprise Data Export/Import
app.use('/api/data-export', dataExportRoutes);

// Phase 4: v2 API Routes (breaking changes with versioning)
app.use('/api/v2', v2Routes);

// Database connection pool monitoring
app.use('/api/db-pool', dbPoolRoutes);

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

// Cache stats endpoint (for monitoring)
app.get('/cache-stats', (_req, res) => {
  res.json({ success: true, data: getCacheStats() });
});

// Health check - comprehensive
app.get('/health', async (req, res) => {
  try {
    const { getHealthCheck } = await import('./utils/healthCheck.js');
    const health = await getHealthCheck();
    health.version = '12.0.1';
    (health as any).buildTime = process.env.BUILD_TIME || new Date().toISOString();
    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      version: '12.0.1',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    });
  }
});

// Liveness probe (for Kubernetes/Docker)
app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    version: '12.0.1',
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
  });
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
    // Phase 5: Environment hardening — blocks insecure production configs
    const { validateProductionEnvironment, printEnvironmentReport } = await import('./middleware/env-hardening.js');
    const hardeningResult = validateProductionEnvironment();
    printEnvironmentReport(hardeningResult);

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
    stopAuditPruneCron();
    circuitBreaker.destroy();
    await shutdownWebhookWorker();
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
    stopAuditPruneCron();
    circuitBreaker.destroy();
    await shutdownWebhookWorker();
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

// Start slow query logger
startSlowQueryLogger();

// Start audit log auto-prune cron
startAuditPruneCron();

// Start server
console.log(`Starting server on ${HOST}:${PORT} in ${NODE_ENV} mode`);
app.listen(Number(PORT), () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});

// Export authenticate middleware for use in routes
export { authenticate } from './middleware/auth.js';
export { authenticateApiKey, hashApiKey, generateApiKey } from './middleware/api-key-auth.js';
export { parsePagination, paginatedResponse } from './utils/pagination.js';

export default app;
