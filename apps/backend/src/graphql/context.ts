import { Request, Response } from 'express';
import { JWTPayload, verifyAccessToken, extractTokenFromHeader } from '../auth/jwt.js';
import { sharedDb } from '../db/shared.client.js';
import { getUniversityDb } from '../db/university.client.js';
import { PrismaClient as UniversityPrismaClient } from '../../node_modules/.prisma/university/index.js';
import { logger } from '../utils/logger.js';

export interface GraphQLContext {
  req: Request;
  res: Response;
  auth?: JWTPayload;
  admin?: {
    id: string;
    email: string;
    isSuperAdmin: boolean;
    universityId?: string;
  };
  universityDb?: UniversityPrismaClient;
}

/**
 * Create GraphQL context for each request
 */
export async function createContext({ req, res }: { req: Request; res: Response }): Promise<GraphQLContext> {
  const context: GraphQLContext = { req, res };

  // Extract and verify JWT token
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      context.auth = payload;

      // Fetch admin details from database
      const admin = await sharedDb.admin.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          isSuperAdmin: true,
          universityId: true,
          isActive: true,
        },
      });

      if (admin && admin.isActive) {
        context.admin = {
          id: admin.id,
          email: admin.email,
          isSuperAdmin: admin.isSuperAdmin,
          universityId: admin.universityId || undefined,
        };

        // If university admin, get university database connection
        if (admin.universityId) {
          const university = await sharedDb.university.findUnique({
            where: { id: admin.universityId },
            select: { databaseUrl: true },
          });

          if (university?.databaseUrl) {
            context.universityDb = getUniversityDb(university.databaseUrl);
          }
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to authenticate token');
      // Don't throw error, just don't set auth context
    }
  }

  return context;
}

/**
 * Check if user is authenticated
 */
export function requireAuth(context: GraphQLContext): void {
  if (!context.auth || !context.admin) {
    throw new Error('Not authenticated');
  }
}

/**
 * Check if user is super admin
 */
export function requireSuperAdmin(context: GraphQLContext): void {
  requireAuth(context);
  if (!context.admin!.isSuperAdmin) {
    throw new Error('Forbidden: Super admin access required');
  }
}

/**
 * Check if user is university admin
 */
export function requireUniversityAdmin(context: GraphQLContext): void {
  requireAuth(context);
  if (!context.admin!.universityId) {
    throw new Error('Forbidden: University admin access required');
  }
  if (!context.universityDb) {
    throw new Error('University database not available');
  }
}

/**
 * Get university database or throw error
 */
export function requireUniversityDb(context: GraphQLContext): UniversityPrismaClient {
  if (!context.universityDb) {
    throw new Error('University database not available');
  }
  return context.universityDb;
}

