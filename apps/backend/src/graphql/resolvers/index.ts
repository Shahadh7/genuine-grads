import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { authQueries } from './queries/auth.queries.js';
import { universityQueries } from './queries/university.queries.js';
import { studentQueries } from './queries/student.queries.js';
import { certificateQueries } from './queries/certificate.queries.js';
import { publicQueries } from './queries/public.queries.js';
import { zkQueries } from './queries/zk.queries.js';
import { authMutations } from './mutations/auth.mutations.js';
import { studentAuthMutations } from './mutations/student-auth.mutations.js';
import { totpMutations } from './mutations/totp.mutations.js';
import { universityMutations } from './mutations/university.mutations.js';
import { studentMutations } from './mutations/student.mutations.js';
import { certificateMutations } from './mutations/certificate.mutations.js';
import { zkMutations } from './mutations/zk.mutations.js';
import { requireUniversityDb } from '../context.js';
import { solanaMutations } from './mutations/solana.mutations.js';

export const resolvers: Record<string, any> = {
  // Custom scalars
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  // Queries
  Query: {
    // Auth
    ...authQueries,
    
    // University
    ...universityQueries,
    
    // Students
    ...studentQueries,
    
    // Certificates
    ...certificateQueries,
    
    // Public
    ...publicQueries,

    // ZK Verification
    ...zkQueries,
  },

  // Mutations
  Mutation: {
    // Auth
    ...authMutations,
    ...studentAuthMutations,
    ...totpMutations,

    // University
    ...universityMutations,

    // Students
    ...studentMutations,

    // Certificates
    ...certificateMutations,

    // Solana transactions (integrated into university/certificate mutations)
    ...solanaMutations,

    // ZK Verification
    ...zkMutations,
  },

  // Field resolvers (for nested data)
  University: {
    stats: async (_parent: any, _: any, context: any) => {
      // This is called when stats field is requested
      if (!context.universityDb) {
        return null;
      }
      
      // Calculate stats on demand
      const [totalCertificates, mintedCount, pendingCount, revokedCount, totalStudents, activeStudents] =
        await Promise.all([
          context.universityDb.certificate.count(),
          context.universityDb.certificate.count({ where: { status: 'MINTED' } }),
          context.universityDb.certificate.count({ where: { status: 'PENDING' } }),
          context.universityDb.certificate.count({ where: { revoked: true } }),
          context.universityDb.student.count(),
          context.universityDb.student.count({ where: { isActive: true } }),
        ]);

      return {
        totalCertificates,
        mintedCount,
        pendingCount,
        revokedCount,
        activeStudents,
        totalStudents,
      };
    },
  },

  Student: {
    achievements: async (parent: any, _: any, context: any) => {
      if (!context || !context.admin) {
        return [];
      }

      if (Array.isArray(parent.achievements) && parent.achievements.length > 0) {
        const needsHydration = parent.achievements.some((item: any) => !item?.achievement);
        if (!needsHydration) {
          return parent.achievements;
        }
      }

      const universityDb = requireUniversityDb(context);
      return universityDb.studentAchievement.findMany({
        where: { studentId: parent.id },
        include: { achievement: true },
        orderBy: { awardedAt: 'desc' },
      });
    },
  },

  Certificate: {
    metadata: (parent: any) => {
      // If metadata is already provided (from myCertificates query), use it
      if (parent.metadata !== undefined) {
        return parent.metadata;
      }

      // Otherwise, parse metadataJson if it's a string
      if (typeof parent.metadataJson === 'string') {
        try {
          return JSON.parse(parent.metadataJson);
        } catch {
          return {};
        }
      }
      return parent.metadataJson || {};
    },
  },
};

