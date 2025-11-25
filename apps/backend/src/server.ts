import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers/index.js';
import { createContext, GraphQLContext } from './graphql/context.js';
import { env } from './env.js';
import { logger } from './utils/logger.js';
import uploadRoutes from './routes/upload.routes.js';

/**
 * Create and configure the Apollo Server with Express
 */
export async function createApolloServer() {
  // Create Express app
  const app = express();
  
  // Create HTTP server
  const httpServer = http.createServer(app);

  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    plugins: [
      // Proper shutdown for the HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
      
      // Custom logging plugin
      {
        async requestDidStart() {
          return {
            async didEncounterErrors(requestContext) {
              logger.error(
                {
                  errors: requestContext.errors,
                  query: requestContext.request.query,
                  variables: requestContext.request.variables,
                },
                'GraphQL errors occurred'
              );
            },
          };
        },
      },
    ],
    formatError: (formattedError, error) => {
      // Log error
      logger.error({ error: formattedError }, 'GraphQL error');
      
      // In production, don't expose internal error details
      if (env.NODE_ENV === 'production') {
        if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          return {
            message: 'An internal server error occurred',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
            },
          };
        }
      }
      
      return formattedError;
    },
    introspection: env.NODE_ENV !== 'production', // Disable introspection in production
  });

  // Start Apollo Server
  await server.start();

  // Apply CORS globally (must be before routes)
  app.use(
    cors<cors.CorsRequest>({
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Apply JSON parsing middleware
  app.use(express.json({ limit: '10mb' }));

  // Upload routes
  app.use('/api/upload', uploadRoutes);

  // GraphQL endpoint
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: createContext,
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: '@genuinegrads/backend',
      version: '1.0.0',
      graphql: '/graphql',
      health: '/health',
    });
  });

  return { app, httpServer, server };
}

/**
 * Start the server
 */
export async function startServer() {
  const { app, httpServer } = await createApolloServer();
  
  const PORT = parseInt(env.PORT, 10) || 4000;
  
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, () => {
      logger.info({ port: PORT }, `🚀 Server ready at http://localhost:${PORT}/graphql`);
      resolve();
    });
  });
  
  return httpServer;
}
