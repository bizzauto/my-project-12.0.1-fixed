import IORedis from 'ioredis';

let redisDisabled = false;

export function createRedisConnection() {
  if (redisDisabled) return null;

  const redisUrl = process.env.REDIS_URL;
  const redisPassword = process.env.REDIS_PASSWORD;

  console.log(`[Redis] REDIS_URL: ${redisUrl ? 'SET' : 'NOT SET'}, REDIS_PASSWORD: ${redisPassword ? 'SET' : 'NOT SET'}`);

  if (!redisUrl && !redisPassword) {
    console.log('[Redis] No credentials configured — Redis disabled');
    redisDisabled = true;
    return null;
  }

  if (redisUrl) {
    const hasAuth = redisUrl.includes('@');
    if (!hasAuth) {
      console.log('[Redis] REDIS_URL has no password — treating as no auth. Redis disabled.');
      redisDisabled = true;
      return null;
    }
    console.log('[Redis] Connecting via REDIS_URL...');
    return connectToRedis(redisUrl);
  }

  if (redisPassword) {
    const host = process.env.REDIS_HOST || 'coolify-redis';
    const port = process.env.REDIS_PORT || '6379';
    const url = `redis://:${redisPassword}@${host}:${port}`;
    console.log(`[Redis] Connecting via password to ${host}:${port}...`);
    return connectToRedis(url);
  }

  return null;
}

function connectToRedis(url: string) {
  const client = new IORedis(url, {
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (redisDisabled || times > 2) return null;
      return Math.min(times * 200, 2000);
    },
    enableOfflineQueue: false,
    connectTimeout: 3000,
    commandTimeout: 3000,
    lazyConnect: true,
  });

  client.on('error', (err: any) => {
    if (err.message?.includes('NOAUTH') || err.message?.includes('AUTH')) {
      console.error('[Redis] NOAUTH — credentials rejected. Redis permanently disabled.');
      redisDisabled = true;
      try { client.destroy(); } catch {}
      return;
    }
    console.error(`[Redis] Connection error: ${err.message}`);
  });

  client.on('connect', () => {
    console.log('[Redis] TCP connected, waiting for ready...');
  });

  client.on('ready', () => {
    console.log('[Redis] Connected successfully');
  });

  client.connect().catch((err: any) => {
    if (err.message?.includes('NOAUTH') || err.message?.includes('AUTH')) {
      console.error('[Redis] NOAUTH on connect — Redis disabled.');
    } else {
      console.error(`[Redis] Connect failed: ${err.message}`);
    }
    redisDisabled = true;
    try { client.destroy(); } catch {}
  });

  return client;
}
