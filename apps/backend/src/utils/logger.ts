import pino from 'pino';
import { env, isDevelopment } from '../env.js';

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: env.NODE_ENV,
  },
});

// Export child loggers for different modules
export const createModuleLogger = (module: string) => logger.child({ module });

