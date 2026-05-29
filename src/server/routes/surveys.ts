import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Static-path routes (must come before /:id) ───

/**
 * PUT /api/surveys/questions/reorder
 * Reorder questions within a survey
 */
router.put('/questions/reorder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { surveyId, questionIds } = req.body;

    if (!surveyId || !Array.isArray(questionIds)) {
      return res.status(400).json({ success: false, error: 'surveyId and questionIds array are required' });
    }

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, businessId: req.user.businessId },
    });
    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const updates = questionIds.map((id: string, index: number) =>
      prisma.surveyQuestion.update({
        where: { id },
        data: { order: index },
      })
    );

    await prisma.$transaction(updates);

    res.json({ success: true, message: 'Questions reordered' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to reorder questions', details: error.message });
  }
});

/**
 * PUT /api/surveys/questions/:questionId
 * Update a single question
 */
router.put('/questions/:questionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const { label, placeholder, required, options, validation, conditionalLogic, type, width, order } = req.body;

    const question = await prisma.surveyQuestion.findUnique({
      where: { id: questionId },
      include: { survey: true },
    });

    if (!question || question.survey.businessId !== req.user.businessId) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const updated = await prisma.surveyQuestion.update({
      where: { id: questionId },
      data: {
        ...(label !== undefined && { label }),
        ...(placeholder !== undefined && { placeholder }),
        ...(required !== undefined && { required }),
        ...(options !== undefined && { options }),
        ...(validation !== undefined && { validation }),
        ...(conditionalLogic !== undefined && { conditionalLogic }),
        ...(type !== undefined && { type }),
        ...(width !== undefined && { width }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update question', details: error.message });
  }
});

/**
 * DELETE /api/surveys/questions/:questionId
 * Delete a single question
 */
router.delete('/questions/:questionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;

    const question = await prisma.surveyQuestion.findUnique({
      where: { id: questionId },
      include: { survey: true },
    });

    if (!question || question.survey.businessId !== req.user.businessId) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    await prisma.surveyQuestion.delete({ where: { id: questionId } });

    res.json({ success: true, message: 'Question deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete question', details: error.message });
  }
});

// ─── CRUD /:id routes ───

/**
 * GET /api/surveys
 * List surveys (paginated)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type, search, isActive, isPublished } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { businessId: req.user.businessId };
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [surveys, total] = await Promise.all([
      prisma.survey.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { questions: true, responses: true } } },
      }),
      prisma.survey.count({ where }),
    ]);

    res.json({
      success: true,
      data: surveys,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch surveys', details: error.message });
  }
});

/**
 * GET /api/surveys/:id
 * Get survey with questions
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    res.json({ success: true, data: survey });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch survey', details: error.message });
  }
});

/**
 * POST /api/surveys
 * Create survey
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, type, settings, thankYouMessage, thankYouRedirect } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const survey = await prisma.survey.create({
      data: {
        businessId: req.user.businessId,
        name,
        description,
        type: type || 'form',
        settings: settings || {},
        thankYouMessage,
        thankYouRedirect,
      },
    });

    res.status(201).json({ success: true, data: survey });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create survey', details: error.message });
  }
});

/**
 * PUT /api/surveys/:id
 * Update survey
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const { name, description, type, settings, thankYouMessage, thankYouRedirect, isActive } = req.body;

    const updated = await prisma.survey.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(settings !== undefined && { settings }),
        ...(thankYouMessage !== undefined && { thankYouMessage }),
        ...(thankYouRedirect !== undefined && { thankYouRedirect }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update survey', details: error.message });
  }
});

/**
 * DELETE /api/surveys/:id
 * Delete survey and all related questions/responses
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    await prisma.survey.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Survey deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete survey', details: error.message });
  }
});

/**
 * POST /api/surveys/:id/questions
 * Add a question to a survey
 */
router.post('/:id/questions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const { type, label, placeholder, required, options, validation, conditionalLogic, width } = req.body;

    if (!type || !label) {
      return res.status(400).json({ success: false, error: 'type and label are required' });
    }

    const maxOrder = await prisma.surveyQuestion.aggregate({
      where: { surveyId: req.params.id },
      _max: { order: true },
    });

    const question = await prisma.surveyQuestion.create({
      data: {
        surveyId: req.params.id,
        type,
        label,
        placeholder,
        required: required || false,
        options: options || null,
        validation: validation || null,
        conditionalLogic: conditionalLogic || null,
        width: width || 'full',
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    res.status(201).json({ success: true, data: question });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to add question', details: error.message });
  }
});

/**
 * GET /api/surveys/:id/responses
 * Get paginated responses for a survey
 */
router.get('/:id/responses', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { surveyId: req.params.id };
    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate as string);
      if (endDate) where.submittedAt.lte = new Date(endDate as string);
    }

    const [responses, total] = await Promise.all([
      prisma.surveyResponse.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.surveyResponse.count({ where }),
    ]);

    res.json({
      success: true,
      data: responses,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch responses', details: error.message });
  }
});

/**
 * GET /api/surveys/:id/responses/export
 * Export survey responses as CSV
 */
router.get('/:id/responses/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: req.params.id },
      orderBy: { submittedAt: 'desc' },
      take: 10000,
    });

    const questionMap = new Map(survey.questions.map((q) => [q.id, q.label]));
    const headers = ['Submitted At', 'IP Address', ...survey.questions.map((q) => q.label)];
    const rows = responses.map((r: any) => {
      const answers = (r.answers as Record<string, any>) || {};
      return [
        r.submittedAt.toISOString(),
        r.ipAddress || '',
        ...survey.questions.map((q) => {
          const val = answers[q.id];
          if (Array.isArray(val)) return val.join('; ');
          return val !== undefined && val !== null ? String(val) : '';
        }),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${survey.name.replace(/"/g, '""')}_responses.csv"`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to export responses', details: error.message });
  }
});

/**
 * GET /api/surveys/:id/stats
 * Get submission statistics for a survey
 */
router.get('/:id/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: { questions: true },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const [totalResponses, recentResponses, responsesByDay] = await Promise.all([
      prisma.surveyResponse.count({ where: { surveyId: req.params.id } }),
      prisma.surveyResponse.count({
        where: { surveyId: req.params.id, submittedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.surveyResponse.findMany({
        where: { surveyId: req.params.id },
        select: { submittedAt: true },
        orderBy: { submittedAt: 'desc' },
        take: 1000,
      }),
    ]);

    const dailyMap = new Map<string, number>();
    for (const r of responsesByDay) {
      const day = r.submittedAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }
    const responsesByDayAggregated = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        totalResponses,
        recentResponses,
        submissionCount: survey.submissionCount,
        responsesByDay: responsesByDayAggregated,
        questionCount: survey.questions.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats', details: error.message });
  }
});

/**
 * PATCH /api/surveys/:id/publish
 * Toggle published status
 */
router.patch('/:id/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const updated = await prisma.survey.update({
      where: { id: req.params.id },
      data: { isPublished: !survey.isPublished },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to toggle publish', details: error.message });
  }
});

/**
 * POST /api/surveys/:id/submit
 * Public submission endpoint (no auth, rate limited)
 */
router.post('/:id/submit', submitLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { answers, contactId, metadata } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, error: 'Answers object is required' });
    }

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: { questions: true },
    });

    if (!survey || !survey.isPublished || !survey.isActive) {
      return res.status(404).json({ success: false, error: 'Survey not found or not accepting responses' });
    }

    // Validate required questions
    const missingRequired = survey.questions.filter((q) => q.required && !answers[q.id]);
    if (missingRequired.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        fields: missingRequired.map((q) => q.id),
      });
    }

    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: id,
        businessId: survey.businessId,
        contactId: contactId || null,
        answers,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        metadata: metadata || null,
      },
    });

    await prisma.survey.update({
      where: { id },
      data: { submissionCount: { increment: 1 } },
    });

    res.status(201).json({
      success: true,
      data: {
        id: response.id,
        submittedAt: response.submittedAt,
        thankYouMessage: survey.thankYouMessage,
        thankYouRedirect: survey.thankYouRedirect,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to submit response', details: error.message });
  }
});

export default router;
