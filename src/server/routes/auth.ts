import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { encrypt, decrypt } from '../utils/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, businessName, businessType, phone } = req.body;

    if (!email || !password || !businessName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and business name are required',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create business first
    const business = await prisma.business.create({
      data: {
        name: businessName,
        type: businessType || 'general',
        phone,
        plan: 'FREE',
        planStartedAt: new Date(),
        planExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days free trial
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        businessId: business.id,
        role: 'OWNER',
      },
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
        },
        business: {
          id: business.id,
          name: business.name,
          type: business.type,
          plan: business.plan,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
      details: error.message,
    });
  }
});

// Rate limiter: 5 login attempts per IP per minute
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, error: 'Too many login attempts. Please try again after a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, twoFactorToken } = req.body;
    const { TwoFactorService } = await import('../services/twoFactor.service.js');

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { business: true },
    });

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(202).json({
          success: true,
          requiresTwoFactor: true,
          userId: user.id,
          message: 'Two-factor authentication required',
        });
      }

      // Verify 2FA token
      const verified = await TwoFactorService.verifyToken(user.id, twoFactorToken);
      if (!verified) {
        return res.status(401).json({
          success: false,
          error: 'Invalid two-factor authentication code',
        });
      }
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId || 'super-admin',
      role: user.role,
    });

    // Update last login and clear CSRF token
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        business: {
          id: user.business.id,
          name: user.business.name,
          type: user.business.type,
          plan: user.business.plan,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
      details: error.message,
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { business: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          businessId: user.businessId,
        },
        business: {
          id: user.business.id,
          name: user.business.name,
          type: user.business.type,
          city: user.business.city,
          plan: user.business.plan,
          aiCreditsUsed: user.business.aiCreditsUsed,
          aiCreditsLimit: user.business.aiCreditsLimit,
        },
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      details: error.message,
    });
  }
});

// Update profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
      },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: error.message,
    });
  }
});

// Change password
router.put('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      details: error.message,
    });
  }
});

// ==================== SUPER ADMIN SEED ====================
// POST /api/auth/create-super-admin
// Usage: curl -X POST http://localhost:4000/api/auth/create-super-admin
//   -H "Content-Type: application/json"
//   -d '{"email": "admin@example.com", "password": "SuperAdmin123!", "name": "Super Admin"}'
router.post('/create-super-admin', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    // Check if super admin already exists
    const existing = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Super admin already exists',
      });
    }

    const hashedPassword = await hashPassword(password);

    const superAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || 'Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      data: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
      },
    });
  } catch (error: any) {
    console.error('Create super admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create super admin',
      details: error.message,
    });
  }
});

// In-memory OTP store with cleanup interval
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();
const OTP_RATE_LIMIT = 3; // max OTP requests per email per window
const OTP_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

// Periodic cleanup of expired OTPs (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) otpStore.delete(key);
  }
}, 5 * 60 * 1000);

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    // Rate limiting: max 3 OTP requests per email per 15 minutes
    const existing = otpStore.get(email);
    if (existing) {
      const requestsInWindow = existing.attempts;
      if (requestsInWindow >= OTP_RATE_LIMIT) {
        return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const attempts = (existing?.attempts || 0) + 1;
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts });

    // Send OTP via email (fire-and-forget)
    try {
      const { EmailService } = await import('../services/email.service.js');
      await EmailService.sendEmail(
        email,
        'Password Reset OTP - BizzAuto',
        `<h2>Password Reset</h2><p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This OTP expires in 10 minutes.</p><p>If you did not request this, please ignore this email.</p>`
      );
    } catch (emailErr: any) {
      console.error('Failed to send OTP email:', emailErr.message);
    }

    // Log the request for audit trail
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.businessId) {
        await prisma.activity.create({
          data: {
            businessId: user.businessId,
            type: 'password_reset_requested',
            title: 'Password reset requested',
            content: `OTP sent to ${email}`,
            createdBy: user.id,
          },
        });
      }
    } catch { /* audit log is non-critical */ }

    res.json({ success: true, message: 'If an account exists, an OTP has been sent' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP are required' });

    const stored = otpStore.get(email);
    if (!stored || stored.otp !== otp || stored.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, error: 'All fields are required' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });

    const stored = otpStore.get(email);
    if (!stored || stored.otp !== otp || stored.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });
    otpStore.delete(email);

    // Log successful password reset
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.businessId) {
        await prisma.activity.create({
          data: {
            businessId: user.businessId,
            type: 'password_reset_completed',
            title: 'Password reset completed',
            content: `Password reset for ${email}`,
            createdBy: user.id,
          },
        });
      }
    } catch { /* audit log is non-critical */ }

    // Send confirmation email
    try {
      const { EmailService } = await import('../services/email.service.js');
      await EmailService.sendEmail(
        email,
        'Your password has been changed - BizzAuto',
        `<h2>Password Changed</h2><p>Your password has been successfully changed.</p><p>If you did not make this change, please contact support immediately.</p>`
      );
    } catch { /* non-critical */ }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

export default router;
