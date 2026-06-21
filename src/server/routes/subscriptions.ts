import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireBusinessOwner } from '../middleware/auth.js';
import { getUsageStats, PLAN_LIMITS } from '../middleware/planLimits.js';
import razorpayService from '../services/razorpay.service.js';
import { AutoOnboardingService } from '../services/auto-onboarding.service.js';

const router = Router();

// Get current subscription
router.get('/current', authenticate, async (req: any, res: any) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        businessId: req.user.businessId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' },
    });

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { plan: true, aiCreditsUsed: true, aiCreditsLimit: true },
    });

    res.json({
      success: true,
      data: {
        subscription,
        business,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscription', details: error.message });
  }
});

// Get usage stats for current business
router.get('/usage', authenticate, async (req: any, res: any) => {
  try {
    const stats = await getUsageStats(req.user.businessId);
    if (!stats) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch usage', details: error.message });
  }
});

// Get plan limits reference
router.get('/limits', authenticate, async (req: any, res: any) => {
  try {
    res.json({ success: true, data: PLAN_LIMITS });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch limits' });
  }
});

// Get available plans
router.get('/plans', authenticate, async (req: any, res: any) => {
  const plans = [
    {
      id: 'FREE',
      name: 'Free',
      price: { month: 0, year: 0 },
      features: [
        '100 Contacts',
        '100 WhatsApp messages/month',
        '10 AI credits',
        '1 User',
        'Basic CRM',
      ],
    },
    {
      id: 'STARTER',
      name: 'Starter',
      price: { month: 999, year: 9990 },
      features: [
        '1,000 Contacts',
        '5,000 WhatsApp messages/month',
        '100 AI credits',
        '3 Users',
        'Full CRM & Pipeline',
        'Email Support',
      ],
      popular: false,
    },
    {
      id: 'GROWTH',
      name: 'Growth',
      price: { month: 2499, year: 24990 },
      features: [
        '10,000 Contacts',
        '25,000 WhatsApp messages/month',
        '500 AI credits',
        '10 Users',
        'Advanced Analytics',
        'Priority Support',
        'Automation Workflows',
      ],
      popular: true,
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: { month: 4999, year: 49990 },
      features: [
        '50,000 Contacts',
        '100,000 WhatsApp messages/month',
        '2,000 AI credits',
        '25 Users',
        'White Label',
        'Dedicated Support',
        'Custom Integrations',
        'API Access',
      ],
    },
    {
      id: 'AGENCY',
      name: 'Agency',
      price: { month: 9999, year: 99990 },
      features: [
        'Unlimited Contacts',
        'Unlimited WhatsApp messages',
        '10,000 AI credits',
        'Unlimited Users',
        'Multi-tenant Support',
        'Custom Branding',
        'Premium Support',
        'SLA Guarantee',
      ],
    },
  ];

  res.json({ success: true, data: plans });
});

// Create Razorpay order
router.post('/checkout', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { plan, period } = req.body;

    if (!plan || !period) {
      return res.status(400).json({
        success: false,
        error: 'Plan and period are required'
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { email: true, name: true },
    });

    const result = await razorpayService.createRazorpayOrder(
      req.user.businessId,
      plan,
      period,
      business?.email || 'user@example.com'
    );

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create checkout', details: error.message });
  }
});

// Verify and activate subscription
router.post('/verify', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      period
    } = req.body;

    // Verify signature
    const isValid = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (period === 'year') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        businessId: req.user.businessId,
        plan,
        amount: razorpayService.PLAN_PRICES[plan as keyof typeof razorpayService.PLAN_PRICES]?.[period as 'month' | 'year'] || 0,
        currency: 'INR',
        interval: period,
        startDate,
        endDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        status: 'active',
        razorpaySubId: razorpay_payment_id,
      },
    });

    // Update business plan
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        plan,
        planStartedAt: startDate,
        planExpiresAt: endDate,
        razorpaySubId: razorpay_payment_id,
      },
    });

    res.json({
      success: true,
      data: { subscription }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to verify payment', details: error.message });
  }
});

// Cancel subscription
router.post('/cancel', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { reason } = req.body;

    const subscription = await prisma.subscription.findFirst({
      where: {
        businessId: req.user.businessId,
        status: 'active'
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Cancel in Razorpay (if applicable)
    if (subscription.razorpaySubId) {
      await razorpayService.cancelSubscription(subscription.razorpaySubId);
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: req.user.id,
      },
    });

    // Downgrade to FREE plan
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        plan: 'FREE',
      },
    });

    res.json({
      success: true,
      data: { message: 'Subscription cancelled successfully' }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to cancel subscription', details: error.message });
  }
});

// Webhook handler for Razorpay events
router.post('/webhook', async (req: any, res: any) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify webhook signature
    const crypto = await import('crypto');
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // Find subscription by order ID
    const subscription = await prisma.subscription.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          razorpayPaymentId: razorpay_payment_id,
        },
      });

      // Trigger auto-onboarding
      try {
        const { AutoOnboardingService } = await import('../services/auto-onboarding.service.js');
        const business = await prisma.business.findUnique({
          where: { id: subscription.businessId },
        });

        await AutoOnboardingService.processPayment({
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          amount: subscription.amount,
          currency: subscription.currency || 'INR',
          contactName: business?.name,
          contactEmail: business?.email,
          contactPhone: business?.phone,
          planName: subscription.plan,
          metadata: { businessId: subscription.businessId },
        });
        console.log(`[Webhook] Auto-onboarding triggered for ${subscription.businessId}`);
      } catch (onboardingError: any) {
        console.error(`[Webhook] Auto-onboarding error:`, onboardingError.message);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual onboarding trigger
router.post('/onboard', authenticate, async (req: any, res: any) => {
  try {
    const { contactId, amount, planName, paymentId } = req.body;

    if (!contactId) {
      return res.status(400).json({ success: false, error: 'contactId is required' });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const result = await AutoOnboardingService.processPayment({
      razorpayPaymentId: paymentId || `manual_${Date.now()}`,
      razorpayOrderId: `order_${Date.now()}`,
      amount: (amount || 0) * 100,
      currency: 'INR',
      contactEmail: contact.email || undefined,
      contactPhone: contact.phone || undefined,
      contactName: contact.name,
      planName: planName || 'Custom Plan',
      metadata: { businessId: req.user.businessId },
    });

    res.json(result);
  } catch (error: any) {
    console.error('Onboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get invoices
router.get('/invoices', authenticate, async (req: any, res: any) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { businessId: req.user.businessId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where: { businessId: req.user.businessId } }),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upgrade subscription
router.post('/upgrade', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({ success: false, error: 'Plan is required' });
    }

    // Get current subscription
    const current = await prisma.subscription.findFirst({
      where: { businessId: req.user.businessId, status: 'active' },
    });

    if (current) {
      // Cancel current subscription
      await prisma.subscription.update({
        where: { id: current.id },
        data: { status: 'cancelled' },
      });
    }

    // Create new subscription
    const subscription = await prisma.subscription.create({
      data: {
        business: { connect: { id: req.user.businessId } },
        plan,
        status: 'pending',
        amount: getPlanAmount(plan),
        startDate: new Date(),
        interval: 'monthly',
      },
    });

    res.json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change payment method
router.put('/payment-method', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { paymentMethodId } = req.body;

    // Update the active subscription's payment method
    const subscription = await prisma.subscription.findFirst({
      where: { businessId: req.user.businessId, status: 'active' },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { paymentMethodId },
      });
    }

    res.json({ success: true, message: 'Payment method updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// MRR/ARR Analytics (Super Admin only)
router.get('/analytics/revenue', authenticate, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      currentMonthSubs,
      prevMonthSubs,
      totalActive,
      allSubs,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: 'active', currentPeriodStart: { gte: startOfMonth } },
        select: { amount: true, plan: true, interval: true },
      }),
      prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodStart: { gte: startOfPrevMonth, lt: startOfMonth },
        },
        select: { amount: true, plan: true, interval: true },
      }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.findMany({
        where: { status: { in: ['active', 'cancelled'] } },
        select: { amount: true, plan: true, interval: true, status: true, createdAt: true },
      }),
    ]);

    // Calculate MRR from all active subscriptions (normalize yearly to monthly)
    const calculateMRR = (subs: any[]) =>
      subs.reduce((sum, s) => {
        if (s.interval === 'year') return sum + (s.amount || 0) / 12;
        return sum + (s.amount || 0);
      }, 0);

    const currentMRR = calculateMRR(currentMonthSubs);
    const prevMRR = calculateMRR(prevMonthSubs);
    const ARR = currentMRR * 12;
    const mrrGrowth = prevMRR > 0 ? ((currentMRR - prevMRR) / prevMRR) * 100 : 0;

    // Churn rate
    const cancelledThisMonth = allSubs.filter(
      (s) => s.status === 'cancelled' && (s as any).cancelledAt >= startOfMonth
    ).length;
    const churnRate = totalActive > 0 ? (cancelledThisMonth / totalActive) * 100 : 0;

    // Revenue by plan
    const revenueByPlan: Record<string, number> = {};
    for (const sub of allSubs.filter((s) => s.status === 'active')) {
      revenueByPlan[sub.plan] = (revenueByPlan[sub.plan] || 0) + (sub.amount || 0);
    }

    res.json({
      success: true,
      data: {
        mrr: Math.round(currentMRR * 100) / 100,
        arr: Math.round(ARR * 100) / 100,
        mrrGrowth: Math.round(mrrGrowth * 100) / 100,
        activeSubscriptions: totalActive,
        churnRate: Math.round(churnRate * 100) / 100,
        revenueByPlan,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getPlanAmount(plan: string): number {
  const amounts: Record<string, number> = {
    starter: 499,
    professional: 1499,
    enterprise: 4999,
  };
  return amounts[plan] || 499;
}

export default router;
