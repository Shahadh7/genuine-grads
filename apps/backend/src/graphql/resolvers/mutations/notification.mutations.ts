import { GraphQLContext } from '../../context.js';
import { notificationService } from '../../../services/notification/notification.service.js';
import { GraphQLError } from 'graphql';

export const notificationMutations = {
  /**
   * Mark a single admin notification as read
   */
  markNotificationAsRead: async (
    _: unknown,
    args: { id: string },
    context: GraphQLContext
  ) => {
    if (!context.admin) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const notification = await notificationService.markAdminNotificationAsRead(
      args.id,
      context.admin.id
    );

    if (!notification) {
      throw new GraphQLError('Notification not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return notification;
  },

  /**
   * Mark all admin notifications as read
   */
  markAllNotificationsAsRead: async (
    _: unknown,
    __: unknown,
    context: GraphQLContext
  ) => {
    if (!context.admin) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    return notificationService.markAllAdminNotificationsAsRead(context.admin.id);
  },

  /**
   * Delete an admin notification
   */
  deleteNotification: async (
    _: unknown,
    args: { id: string },
    context: GraphQLContext
  ) => {
    if (!context.admin) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    return notificationService.deleteAdminNotification(args.id, context.admin.id);
  },

  /**
   * Mark a single student notification as read
   */
  markStudentNotificationAsRead: async (
    _: unknown,
    args: { id: string },
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
      throw new GraphQLError('Student not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const notification = await notificationService.markStudentNotificationAsRead(
      args.id,
      localStudent.id,
      context.universityDb
    );

    if (!notification) {
      throw new GraphQLError('Notification not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return notification;
  },

  /**
   * Mark all student notifications as read
   */
  markAllStudentNotificationsAsRead: async (
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

    return notificationService.markAllStudentNotificationsAsRead(
      localStudent.id,
      context.universityDb
    );
  },

  /**
   * Delete a student notification
   */
  deleteStudentNotification: async (
    _: unknown,
    args: { id: string },
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
      return false;
    }

    return notificationService.deleteStudentNotification(
      args.id,
      localStudent.id,
      context.universityDb
    );
  },
};
