import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ── JWT_SECRET ──
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  const isProd = process.env.NODE_ENV === 'production';
  const msg = `CRITICAL: JWT_SECRET environment variable is not set.`;
  if (isProd) {
    console.error(msg + ' Server cannot start in production without a JWT_SECRET.');
    process.exit(1);
  }
  console.warn('WARNING: ' + msg + ' Using insecure fallback for development only!');
}
const DEV_JWT_FALLBACK = 'dev-jwt-secret-do-not-use-in-production';

// ── ENCRYPTION_KEY (AES-256) ──
// In production, this MUST be set. In dev, generate a stable fallback once at module load.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
let DEV_ENC_FALLBACK: string | undefined;
if (!ENCRYPTION_KEY) {
  const isProd = process.env.NODE_ENV === 'production';
  const msg = `CRITICAL: ENCRYPTION_KEY environment variable is not set.`;
  if (isProd) {
    console.error(msg + ' Server cannot start in production without an ENCRYPTION_KEY.');
    process.exit(1);
  }
  DEV_ENC_FALLBACK = crypto.randomBytes(32).toString('hex');
  console.warn('WARNING: ' + msg + ' Using auto-generated key for development only! Encrypted data will be lost on restart.');
}
function getEncryptionKey(): string {
  return ENCRYPTION_KEY || DEV_ENC_FALLBACK!;
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, (JWT_SECRET || DEV_JWT_FALLBACK)!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET || DEV_JWT_FALLBACK);
};

export const generateRefreshToken = (payload: object): string => {
  const secret = process.env.JWT_REFRESH_SECRET || JWT_SECRET || DEV_JWT_FALLBACK;
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'],
  });
};

// Encryption utilities for sensitive data (WhatsApp tokens, API keys)
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(getEncryptionKey(), 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(getEncryptionKey(), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}
