import IORedis from 'ioredis';

export function createRedisConnection() {
  // If REDIS_URL is provided, use it directly (most reliable for Coolify)
  const redisUrl = process.env.REDIS_URL;
  const redisPassword = process.env.REDIS_PASSWORD;
  
  console.log('Redis: REDIS_URL present =', !!redisUrl, ', REDIS_PASSWORD present =', !!redisPassword);
  
  if (redisUrl) {
    console.log('Redis: Connecting via REDIS_URL...');
    const client = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: false,
    });
    client.on('error', (err: any) => {
      if (err?.message?.includes('NOAUTH') || err?.message?.includes('WRONGPASS')) {
        console.warn('Redis: Auth failed with REDIS_URL');
      }
    });
    return client;
  }
  
  if (redisPassword) {
    console.log('Redis: Connecting via REDIS_PASSWORD...');
    const client = new IORedis({
      host: process.env.REDIS_HOST || 'coolify-redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: redisPassword,
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: false,
    });
    return client;
  }
  
  console.log('Redis: No credentials found, connecting without auth');
  const client = new IORedis({
    host: process.env.REDIS_HOST || 'coolify-redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    enableOfflineQueue: false,
  });
  return client;
}
