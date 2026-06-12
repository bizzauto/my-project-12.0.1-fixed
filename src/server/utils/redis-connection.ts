import IORedis from 'ioredis';

let redisDisabled = false;

export function isRedisDisabled(): boolean {
  return redisDisabled;
}

export function createRedisConnection() {
  if (redisDisabled) return null;

  const redisUrl = process.env.REDIS_URL;
  const redisPassword = process.env.REDIS_PASSWORD;
  const redisHost = process.env.REDIS_HOST;

  console.log(`[Redis] REDIS_URL: ${redisUrl ? 'SET' : 'NOT SET'}, REDIS_PASSWORD: ${redisPassword ? 'SET' : 'NOT SET'}, REDIS_HOST: ${redisHost || 'NOT SET'}`);

  if (!redisUrl && !redisPassword && !redisHost) {
    console.log('[Redis] No credentials configured — Redis disabled');
    redisDisabled = true;
    return null;
  }

  if (redisUrl) {
    const hasAt = redisUrl.includes('@');
    if (!hasAt) {
      console.log('[Redis] REDIS_URL has no @ (no auth) — Redis disabled.');
      redisDisabled = true;
      return null;
    }
    const schemeFree = redisUrl.replace(/^rediss?:\/\//, '');
    const passwordPart = schemeFree.split('@')[0];
    if (!passwordPart || passwordPart === ':' || passwordPart === '') {
      console.log('[Redis] REDIS_URL has empty password — Redis disabled.');
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

  if (redisHost) {
    console.log('[Redis] REDIS_HOST set but no password — Redis disabled.');
    redisDisabled = true;
    return null;
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

  function handleNoAuth(ctx: string) {
    return (err: any) => {
      if (err?.message?.includes('NOAUTH') || err?.message?.includes('AUTH') || err?.message?.includes('ERR')) {
        console.error(`[Redis] NOAUTH ${ctx} — credentials rejected. Redis permanently disabled.`);
        redisDisabled = true;
        try { client.destroy(); } catch {}
        return true;
      }
      return false;
    };
  }

  client.on('error', (err: any) => {
    if (handleNoAuth('error event')(err)) return;
    console.error(`[Redis] Connection error: ${err.message}`);
  });

  client.on('connect', () => {
    console.log('[Redis] TCP connected, waiting for ready...');
  });

  client.on('ready', () => {
    console.log('[Redis] Connected successfully');
  });

  client.connect().catch((err: any) => {
    if (handleNoAuth('on connect')(err)) return;
    console.error(`[Redis] Connect failed: ${err.message}`);
    redisDisabled = true;
    try { client.destroy(); } catch {}
  });

  return client;
}
