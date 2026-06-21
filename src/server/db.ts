import { PrismaClient } from '@prisma/client';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Prisma with optimized connection pool
// connection_limit defaults to num_cpus * 2 + 1; pool_timeout controls wait time
const POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '0');
const poolUrl = POOL_SIZE > 0
  ? `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes('?') ? '&' : '?'}connection_limit=${POOL_SIZE}&pool_timeout=10`
  : process.env.DATABASE_URL;

const slowQueryEnabled = process.env.SLOW_QUERY_LOG_ENABLED !== 'false' && NODE_ENV === 'production';
export const prisma = new PrismaClient({
  log: [
    'error',
    'warn',
    ...(slowQueryEnabled ? ['query' as const] : []),
  ],
  datasources: {
    db: {
      url: poolUrl,
    },
  },
});
