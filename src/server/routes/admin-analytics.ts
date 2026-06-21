import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Admin Platform Analytics API
 * Provides platform-wide metrics for super admins.
 * All endpoints require SUPER_ADMIN role.
 */

// GET /api/admin/analytics — Platform-wide analytics overview
router.get('/analytics', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: any) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const seventyDaysAgo = new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000);

    const [
      totalBusinesses,
      activeBusinesses,
      newBusinesses30d,
      previousBusinesses30d,
      totalUsers,
      newUsers30d,
      totalContacts,
      totalMessages,
      messages30d,
      previousMessages30d,
      planDistribution,
      activeSubscriptions,
      totalRevenue,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { users: { some: { isActive: true } } } }),
      prisma.business.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.business.count({ where: { createdAt: { gte: seventyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.contact.count(),
      prisma.message.count(),
      prisma.message.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.message.count({ where: { createdAt: { gte: seventyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.business.groupBy({ by: ['plan'], _count: true }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.aggregate({ where: { status: 'active' }, _sum: { amount: true } }),
    ]);

    const businessesGrowth = previousBusinesses30d > 0
      ? ((newBusinesses30d - previousBusinesses30d) / previousBusinesses30d) * 100
      : 0;
    const messagesGrowth = previousMessages30d > 0
      ? ((messages30d - previousMessages30d) / previousMessages30d) * 100
      : 0;

    const plans: Record<string, number> = {};
    for (const p of planDistribution) {
      plans[p.plan] = p._count;
    }

    res.json({
      success: true,
      data: {
        businesses: {
          total: totalBusinesses,
          active: activeBusinesses,
          new30d: newBusinesses30d,
          growth: Math.round(businessesGrowth * 100) / 100,
        },
        users: {
          total: totalUsers,
          new30d: newUsers30d,
        },
        contacts: { total: totalContacts },
        messages: {
          total: totalMessages,
          last30d: messages30d,
          growth: Math.round(messagesGrowth * 100) / 100,
        },
        plans,
        subscriptions: {
          active: activeSubscriptions,
          mrr: (totalRevenue._sum.amount || 0) / 100,
          arr: ((totalRevenue._sum.amount || 0) / 100) * 12,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/feature-flags — Feature flags (simple DB-backed)
router.get('/feature-flags', authenticate, requireRole('SUPER_ADMIN'), async (_req: AuthRequest, res: any) => {
  try {
    // Feature flags are read from env variables for simplicity
    const flags = {
      aiCreativeStudio: process.env.FF_AI_CREATIVE !== 'false',
      voiceCalls: process.env.FF_VOICE_CALLS !== 'false',
      workflowBuilder: process.env.FF_WORKFLOWS !== 'false',
      funnelBuilder: process.env.FF_FUNNELS !== 'false',
      courseBuilder: process.env.FF_COURSES !== 'false',
      liveChat: process.env.FF_LIVE_CHAT !== 'false',
      cartRecovery: process.env.FF_CART_RECOVERY !== 'false',
      referrals: process.env.FF_REFERRALS !== 'false',
      loyaltyProgram: process.env.FF_LOYALTY !== 'false',
      betaFeatures: process.env.FF_BETA === 'true',
    };

    res.json({ success: true, data: flags });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/audit-log — Admin audit log with filtering
router.get('/audit-log', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: any) => {
  try {
    const { page = '1', limit = '50', action, entity, businessId, startDate, endDate } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (businessId) where.businessId = businessId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/businesses — List all businesses for admin
router.get('/businesses', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: any) => {
  try {
    const { page = '1', limit = '50', plan, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (plan) where.plan = plan;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, contacts: true } },
        },
      }),
      prisma.business.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        businesses,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
