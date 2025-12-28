import { GraphQLContext } from '../../context.js';
import { sharedDb } from '../../../db/shared.client.js';

export const authQueries = {
  /**
   * Get current authenticated admin
   */
  async me(_: any, __: any, context: GraphQLContext) {
    if (!context.auth || !context.admin) {
      return null;
    }

    const admin = await sharedDb.admin.findUnique({
      where: { id: context.admin.id },
      include: {
        university: true,
      },
    });

    return admin;
  },
};

