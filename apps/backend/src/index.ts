import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { logger } from './utils/logger.js';
import { startServer } from './server.js';

async function main() {
  try {
    logger.info(
      {
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        solanaNetwork: env.SOLANA_NETWORK,
      },
      'Starting GenuineGrads Backend API'
    );

    // Start GraphQL server
    await startServer();

    logger.info({ port: env.PORT }, '🚀 Backend server is running');
    logger.info({ url: `http://localhost:${env.PORT}/graphql` }, '📊 GraphQL endpoint');
  } catch (error: any) {
    logger.error({ error: error.message }, '❌ Failed to start server');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the application
main();
