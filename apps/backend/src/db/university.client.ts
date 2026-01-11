import { PrismaClient as UniversityPrismaClient } from '../../node_modules/.prisma/university/index.js';
import { logger } from '../utils/logger.js';
import { env } from '../env.js';
import { decryptDatabaseUrl } from '../utils/crypto.js';

// Connection pool for university databases (multi-tenancy)
// Key is the original (potentially encrypted) URL for cache lookup
const universityDbPool = new Map<string, UniversityPrismaClient>();

/**
 * Get university database client for a specific university
 * Creates a new connection if not exists, otherwise returns cached connection
 * SECURITY: Handles both encrypted and plain URLs for backwards compatibility
 */
export function getUniversityDb(databaseUrl: string): UniversityPrismaClient {
  // Check if connection already exists (use original URL as cache key)
  if (universityDbPool.has(databaseUrl)) {
    return universityDbPool.get(databaseUrl)!;
  }

  // SECURITY: Decrypt the URL if it's encrypted
  const decryptedUrl = decryptDatabaseUrl(databaseUrl);

  // Create new connection with decrypted URL
  const db = new UniversityPrismaClient({
    datasources: {
      db: {
        url: decryptedUrl,
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

  // Cache the connection (use original URL as key for consistent lookup)
  universityDbPool.set(databaseUrl, db);
  // SECURITY: Only log masked decrypted URL, never the encrypted or raw URL
  logger.info({ databaseUrl: maskDbUrl(decryptedUrl) }, 'Created new University DB connection');

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
 * SECURITY: Handles encrypted URLs
 */
export async function connectUniversityDb(databaseUrl: string): Promise<void> {
  try {
    const db = getUniversityDb(databaseUrl);
    await db.$connect();
    // SECURITY: Decrypt for logging only
    const decryptedUrl = decryptDatabaseUrl(databaseUrl);
    logger.info({ databaseUrl: maskDbUrl(decryptedUrl) }, '✅ Connected to University Database');
  } catch (error) {
    logger.error({ error }, '❌ Failed to connect to University Database');
    throw error;
  }
}

/**
 * Disconnect from a specific university database
 * SECURITY: Handles encrypted URLs
 */
export async function disconnectUniversityDb(databaseUrl: string): Promise<void> {
  const db = universityDbPool.get(databaseUrl);
  if (db) {
    await db.$disconnect();
    universityDbPool.delete(databaseUrl);
    logger.info('Disconnected from University Database');
  }
}

/**
 * Disconnect from all university databases
 */
export async function disconnectAllUniversityDbs(): Promise<void> {
  const disconnectPromises = Array.from(universityDbPool.entries()).map(async ([_url, db]) => {
    await db.$disconnect();
  });

  await Promise.all(disconnectPromises);
  const count = universityDbPool.size;
  universityDbPool.clear();
  logger.info({ count }, 'Disconnected from all University Databases');
}

/**
 * Health check for a university database
 * SECURITY: Handles encrypted URLs
 */
export async function checkUniversityDbHealth(databaseUrl: string): Promise<boolean> {
  try {
    const db = getUniversityDb(databaseUrl);
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error }, 'University DB health check failed');
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

