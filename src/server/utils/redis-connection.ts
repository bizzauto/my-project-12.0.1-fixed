import IORedis from 'ioredis';

export function createRedisConnection() {
  if (process.env.REDIS_URL) {
    const client = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: false,
    });
    client.on('error', (err: any) => {
      if (err?.message?.includes('NOAUTH') || err?.message?.includes('WRONGPASS')) {
        console.warn('Redis auth failed — running without Redis cache/queue. Set REDIS_PASSWORD env var to fix.');
      }
    });
    return client;
  }
  const client = new IORedis({
    host: process.env.REDIS_HOST || 'coolify-redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    enableOfflineQueue: false,
  });
  client.on('error', (err: any) => {
    if (err?.message?.includes('NOAUTH') || err?.message?.includes('WRONGPASS')) {
      console.warn('Redis auth failed — running without Redis cache/queue. Set REDIS_PASSWORD env var to fix.');
    }
  });
  return client;
}
