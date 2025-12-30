import { GraphQLContext } from '../../context';
import { notificationService } from '../../../services/notification/notification.service';
import { GraphQLError } from 'graphql';

export const notificationQueries = {
  /**
   * Get notifications for the authenticated admin (university admin or super admin)
   */
  notifications: async (
    _: unknown,
    args: { first?: number; after?: string },
    context: GraphQLContext
  ) => {
    if (!context.admin) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const { first = 5, after } = args;

    return notificationService.getAdminNotifications(context.admin.id, {
      first,
      after: after || undefined,
    });
  },

  /**
   * Get unread notification count for the authenticated admin
   */
  unreadNotificationCount: async (
    _: unknown,
    __: unknown,
    context: GraphQLContext
  ) => {
    if (!context.admin) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    return notificationService.getAdminUnreadCount(context.admin.id);
  },

  /**
   * Get notifications for the authenticated student
   */
  studentNotifications: async (
    _: unknown,
    args: { first?: number; after?: string },
    context: GraphQLContext
  ) => {
    if (!context.student || !context.universityDb) {
      throw new GraphQLError('Student authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Look up the local university student ID using wallet address
    // context.student.id is GlobalStudentIndex ID, but notifications use local student ID
    const localStudent = await context.universityDb.student.findFirst({
      where: { walletAddress: context.student.walletAddress },
      select: { id: true },
    });

    if (!localStudent) {
      // Return empty result if student not found in this university
      return {
        nodes: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        unreadCount: 0,
      };
    }

    const { first = 5, after } = args;

    return notificationService.getStudentNotifications(
      localStudent.id,
      context.universityDb,
      {
        first,
        after: after || undefined,
      }
    );
  },

  /**
   * Get unread notification count for the authenticated student
   */
  studentUnreadNotificationCount: async (
    _: unknown,
    __: unknown,
    context: GraphQLContext
  ) => {
    if (!context.student || !context.universityDb) {
      throw new GraphQLError('Student authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Look up the local university student ID using wallet address
    const localStudent = await context.universityDb.student.findFirst({
      where: { walletAddress: context.student.walletAddress },
      select: { id: true },
    });

    if (!localStudent) {
      return 0;
    }

    return notificationService.getStudentUnreadCount(
      localStudent.id,
      context.universityDb
    );
  },
};
