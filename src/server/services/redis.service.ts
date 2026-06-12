import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let isConnected = false;

export async function initRedis(): Promise<RedisClientType | null> {
  if (redisClient && isConnected) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  const password = process.env.REDIS_PASSWORD || undefined;
  
  console.log(`[Redis Service] REDIS_URL: ${redisUrl ? 'SET' : 'NOT SET'}, REDIS_PASSWORD: ${password ? 'SET' : 'NOT SET'}`);
  
  if (!redisUrl && !password) {
    console.log('[Redis Service] No credentials - skipping');
    return null;
  }

  try {
    const host = process.env.REDIS_HOST || 'coolify-redis';
    const port = process.env.REDIS_PORT || '6379';
    
    const finalUrl = redisUrl || `redis://:${password}@${host}:${port}`;
    console.log(`[Redis Service] Connecting to ${host}:${port}...`);

    redisClient = createClient({
      url: finalUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) return new Error('Redis failed');
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 5000,
        commandTimeout: 5000,
      },
    });

    redisClient.on('error', (err: any) => {
      if (err.message?.includes('NOAUTH')) {
        console.error('[Redis Service] AUTHENTICATION REQUIRED: Set REDIS_PASSWORD in .env or use redis://:password@host:port format in REDIS_URL');
        return;
      }
      console.error(`[Redis Service] Error: ${err.message}`);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis Service] Connected');
      isConnected = true;
    });

    await redisClient.connect();
    return redisClient;
  } catch (err: any) {
    console.error(`[Redis Service] Failed: ${err.message}`);
    return null;
  }
}

export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

// Cache helpers
export const cacheHelpers = {
  // Get with expiration
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    expirationSeconds: number = 300
  ): Promise<T> {
    if (!redisClient || !isConnected) {
      return callback();
    }

    try {
      const cached = await redisClient.get(key as string);
      if (cached) {
        return JSON.parse(cached as string) as T;
      }

      const data = await callback();
      if (data) {
        await redisClient.setEx(key, expirationSeconds, JSON.stringify(data));
      }
      return data;
    } catch (error) {
      console.error('Cache error:', error);
      return callback();
    }
  },

  // Invalidate pattern
  async invalidatePattern(pattern: string): Promise<void> {
    if (!redisClient || !isConnected) return;

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`🗑️ Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  },

  // User-specific cache
  async cacheUserData<T>(userId: string, key: string, data: T, ttl: number = 3600): Promise<void> {
    if (!redisClient || !isConnected) return;

    try {
      await redisClient.setEx(`user:${userId}:${key}`, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('User cache error:', error);
    }
  },

  async getUserData<T>(userId: string, key: string): Promise<T | null> {
    if (!redisClient || !isConnected) return null;

    try {
      const data = await redisClient.get(`user:${userId}:${key}` as string);
      return data ? JSON.parse(data as string) : null;
    } catch (error) {
      console.error('User cache get error:', error);
      return null;
    }
  },

  // Business-specific cache
  async cacheBusinessData<T>(businessId: string, key: string, data: T, ttl: number = 600): Promise<void> {
    if (!redisClient || !isConnected) return;

    try {
      await redisClient.setEx(`business:${businessId}:${key}`, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Business cache error:', error);
    }
  },

  async getBusinessData<T>(businessId: string, key: string): Promise<T | null> {
    if (!redisClient || !isConnected) return null;

    try {
      const data = await redisClient.get(`business:${businessId}:${key}` as string);
      return data ? JSON.parse(data as string) : null;
    } catch (error) {
      console.error('Business cache get error:', error);
      return null;
    }
  },

  // Rate limiting with Redis
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (!redisClient || !isConnected) return true;

    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      return current <= limit;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return true;
    }
  },
};

export default redisClient;