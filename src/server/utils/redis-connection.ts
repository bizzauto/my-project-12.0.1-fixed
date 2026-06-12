import IORedis from 'ioredis';

export function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  const redisPassword = process.env.REDIS_PASSWORD;
  
  console.log(`[Redis] REDIS_URL: ${redisUrl ? 'SET' : 'NOT SET'}, REDIS_PASSWORD: ${redisPassword ? 'SET' : 'NOT SET'}`);
  
  // Method 1: Try REDIS_URL (most reliable)
  if (redisUrl) {
    console.log('[Redis] Connecting via REDIS_URL...');
    return connectToRedis(redisUrl);
  }
  
  // Method 2: Try REDIS_PASSWORD + host/port
  if (redisPassword) {
    const host = process.env.REDIS_HOST || 'coolify-redis';
    const port = process.env.REDIS_PORT || '6379';
    const url = `redis://:${redisPassword}@${host}:${port}`;
    console.log(`[Redis] Connecting via password to ${host}:${port}...`);
    return connectToRedis(url);
  }
  
  // Method 3: Try without auth (for local dev or unauthenticated Redis)
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';
  console.log(`[Redis] Connecting without auth to ${host}:${port}...`);
  return connectToRedis(`redis://${host}:${port}`);
}

function connectToRedis(url: string) {
  const client = new IORedis(url, {
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    enableOfflineQueue: false,
    connectTimeout: 5000,
    commandTimeout: 5000,
  });
  
  client.on('error', (err: any) => {
    if (err.message?.includes('NOAUTH')) {
      console.error('[Redis] AUTHENTICATION REQUIRED: Set REDIS_PASSWORD in .env or use redis://:password@host:port format in REDIS_URL');
      return;
    }
    console.error(`[Redis] Connection error: ${err.message}`);
  });
  
  client.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });
  
  return client;
}
