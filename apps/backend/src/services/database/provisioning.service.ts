// @ts-ignore - generated Prisma client path is valid at runtime
import { PrismaClient as SharedPrismaClient } from '../../../node_modules/.prisma/shared/index.js';
import { execSync } from 'child_process';
import { env } from '../../env.js';
import { logger } from '../../utils/logger.js';

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
  // Generate database name from domain (e.g., mit.edu -> genuinegrads_mit_edu)
  const databaseName = `genuinegrads_${universityDomain.replace(/\./g, '_').toLowerCase()}`;

  logger.info({ universityDomain, databaseName }, 'Provisioning university database');

  try {
    // Step 1: Create the PostgreSQL database
    await createPostgresDatabase(databaseName);

    // Step 2: Generate database URL
    const templateUrl = env.UNIVERSITY_DATABASE_URL;
    const databaseUrl = templateUrl.replace(/\/[^/]*$/, `/${databaseName}`);

    // Step 3: Initialize schema in the new database
    await initializeDatabaseSchema(databaseUrl);

    logger.info({ databaseName, databaseUrl }, 'University database provisioned successfully');

    return {
      databaseName,
      databaseUrl,
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
    const result = (await prisma.$queryRawUnsafe(
      `SELECT datname FROM pg_database WHERE datname = '${databaseName}'`
    )) as Array<{ datname: string }>;

    if (result.length > 0) {
      logger.info({ databaseName }, 'Database already exists, skipping creation');
      await prisma.$disconnect();
      return;
    }

    // Create the database
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
    
    const pushCommand = `npx prisma db push --schema=prisma/university.prisma --skip-generate --accept-data-loss`;
    
    execSync(pushCommand, {
      env: {
        ...process.env,
        UNIVERSITY_DATABASE_URL: databaseUrl,
      },
      stdio: 'pipe', // Capture output instead of inheriting
    });

    logger.info('Database schema pushed successfully');

    // Step 2: Generate Prisma client for the university schema
    logger.info('Generating Prisma client for university database...');
    
    const generateCommand = `npx prisma generate --schema=prisma/university.prisma`;
    
    execSync(generateCommand, {
      env: {
        ...process.env,
        UNIVERSITY_DATABASE_URL: databaseUrl,
      },
      stdio: 'pipe',
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
    // Terminate existing connections
    await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${databaseName}'
        AND pid <> pg_backend_pid()
    `);

    // Drop the database
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
    const result = (await prisma.$queryRawUnsafe(
      `SELECT datname FROM pg_database WHERE datname = '${databaseName}'`
    )) as Array<{ datname: string }>;
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

