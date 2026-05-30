import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import { IndiaMARTEmailService } from '../services/indiamart-email.service.js';
import { EmailLeadService, Platform } from '../services/email-lead.service.js';
import { encrypt, decrypt } from '../utils/auth.js';

const router = Router();

/**
 * POST /api/indiamart/setup
 * Configure IndiaMART email settings for a business
 */
router.post('/setup', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const {
      imapHost,
      imapPort,
      email,
      password,
      useSSL = true,
      spreadsheetId,
      autoSync = false,
      syncInterval = 60, // minutes
    } = req.body;

    if (!imapHost || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'IMAP host, email, and password are required',
      });
    }

    // Clean password - remove spaces (Gmail App Passwords have spaces)
    const cleanPassword = password.replace(/\s/g, '');

    // Save email config (encrypted)
    const emailConfig = {
      imapHost,
      imapPort: imapPort || 993,
      email,
      password: encrypt(cleanPassword),
      useSSL,
      spreadsheetId,
      autoSync,
      syncInterval,
      lastSyncAt: null,
    };

    // Remove old integration first, then create new one
    await prisma.integration.deleteMany({
      where: { businessId, type: 'indiamart_email' },
    });

    const integration = await prisma.integration.create({
      data: {
        businessId,
        type: 'indiamart_email',
        name: 'IndiaMART Email Integration',
        config: emailConfig as any,
        isActive: true,
      },
    });

    res.json({
      success: true,
      message: 'IndiaMART email integration configured',
      data: {
        id: integration.id,
        email,
        imapHost,
        imapPort: imapPort || 993,
        autoSync,
        syncInterval,
      },
    });
  } catch (error: any) {
    console.error('IndiaMART setup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/indiamart/config
 * Get current IndiaMART email configuration (without password)
 */
router.get('/config', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email' },
    });

    if (!integration) {
      return res.json({
        success: true,
        data: {
          configured: false,
          email: null,
          imapHost: null,
          autoSync: false,
        },
      });
    }

    const config = integration.config as any;

    res.json({
      success: true,
      data: {
        configured: true,
        email: config.email,
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        useSSL: config.useSSL,
        spreadsheetId: config.spreadsheetId,
        autoSync: config.autoSync || false,
        syncInterval: config.syncInterval || 60,
        lastSyncAt: config.lastSyncAt,
        isActive: integration.isActive,
      },
    });
  } catch (error: any) {
    console.error('Get config error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/indiamart-email/sync
 * Sync leads from email - supports indiamart, justdial, tradeindia
 */
router.post('/sync', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { since, days = 30, platform = 'indiamart' } = req.body;

    // Get platform-specific integration
    const integrationType = `email_${platform}`;
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: integrationType, isActive: true },
    });

    // Fallback to indiamart_email for backward compatibility
    const fallbackIntegration = !integration ? await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email', isActive: true },
    }) : null;

    const activeIntegration = integration || fallbackIntegration;

    if (!activeIntegration) {
      return res.status(400).json({
        success: false,
        error: `${EmailLeadService.getPlatformName(platform as Platform)} email not configured. Please setup first.`,
      });
    }

    const config = activeIntegration.config as any;
    const emailConfig = {
      imapHost: config.imapHost,
      imapPort: config.imapPort,
      email: config.email,
      password: decrypt(config.password),
      useSSL: config.useSSL,
    };

    let sinceDate: Date;
    if (since) {
      sinceDate = new Date(since);
    } else {
      sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    console.log(`[EmailLead] Sync: platform=${platform}, since=${sinceDate.toISOString()}`);

    const result = await EmailLeadService.processEmails(
      businessId,
      emailConfig,
      platform as Platform,
      {
        since: sinceDate,
        saveToSheet: !!config.spreadsheetId,
        spreadsheetId: config.spreadsheetId,
      }
    );

    // Update last sync time
    await prisma.integration.update({
      where: { id: activeIntegration.id },
      data: {
        config: {
          ...config,
          lastSyncAt: new Date().toISOString(),
        } as any,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        businessId,
        type: 'indiamart_sync',
        title: 'IndiaMART Email Sync',
        content: `Processed ${result.processed} emails, captured ${result.newLeads} new leads`,
        metadata: result,
        createdBy: 'system',
      },
    });

    res.json({
      success: true,
      message: `Synced ${result.newLeads} new leads from ${result.processed} emails`,
      data: result,
    });
  } catch (error: any) {
    console.error('IndiaMART sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check email credentials and IMAP settings',
    });
  }
});

/**
 * POST /api/indiamart-email/test-connection
 * Test IMAP connection for any platform
 */
router.post('/test-connection', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { platform = 'indiamart' } = req.body;

    const integrationType = `email_${platform}`;
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: integrationType, isActive: true },
    });

    const fallbackIntegration = !integration ? await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email', isActive: true },
    }) : null;

    const activeIntegration = integration || fallbackIntegration;

    if (!activeIntegration) {
      return res.status(400).json({
        success: false,
        error: `${EmailLeadService.getPlatformName(platform as Platform)} email not configured.`,
      });
    }

    const config = activeIntegration.config as any;
    const emailConfig = {
      imapHost: config.imapHost,
      imapPort: config.imapPort,
      email: config.email,
      password: decrypt(config.password),
      useSSL: config.useSSL,
    };

    const testResult = await EmailLeadService.testConnection(emailConfig, platform as Platform);

    res.json({
      success: true,
      message: `${EmailLeadService.getPlatformName(platform as Platform)} IMAP connection successful`,
      data: {
        ...testResult,
        email: emailConfig.email,
        host: emailConfig.imapHost,
        platform,
      },
    });
  } catch (error: any) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check IMAP host, port, email and password. For Gmail, use App Password.',
    });
  }
});

/**
 * GET /api/indiamart-email/debug
 * Debug IMAP configuration (shows settings without password)
 */
router.get('/debug', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email' },
    });

    if (!integration) {
      return res.json({
        success: true,
        data: { configured: false, message: 'No IndiaMART email integration found' },
      });
    }

    const config = integration.config as any;

    res.json({
      success: true,
      data: {
        configured: true,
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        email: config.email,
        useSSL: config.useSSL,
        passwordLength: config.password ? decrypt(config.password).length : 0,
        passwordPreview: config.password ? decrypt(config.password).substring(0, 4) + '****' : 'N/A',
        autoSync: config.autoSync,
        lastSyncAt: config.lastSyncAt,
        isActive: integration.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/indiamart/leads
 * Get leads captured from IndiaMART emails
 */
router.get('/leads', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { page = 1, limit = 20, since } = req.query;

    const where: any = {
      businessId,
      source: 'indiamart',
    };

    if (since) {
      where.createdAt = { gte: new Date(since as string) };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [leads, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          company: true,
          source: true,
          tags: true,
          createdAt: true,
          metadata: true,
        },
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Get IndiaMART leads error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/indiamart/disconnect
 * Remove IndiaMART email integration
 */
router.delete('/disconnect', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;

    await prisma.integration.deleteMany({
      where: { businessId, type: 'indiamart_email' },
    });

    res.json({
      success: true,
      message: 'IndiaMART email integration removed',
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/indiamart/connect
 * Test email connection
 */
router.post('/connect', authenticate, async (req: any, res: Response) => {
  try {
    const { imapHost, imapPort, email, password, useSSL = true } = req.body;

    if (!imapHost || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'IMAP host, email, and password are required',
      });
    }

    // Test connection
    const Imap = (await import('imap')).default as any;
    const imap = new Imap({
      user: email,
      password: password,
      host: imapHost,
      port: imapPort || 993,
      tls: useSSL,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
    });

    return new Promise<void>((resolve) => {
      imap.once('ready', () => {
        imap.getBoxes((err, boxes) => {
          imap.end();
          if (err) {
            res.json({
              success: false,
              error: `Connection failed: ${err.message}`,
            });
          } else {
            res.json({
              success: true,
              message: 'Connection successful!',
              folders: Object.keys(boxes || {}),
            });
          }
          resolve();
        });
      });

      imap.once('error', (err) => {
        res.json({
          success: false,
          error: `Connection failed: ${err.message}`,
        });
        resolve();
      });

      imap.connect();
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: `Connection test failed: ${error.message}`,
    });
  }
});

export default router; 