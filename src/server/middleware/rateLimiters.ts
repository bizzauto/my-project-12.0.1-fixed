import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

/**
 * Global Rate Limiter - Prevents brute force & DDoS
 * 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limit for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

/**
 * Auth Rate Limiter - Stricter for login/register
 * 10 attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

/**
 * Login Specific Rate Limiter - Very strict
 * 5 failed attempts per 30 minutes
 */
export const loginRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,
  message: {
    success: false,
    error: 'Too many failed login attempts. Your account is temporarily locked for 30 minutes.',
    code: 'LOGIN_LOCKED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' // Only limit POST (login attempts)
});

/**
 * API Rate Limiter - For public APIs
 * 30 requests per minute per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: 'Too many API requests. Please slow down.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * File Upload Rate Limiter
 * 10 uploads per hour
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'Upload limit reached. Please try again later.',
    code: 'UPLOAD_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Slow Down - Progressive rate limiting (custom implementation)
 * Adds delay per request after threshold
 */
export const speedLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

/**
 * Webhook Rate Limiter - For external webhooks
 * 100 requests per minute
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Webhook rate limit exceeded.',
    code: 'WEBHOOK_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by webhook secret if present, else IP
    return req.body?.webhookSecret || req.ip || 'unknown';
  }
});

/**
 * Password Reset Rate Limiter
 * 3 attempts per hour
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: 'Password reset limit reached. Please try again in an hour.',
    code: 'PASSWORD_RESET_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * OTP Rate Limiter
 * 5 OTP requests per 10 minutes
 */
export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'OTP request limit reached. Please try again in 10 minutes.',
    code: 'OTP_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * AI API Rate Limiter - For expensive AI calls
 * 20 requests per minute
 */
export const aiApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'AI request limit reached. Please wait.',
    code: 'AI_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Create dynamic IP-based rate limiter
 * Used for specific dangerous endpoints
 */
export const createDynamicRateLimiter = (max: number, windowMs: number) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too many requests from your IP. Please try again later.',
      code: 'DYNAMIC_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown'
  });
};