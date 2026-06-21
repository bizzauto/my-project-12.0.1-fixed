import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';

const router = Router();

// GET /api/surveys - List all surveys
router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const surveys = await (prisma as any).surveys.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { surveys } });
  } catch (err) {
    console.error('Get surveys error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch surveys' });
  }
});

// POST /api/surveys - Create new survey
router.post('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const { name, description, questions } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one question is required' });
    }

    const survey = await (prisma as any).surveys.create({
      data: {
        businessId,
        name,
        description: description || '',
        questions,
      },
    });
    res.status(201).json({ success: true, data: { survey } });
  } catch (err) {
    console.error('Create survey error:', err);
    res.status(500).json({ success: false, error: 'Failed to create survey' });
  }
});

// PUT /api/surveys/:id - Update survey
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const { name, description, questions, status } = req.body;

    const existing = await (prisma as any).surveys.findFirst({ where: { id: req.params.id, businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Survey not found' });

    const survey = await (prisma as any).surveys.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(questions !== undefined && { questions }),
        ...(status !== undefined && { status }),
      },
    });
    res.json({ success: true, data: { survey } });
  } catch (err) {
    console.error('Update survey error:', err);
    res.status(500).json({ success: false, error: 'Failed to update survey' });
  }
});

// DELETE /api/surveys/:id - Delete survey
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const existing = await (prisma as any).surveys.findFirst({ where: { id: req.params.id, businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Survey not found' });

    await (prisma as any).surveySubmissions.deleteMany({ where: { surveyId: req.params.id } });
    await (prisma as any).surveys.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Survey deleted' });
  } catch (err) {
    console.error('Delete survey error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete survey' });
  }
});

// POST /api/surveys/:id/submit - Submit survey response (public)
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { answers, respondent } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, error: 'Answers are required' });
    }

    const survey = await (prisma as any).surveys.findUnique({ where: { id: req.params.id } });
    if (!survey) return res.status(404).json({ success: false, error: 'Survey not found' });
    if (survey.status !== 'active') return res.status(400).json({ success: false, error: 'Survey is not accepting responses' });

    const submission = await (prisma as any).surveySubmissions.create({
      data: {
        surveyId: req.params.id,
        answers,
        respondent: respondent || null,
      },
    });

    // Update submission count and completion rate
    const totalSubmissions = await (prisma as any).surveySubmissions.count({ where: { surveyId: req.params.id } });
    await (prisma as any).surveys.update({
      where: { id: req.params.id },
      data: {
        submissionCount: totalSubmissions,
        completionRate: totalSubmissions > 0 ? (totalSubmissions / totalSubmissions) * 100 : 0,
      },
    });

    res.status(201).json({ success: true, data: { submission } });
  } catch (err) {
    console.error('Submit survey error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit survey' });
  }
});

// GET /api/surveys/:id/results - Get survey results
router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const survey = await (prisma as any).surveys.findFirst({ where: { id: req.params.id, businessId } });
    if (!survey) return res.status(404).json({ success: false, error: 'Survey not found' });

    const submissions = await (prisma as any).surveySubmissions.findMany({
      where: { surveyId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate results per question
    const results: Record<string, Record<string, number>> = {};
    const questions = survey.questions as any[];
    for (const q of questions) {
      results[q.id] = {};
    }
    for (const sub of submissions) {
      const answers = sub.answers as Record<string, any>;
      for (const [qId, answer] of Object.entries(answers)) {
        if (!results[qId]) results[qId] = {};
        const key = String(answer);
        results[qId][key] = (results[qId][key] || 0) + 1;
      }
    }

    res.json({ success: true, data: { survey, submissions, results } });
  } catch (err) {
    console.error('Get survey results error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch survey results' });
  }
});

// GET /api/surveys/public/:id - Public survey view
router.get('/public/:id', async (req: Request, res: Response) => {
  try {
    const survey = await (prisma as any).surveys.findUnique({ where: { id: req.params.id } });
    if (!survey || survey.status !== 'active') {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }
    res.json({ success: true, data: { survey } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch survey' });
  }
});

// GET /api/surveys/stats - Survey statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const surveys = await (prisma as any).surveys.findMany({ where: { businessId } });
    const totalSubmissions = surveys.reduce((a: number, b: any) => a + b.submissionCount, 0);
    const avgCompletion = surveys.length > 0
      ? surveys.reduce((a: number, b: any) => a + b.completionRate, 0) / surveys.length
      : 0;

    res.json({
      success: true,
      data: {
        total: surveys.length,
        active: surveys.filter((s: any) => s.status === 'active').length,
        totalSubmissions,
        avgCompletion: Math.round(avgCompletion),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
