/**
 * Token Blacklist Service — Redis-backed JWT revocation
 * Invalidates refresh tokens on password change, logout, or security events.
 * Uses JWT ID (jti) as the key, stored in Redis with TTL matching token expiry.
 */
import { createRedisConnection } from '../utils/redis-connection.js';

const redis = createRedisConnection();

const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
const REFRESH_TOKEN_PREFIX = 'refresh:valid:';

export function blacklistToken(jti: string, expiresInMs: number): void {
  if (!redis) return;
  const key = `${TOKEN_BLACKLIST_PREFIX}${jti}`;
  const ttlSeconds = Math.ceil(expiresInMs / 1000);
  redis.setex(key, ttlSeconds, '1').catch(() => {});
}

export function isTokenBlacklisted(jti: string): boolean {
  if (!redis) return false;
  const key = `${TOKEN_BLACKLIST_PREFIX}${jti}`;
  const result = redis.get(key);
  return result !== null;
}

export async function blacklistRefreshToken(userId: string, expiresInMs: number): Promise<void> {
  if (!redis) return;
  const key = `${REFRESH_TOKEN_PREFIX}${userId}`;
  const ttlSeconds = Math.ceil(expiresInMs / 1000);
  await redis.setex(key, ttlSeconds, 'revoked').catch(() => {});
}

export async function isRefreshTokenRevoked(userId: string): Promise<boolean> {
  if (!redis) return false;
  const key = `${REFRESH_TOKEN_PREFIX}${userId}`;
  const val = await redis.get(key);
  return val === 'revoked';
}

export function revokeAllUserTokens(userId: string): void {
  if (!redis) return;
  blacklistRefreshToken(userId, 30 * 24 * 60 * 60 * 1000).catch(() => {});
}