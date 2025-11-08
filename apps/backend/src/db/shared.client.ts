import { PrismaClient as SharedPrismaClient } from '../../node_modules/.prisma/shared/index.js';
import { logger } from '../utils/logger.js';
import { env } from '../env.js';

// Shared database client (Universities, Admins, GlobalStudentIndex, MintLogs, RevokedCerts)
export const sharedDb = new SharedPrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
  datasources: {
    db: {
      url: env.SHARED_DATABASE_URL,
    },
  },
});

// Log slow queries in development
if (env.NODE_ENV === 'development') {
  sharedDb.$on('query', (e: any) => {
    if (e.duration > 1000) {
      logger.warn({ duration: e.duration, query: e.query }, 'Slow Shared DB Query');
    } else {
      logger.debug({ duration: e.duration }, 'Shared DB Query');
    }
  });
}

sharedDb.$on('error', (e: any) => {
  logger.error({ target: e.target, message: e.message }, 'Shared DB Error');
});

sharedDb.$on('warn', (e: any) => {
  logger.warn({ target: e.target, message: e.message }, 'Shared DB Warning');
});

/**
 * Connect to shared database
 */
export async function connectSharedDb(): Promise<void> {
  try {
    await sharedDb.$connect();
    logger.info('✅ Connected to Shared Database');
  } catch (error) {
    logger.error({ error }, '❌ Failed to connect to Shared Database');
    throw error;
  }
}

/**
 * Disconnect from shared database
 */
export async function disconnectSharedDb(): Promise<void> {
  await sharedDb.$disconnect();
  logger.info('Disconnected from Shared Database');
}

/**
 * Health check for shared database
 */
export async function checkSharedDbHealth(): Promise<boolean> {
  try {
    await sharedDb.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error }, 'Shared DB health check failed');
    return false;
  }
}

