import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { authQueries } from './queries/auth.queries.js';
import { universityQueries } from './queries/university.queries.js';
import { studentQueries } from './queries/student.queries.js';
import { certificateQueries } from './queries/certificate.queries.js';
import { publicQueries } from './queries/public.queries.js';
import { authMutations } from './mutations/auth.mutations.js';
import { universityMutations } from './mutations/university.mutations.js';
import { studentMutations } from './mutations/student.mutations.js';
import { certificateMutations } from './mutations/certificate.mutations.js';

export const resolvers = {
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
  },

  // Mutations
  Mutation: {
    // Auth
    ...authMutations,
    
    // University
    ...universityMutations,
    
    // Students
    ...studentMutations,
    
    // Certificates
    ...certificateMutations,
  },

  // Field resolvers (for nested data)
  University: {
    stats: async (parent: any, _: any, context: any) => {
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

  Certificate: {
    metadata: (parent: any) => {
      // Parse metadataJson if it's a string
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

