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
  // Dev mode: use a file-based secret so it persists across restarts
  console.warn('WARNING: ' + msg + ' Generating persistent dev secret from hostname + project path.');
}

/**
 * Get a deterministic dev fallback for JWT_SECRET
 * Uses machine hostname + project path to generate a consistent key
 * This ensures tokens don't invalidate on restart during development
 */
function getDevJwtSecret(): string {
  const os = require('os');
  const path = require('path');
  const seed = os.hostname() + '__' + __dirname;
  // Generate a 32-char hex from the seed
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
}
const DEV_JWT_FALLBACK = getDevJwtSecret();

// ── ENCRYPTION_KEY (AES-256) ──
// In production, this MUST be set. In dev, persist to .encryption.key file so encrypted data survives restarts.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
let DEV_ENC_FALLBACK: string | undefined;

function loadOrGenerateDevEncryptionKey(): string {
  const fs = require('fs');
  const path = require('path');
  const keyFile = path.resolve(process.cwd(), '.encryption.key');

  try {
    if (fs.existsSync(keyFile)) {
      const existing = fs.readFileSync(keyFile, 'utf8').trim();
      if (existing.length === 64) {
        console.log('[Auth] Loaded existing encryption key from .encryption.key');
        return existing;
      }
      console.warn('[Auth] Existing .encryption.key is invalid, generating new one...');
    }
  } catch (e) {
    // Ignore - will generate new
  }

  const newKey = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(keyFile, newKey, 'utf8');
    console.log('[Auth] Generated new encryption key → .encryption.key (DO NOT COMMIT)');
    // Add to .gitignore if not already there
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      let gitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (!gitignore.includes('.encryption.key')) {
        fs.writeFileSync(gitignorePath, gitignore + '\n# Dev encryption key (auto-generated)\n.encryption.key\n', 'utf8');
      }
    }
  } catch (e) {
    console.warn('[Auth] Could not persist encryption key to file. Data will be lost on restart.');
  }
  return newKey;
}

if (!ENCRYPTION_KEY) {
  const isProd = process.env.NODE_ENV === 'production';
  const msg = `CRITICAL: ENCRYPTION_KEY environment variable is not set.`;
  if (isProd) {
    console.error(msg + ' Server cannot start in production without an ENCRYPTION_KEY.');
    process.exit(1);
  }
  DEV_ENC_FALLBACK = loadOrGenerateDevEncryptionKey();
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
