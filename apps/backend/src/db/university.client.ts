import { PrismaClient as UniversityPrismaClient } from '../../node_modules/.prisma/university/index.js';
import { logger } from '../utils/logger.js';
import { env } from '../env.js';

// Connection pool for university databases (multi-tenancy)
const universityDbPool = new Map<string, UniversityPrismaClient>();

/**
 * Get university database client for a specific university
 * Creates a new connection if not exists, otherwise returns cached connection
 */
export function getUniversityDb(databaseUrl: string): UniversityPrismaClient {
  // Check if connection already exists
  if (universityDbPool.has(databaseUrl)) {
    return universityDbPool.get(databaseUrl)!;
  }

  // Create new connection
  const db = new UniversityPrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  // Log slow queries in development
  if (env.NODE_ENV === 'development') {
    db.$on('query', (e: any) => {
      if (e.duration > 1000) {
        logger.warn({ duration: e.duration, query: e.query }, 'Slow University DB Query');
      } else {
        logger.debug({ duration: e.duration }, 'University DB Query');
      }
    });
  }

  db.$on('error', (e: any) => {
    logger.error({ target: e.target, message: e.message }, 'University DB Error');
  });

  // Cache the connection
  universityDbPool.set(databaseUrl, db);
  logger.info({ databaseUrl: maskDbUrl(databaseUrl) }, 'Created new University DB connection');

  return db;
}

/**
 * Get university database client by university ID (fetches from shared DB)
 */
export async function getUniversityDbById(universityId: string): Promise<UniversityPrismaClient> {
  const { sharedDb } = await import('./shared.client.js');
  
  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
    select: { databaseUrl: true },
  });

  if (!university?.databaseUrl) {
    throw new Error(`University database URL not found for ID: ${universityId}`);
  }

  return getUniversityDb(university.databaseUrl);
}

/**
 * Connect to a university database
 */
export async function connectUniversityDb(databaseUrl: string): Promise<void> {
  try {
    const db = getUniversityDb(databaseUrl);
    await db.$connect();
    logger.info({ databaseUrl: maskDbUrl(databaseUrl) }, '✅ Connected to University Database');
  } catch (error) {
    logger.error({ error, databaseUrl: maskDbUrl(databaseUrl) }, '❌ Failed to connect to University Database');
    throw error;
  }
}

/**
 * Disconnect from a specific university database
 */
export async function disconnectUniversityDb(databaseUrl: string): Promise<void> {
  const db = universityDbPool.get(databaseUrl);
  if (db) {
    await db.$disconnect();
    universityDbPool.delete(databaseUrl);
    logger.info({ databaseUrl: maskDbUrl(databaseUrl) }, 'Disconnected from University Database');
  }
}

/**
 * Disconnect from all university databases
 */
export async function disconnectAllUniversityDbs(): Promise<void> {
  const disconnectPromises = Array.from(universityDbPool.entries()).map(async ([url, db]) => {
    await db.$disconnect();
    logger.info({ databaseUrl: maskDbUrl(url) }, 'Disconnected from University Database');
  });

  await Promise.all(disconnectPromises);
  universityDbPool.clear();
  logger.info('Disconnected from all University Databases');
}

/**
 * Health check for a university database
 */
export async function checkUniversityDbHealth(databaseUrl: string): Promise<boolean> {
  try {
    const db = getUniversityDb(databaseUrl);
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error, databaseUrl: maskDbUrl(databaseUrl) }, 'University DB health check failed');
    return false;
  }
}

/**
 * Get count of active university database connections
 */
export function getUniversityDbConnectionCount(): number {
  return universityDbPool.size;
}

/**
 * Mask database URL for logging (hide password)
 */
function maskDbUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '***';
  }
}

