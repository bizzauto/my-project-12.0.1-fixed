import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import { validate } from '../middleware/validate.js';
import { updateDealStageSchema, updateDealSchema } from '../validations/crm-schemas.js';

const router = Router();

// GET /api/deals - List all deals (contacts with deal info)
router.get('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { page = 1, limit = 50, stage, pipelineId, search } = req.query;
    const businessId = req.user.businessId;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId,
      OR: [
        { dealValue: { gt: 0 } },
        { dealStage: { not: null } },
        { pipelineId: { not: null } },
        { stageId: { not: null } },
      ],
    };

    if (stage) {
      where.dealStage = stage as string;
    }
    if (pipelineId) {
      where.pipelineId = pipelineId as string;
    }
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
            { company: { contains: search as string, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          company: true,
          dealValue: true,
          dealStage: true,
          pipelineId: true,
          stageId: true,
          stage: true,
          tags: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          pipeline: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    // Map contacts to Deal format for the frontend
    const deals = contacts.map((c) => ({
      id: c.id,
      contactId: c.id,
      contactName: c.name,
      title: c.dealStage
        ? `${c.name} - ${c.dealStage}`
        : c.name,
      value: c.dealValue || 0,
      stage: c.dealStage || c.stage || 'New Lead',
      stageId: c.stageId,
      pipelineId: c.pipelineId,
      probability: getProbability(c.dealStage || c.stage),
      expectedClose: getExpectedClose(c.dealStage || c.stage),
      createdAt: c.createdAt.toISOString(),
      contact: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        company: c.company,
        tags: c.tags,
        source: c.source,
      },
    }));

    res.json({
      success: true,
      data: {
        deals,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get deals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deals', details: error.message });
  }
});

// GET /api/deals/stats - Get deal statistics
router.get('/stats', authenticate, cacheResponse(30), async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;

    const contacts = await prisma.contact.findMany({
      where: {
        businessId,
        OR: [
          { dealValue: { gt: 0 } },
          { dealStage: { not: null } },
        ],
      },
      select: { dealValue: true, dealStage: true, stage: true },
    });

    const totalDealValue = contacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
    const wonDeals = contacts
      .filter((c) => c.dealStage === 'Closed Won' || c.dealStage === 'Won' || c.stage === 'Won')
      .reduce((sum, c) => sum + (c.dealValue || 0), 0);
    const activeDeals = contacts.filter(
      (c) => c.dealStage && !['Closed Won', 'Closed Lost', 'Won', 'Lost'].includes(c.dealStage)
    ).length;

    // Pipeline distribution
    const pipelineMap = new Map<string, { count: number; value: number }>();
    for (const c of contacts) {
      const stage = c.dealStage || c.stage || 'Unknown';
      const existing = pipelineMap.get(stage) || { count: 0, value: 0 };
      pipelineMap.set(stage, {
        count: existing.count + 1,
        value: existing.value + (c.dealValue || 0),
      });
    }

    const pipeline = Array.from(pipelineMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      value: data.value,
    }));

    res.json({
      success: true,
      data: { totalDealValue, wonDeals, activeDeals, totalDeals: contacts.length, pipeline },
    });
  } catch (error: any) {
    console.error('Get deal stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deal stats', details: error.message });
  }
});

// PUT /api/deals/:id/stage - Update deal stage (for drag-and-drop)
router.put('/:id/stage', authenticate, validate(updateDealStageSchema), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const { stage, stageId, pipelineId } = req.body;
    const businessId = req.user.businessId;

    const contact = await prisma.contact.findFirst({
      where: { id, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact/deal not found' });
    }

    const oldStage = contact.dealStage || contact.stage;

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(stage !== undefined && { dealStage: stage, stage }),
        ...(stageId !== undefined && { stageId }),
        ...(pipelineId !== undefined && { pipelineId }),
      },
      select: {
        id: true, name: true, dealValue: true, dealStage: true, stage: true,
        stageId: true, pipelineId: true,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        businessId,
        contactId: id,
        type: 'deal_stage_changed',
        title: 'Deal stage changed',
        description: `Stage changed from "${oldStage || 'None'}" to "${stage || updated.dealStage || updated.stage}"`,
        stageFrom: oldStage || undefined,
        stageTo: stage || updated.dealStage || updated.stage || undefined,
        dealValue: updated.dealValue || undefined,
        createdBy: req.user.id,
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        stage: updated.dealStage || updated.stage,
        stageId: updated.stageId,
        pipelineId: updated.pipelineId,
      },
    });
  } catch (error: any) {
    console.error('Update deal stage error:', error);
    res.status(500).json({ success: false, error: 'Failed to update deal stage', details: error.message });
  }
});

// PUT /api/deals/:id - Update deal value/details
router.put('/:id', authenticate, validate(updateDealSchema), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const { dealValue, dealStage, stage, stageId, pipelineId } = req.body;
    const businessId = req.user.businessId;

    const contact = await prisma.contact.findFirst({
      where: { id, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact/deal not found' });
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(dealValue !== undefined && { dealValue: parseFloat(dealValue) }),
        ...(dealStage !== undefined && { dealStage }),
        ...(stage !== undefined && { stage }),
        ...(stageId !== undefined && { stageId }),
        ...(pipelineId !== undefined && { pipelineId }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update deal error:', error);
    res.status(500).json({ success: false, error: 'Failed to update deal', details: error.message });
  }
});

function getProbability(stage: string | null | undefined): number {
  switch (stage) {
    case 'New Lead': return 10;
    case 'Contacted': return 25;
    case 'Qualified': return 50;
    case 'Proposal': return 65;
    case 'Negotiation': return 80;
    case 'Won': case 'Closed Won': return 100;
    case 'Lost': case 'Closed Lost': return 0;
    default: return 20;
  }
}

function getExpectedClose(stage: string | null | undefined): string {
  const now = new Date();
  switch (stage) {
    case 'New Lead':
      now.setDate(now.getDate() + 30);
      break;
    case 'Contacted':
      now.setDate(now.getDate() + 21);
      break;
    case 'Qualified':
      now.setDate(now.getDate() + 14);
      break;
    case 'Proposal':
      now.setDate(now.getDate() + 10);
      break;
    case 'Negotiation':
      now.setDate(now.getDate() + 5);
      break;
    default:
      now.setDate(now.getDate() + 30);
  }
  return now.toISOString().split('T')[0];
}

export default router;
