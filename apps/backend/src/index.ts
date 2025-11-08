import { env } from './env.js';
import { logger } from './utils/logger.js';
import { connectSharedDb, disconnectSharedDb } from './db/shared.client.js';
import { disconnectAllUniversityDbs } from './db/university.client.js';
import { createApolloServer } from './server.js';

/**
 * Main application entry point
 */
async function main() {
  try {
    logger.info('🚀 Starting GenuineGrads Backend API...');

    // Connect to shared database
    await connectSharedDb();

    // Create and start Apollo Server
    const { app, httpServer } = await createApolloServer();

    // Start HTTP server
    await new Promise<void>((resolve) => {
      httpServer.listen({ port: parseInt(env.PORT) }, resolve);
    });

    logger.info(
      {
        port: env.PORT,
        environment: env.NODE_ENV,
        graphqlEndpoint: `http://localhost:${env.PORT}/graphql`,
      },
      '✅ Server is running'
    );

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      try {
        // Stop accepting new connections
        await new Promise<void>((resolve, reject) => {
          httpServer.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Disconnect from databases
        await Promise.all([disconnectSharedDb(), disconnectAllUniversityDbs()]);

        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, '❌ Error during shutdown');
        process.exit(1);
      }
    };

    // Listen for termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.fatal({ error }, '❌ Uncaught Exception');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal({ reason, promise }, '❌ Unhandled Promise Rejection');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error }, '❌ Failed to start server');
    process.exit(1);
  }
}

// Start the application
main();

