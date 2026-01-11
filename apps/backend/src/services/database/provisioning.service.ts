// @ts-ignore - generated Prisma client path is valid at runtime
import { PrismaClient as SharedPrismaClient, Prisma } from '../../../node_modules/.prisma/shared/index.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { env } from '../../env.js';
import { logger } from '../../utils/logger.js';
import { encryptDatabaseUrl } from '../../utils/crypto.js';

const execFileAsync = promisify(execFile);

/**
 * Validate and sanitize university domain
 * Prevents SQL injection and command injection attacks
 */
function validateUniversityDomain(domain: string): { valid: boolean; error?: string; sanitized?: string } {
  // Check for empty or null
  if (!domain || typeof domain !== 'string') {
    return { valid: false, error: 'Domain is required' };
  }

  // Trim and lowercase
  const sanitized = domain.trim().toLowerCase();

  // Length validation (PostgreSQL identifier limit is 63 chars, minus prefix)
  if (sanitized.length < 4 || sanitized.length > 50) {
    return { valid: false, error: 'Domain must be between 4 and 50 characters' };
  }

  // Strict domain pattern: only alphanumeric, hyphens, and dots
  // Must start and end with alphanumeric, no consecutive dots or hyphens
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!domainRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid domain format. Use format like: university.edu' };
  }

  // Prevent SQL/shell metacharacters (extra safety layer)
  const dangerousChars = /['"`;$\\|&<>(){}[\]!#%^*~]/;
  if (dangerousChars.test(sanitized)) {
    return { valid: false, error: 'Domain contains invalid characters' };
  }

  // Reserved words check
  const reserved = ['postgres', 'template0', 'template1', 'genuinegrads_shared', 'admin', 'root'];
  const dbName = `genuinegrads_${sanitized.replace(/\./g, '_')}`;
  if (reserved.includes(dbName) || reserved.includes(sanitized)) {
    return { valid: false, error: 'Domain name is reserved' };
  }

  return { valid: true, sanitized };
}

/**
 * Provision a new database for a university
 * This creates the PostgreSQL database and initializes the schema
 */
export async function provisionUniversityDatabase(universityDomain: string): Promise<{
  databaseName: string;
  databaseUrl: string;
  success: boolean;
  error?: string;
}> {
  // SECURITY: Validate and sanitize domain input
  const validation = validateUniversityDomain(universityDomain);
  if (!validation.valid || !validation.sanitized) {
    logger.warn({ universityDomain }, `Invalid domain rejected: ${validation.error}`);
    return {
      databaseName: '',
      databaseUrl: '',
      success: false,
      error: validation.error,
    };
  }

  // Generate database name from sanitized domain (e.g., mit.edu -> genuinegrads_mit_edu)
  const databaseName = `genuinegrads_${validation.sanitized.replace(/\./g, '_')}`;

  logger.info({ universityDomain, databaseName }, 'Provisioning university database');

  try {
    // Step 1: Create the PostgreSQL database
    await createPostgresDatabase(databaseName);

    // Step 2: Generate database URL
    const templateUrl = env.UNIVERSITY_DATABASE_URL;
    const databaseUrl = templateUrl.replace(/\/[^/]*$/, `/${databaseName}`);

    // Step 3: Initialize schema in the new database
    await initializeDatabaseSchema(databaseUrl);

    // Step 4: Encrypt the database URL for secure storage
    const encryptedDatabaseUrl = encryptDatabaseUrl(databaseUrl);

    logger.info({ databaseName }, 'University database provisioned successfully');

    return {
      databaseName,
      databaseUrl: encryptedDatabaseUrl, // Return encrypted URL for storage
      success: true,
    };
  } catch (error) {
    logger.error({ error, databaseName }, 'Failed to provision university database');
    return {
      databaseName,
      databaseUrl: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a PostgreSQL database programmatically
 */
async function createPostgresDatabase(databaseName: string): Promise<void> {
  logger.info({ databaseName }, 'Creating PostgreSQL database');

  // Parse connection info from template URL
  const url = new URL(env.UNIVERSITY_DATABASE_URL);
  const username = url.username || 'postgres';
  const password = url.password || '';
  const host = url.hostname || 'localhost';
  const port = url.port || '5432';

  // Connect to default 'postgres' database to create new one
  const adminUrl = `postgresql://${username}${password ? ':' + password : ''}@${host}:${port}/postgres`;
  const prisma = new SharedPrismaClient({
    datasources: {
      db: {
        url: adminUrl,
      },
    },
  });

  try {
    // Check if database already exists
    // SECURITY: Using parameterized query to prevent SQL injection
    const result = await prisma.$queryRaw<Array<{ datname: string }>>`
      SELECT datname FROM pg_database WHERE datname = ${databaseName}
    `;

    if (result.length > 0) {
      logger.info({ databaseName }, 'Database already exists, skipping creation');
      await prisma.$disconnect();
      return;
    }

    // Create the database
    // Note: Database names cannot be parameterized in CREATE DATABASE
    // We rely on the strict validation above to ensure safety
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    logger.info({ databaseName }, 'Database created successfully');
  } catch (error) {
    logger.error({ error, databaseName }, 'Failed to create database');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Initialize database schema using Prisma
 */
async function initializeDatabaseSchema(databaseUrl: string): Promise<void> {
  logger.info({ databaseUrl: maskPassword(databaseUrl) }, 'Initializing database schema');

  try {
    // Step 1: Push the database schema
    // Use Prisma's schema push to create tables
    logger.info('Pushing database schema...');

    // SECURITY: Using execFile with array arguments to prevent command injection
    // execFile does NOT use shell, so metacharacters cannot be injected
    await execFileAsync('npx', [
      'prisma',
      'db',
      'push',
      '--schema=prisma/university.prisma',
      '--skip-generate',
      '--accept-data-loss'
    ], {
      env: {
        ...process.env,
        UNIVERSITY_DATABASE_URL: databaseUrl,
      },
    });

    logger.info('Database schema pushed successfully');

    // Step 2: Generate Prisma client for the university schema
    logger.info('Generating Prisma client for university database...');

    // SECURITY: Using execFile with array arguments to prevent command injection
    await execFileAsync('npx', [
      'prisma',
      'generate',
      '--schema=prisma/university.prisma'
    ], {
      env: {
        ...process.env,
        UNIVERSITY_DATABASE_URL: databaseUrl,
      },
    });

    logger.info('Prisma client generated successfully');

    // Note: We don't test connection using getUniversityDb() here because
    // the generated Prisma client requires the current Node.js process to restart
    // to properly load the newly generated modules. The database is ready to use
    // after a server restart.

    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize database schema');
    throw error;
  }
}

/**
 * Drop a university database (use with caution!)
 */
export async function dropUniversityDatabase(databaseName: string): Promise<void> {
  logger.warn({ databaseName }, 'Dropping university database');

  const url = new URL(env.UNIVERSITY_DATABASE_URL);
  const username = url.username || 'postgres';
  const password = url.password || '';
  const host = url.hostname || 'localhost';
  const port = url.port || '5432';

  const adminUrl = `postgresql://${username}${password ? ':' + password : ''}@${host}:${port}/postgres`;
  const prisma = new SharedPrismaClient({
    datasources: {
      db: {
        url: adminUrl,
      },
    },
  });

  try {
    // SECURITY: Validate database name before operations
    // Only allow database names that match our pattern
    const dbNameRegex = /^genuinegrads_[a-z0-9_]+$/;
    if (!dbNameRegex.test(databaseName)) {
      throw new Error('Invalid database name format');
    }

    // Terminate existing connections
    // SECURITY: Using parameterized query to prevent SQL injection
    await prisma.$executeRaw`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = ${databaseName}
        AND pid <> pg_backend_pid()
    `;

    // Drop the database
    // Note: Database names cannot be parameterized in DROP DATABASE
    // We rely on the strict validation above to ensure safety
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
    logger.info({ databaseName }, 'Database dropped successfully');
  } catch (error) {
    logger.error({ error, databaseName }, 'Failed to drop database');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Check if a database exists
 */
export async function checkDatabaseExists(databaseName: string): Promise<boolean> {
  const url = new URL(env.UNIVERSITY_DATABASE_URL);
  const username = url.username || 'postgres';
  const password = url.password || '';
  const host = url.hostname || 'localhost';
  const port = url.port || '5432';

  const adminUrl = `postgresql://${username}${password ? ':' + password : ''}@${host}:${port}/postgres`;
  const prisma = new SharedPrismaClient({
    datasources: {
      db: {
        url: adminUrl,
      },
    },
  });

  try {
    // SECURITY: Using parameterized query to prevent SQL injection
    const result = await prisma.$queryRaw<Array<{ datname: string }>>`
      SELECT datname FROM pg_database WHERE datname = ${databaseName}
    `;
    return result.length > 0;
  } catch (error) {
    logger.error({ error, databaseName }, 'Failed to check database existence');
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Mask password in database URL for logging
 */
function maskPassword(url: string): string {
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

