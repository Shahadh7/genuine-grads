import { PrismaClient as UniversityPrismaClient } from '../../../node_modules/.prisma/university/index.js';
import { sharedDb } from '../../db/shared.client.js';
import { sseManager } from './sse.manager.js';
import {
  CreateAdminNotificationParams,
  CreateStudentNotificationParams,
  NotificationResult,
  NotificationConnection,
  PaginationOptions,
  NotificationType,
  StudentNotificationType,
  ADMIN_NOTIFICATION_TEMPLATES,
  STUDENT_NOTIFICATION_TEMPLATES,
} from './notification.types.js';
import { logger } from '../../utils/logger.js';

class NotificationService {

  // ============================================================================
  // Admin Notifications
  // ============================================================================

  /**
   * Create an admin notification and emit SSE event
   */
  async createAdminNotification(
    params: CreateAdminNotificationParams
  ): Promise<NotificationResult> {
    const notification = await sharedDb.adminNotification.create({
      data: {
        adminId: params.adminId,
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'NORMAL',
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        actionUrl: params.actionUrl || null,
        expiresAt: params.expiresAt || null,
      },
    });

    const result: NotificationResult = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      metadata: notification.metadata as Record<string, unknown> | null,
      actionUrl: notification.actionUrl,
      read: notification.read,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };

    // Emit SSE event
    sseManager.sendToUser(params.adminId, result);

    logger.info(`Admin notification created: ${notification.id} for admin ${params.adminId}`);
    return result;
  }

  /**
   * Create notification using template
   */
  async createAdminNotificationFromTemplate(
    adminId: string,
    type: NotificationType,
    data: Record<string, unknown>
  ): Promise<NotificationResult | null> {
    const template = ADMIN_NOTIFICATION_TEMPLATES[type];
    if (!template) {
      logger.warn(`No template found for admin notification type: ${type}`);
      return null;
    }

    return this.createAdminNotification({
      adminId,
      type,
      title: template.title,
      message: template.message(data),
      priority: template.priority as any,
      actionUrl: template.actionUrl?.(data),
      metadata: data,
    });
  }

  /**
   * Notify all super admins
   */
  async notifySuperAdmins(
    type: NotificationType,
    data: Record<string, unknown>
  ): Promise<void> {
    const superAdmins = await sharedDb.admin.findMany({
      where: { isSuperAdmin: true, isActive: true },
      select: { id: true },
    });

    for (const admin of superAdmins) {
      await this.createAdminNotificationFromTemplate(admin.id, type, data);
    }
  }

  /**
   * Notify all admins of a university
   */
  async notifyUniversityAdmins(
    universityId: string,
    type: NotificationType,
    data: Record<string, unknown>
  ): Promise<void> {
    const admins = await sharedDb.admin.findMany({
      where: { universityId, isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.createAdminNotificationFromTemplate(admin.id, type, data);
    }
  }

  /**
   * Get admin notifications with cursor pagination
   */
  async getAdminNotifications(
    adminId: string,
    options: PaginationOptions = {}
  ): Promise<NotificationConnection> {
    const { first = 5, after } = options;
    const take = first + 1; // Fetch one extra to check hasNextPage

    const whereClause = {
      adminId,
      ...(after ? { createdAt: { lt: (await sharedDb.adminNotification.findUnique({ where: { id: after } }))?.createdAt } } : {}),
    };

    const [notifications, totalCount, unreadCount] = await Promise.all([
      sharedDb.adminNotification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take,
        ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      }),
      sharedDb.adminNotification.count({ where: { adminId } }),
      sharedDb.adminNotification.count({ where: { adminId, read: false } }),
    ]);

    const hasNextPage = notifications.length > first;
    const nodes = notifications.slice(0, first).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      priority: n.priority,
      metadata: n.metadata as Record<string, unknown> | null,
      actionUrl: n.actionUrl,
      read: n.read,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));

    return {
      nodes,
      pageInfo: {
        hasNextPage,
        endCursor: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
      },
      totalCount,
      unreadCount,
    };
  }

  /**
   * Get unread count for admin
   */
  async getAdminUnreadCount(adminId: string): Promise<number> {
    return sharedDb.adminNotification.count({
      where: { adminId, read: false },
    });
  }

  /**
   * Mark admin notification as read
   */
  async markAdminNotificationAsRead(
    notificationId: string,
    adminId: string
  ): Promise<NotificationResult | null> {
    const notification = await sharedDb.adminNotification.updateMany({
      where: { id: notificationId, adminId },
      data: { read: true, readAt: new Date() },
    });

    if (notification.count === 0) return null;

    const updated = await sharedDb.adminNotification.findUnique({
      where: { id: notificationId },
    });

    if (!updated) return null;

    return {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      priority: updated.priority,
      metadata: updated.metadata as Record<string, unknown> | null,
      actionUrl: updated.actionUrl,
      read: updated.read,
      readAt: updated.readAt,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Mark all admin notifications as read
   */
  async markAllAdminNotificationsAsRead(adminId: string): Promise<boolean> {
    await sharedDb.adminNotification.updateMany({
      where: { adminId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return true;
  }

  /**
   * Delete admin notification
   */
  async deleteAdminNotification(notificationId: string, adminId: string): Promise<boolean> {
    const result = await sharedDb.adminNotification.deleteMany({
      where: { id: notificationId, adminId },
    });
    return result.count > 0;
  }

  // ============================================================================
  // Student Notifications
  // ============================================================================

  /**
   * Create a student notification and emit SSE event
   */
  async createStudentNotification(
    params: CreateStudentNotificationParams,
    universityDb: UniversityPrismaClient
  ): Promise<NotificationResult> {
    const notification = await universityDb.studentNotification.create({
      data: {
        studentId: params.studentId,
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'NORMAL',
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        actionUrl: params.actionUrl || null,
        expiresAt: params.expiresAt || null,
      },
    });

    const result: NotificationResult = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      metadata: notification.metadata as Record<string, unknown> | null,
      actionUrl: notification.actionUrl,
      read: notification.read,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };

    // Emit SSE event
    sseManager.sendToUser(params.studentId, result);

    logger.info(`Student notification created: ${notification.id} for student ${params.studentId}`);
    return result;
  }

  /**
   * Create student notification using template
   */
  async createStudentNotificationFromTemplate(
    studentId: string,
    type: StudentNotificationType,
    data: Record<string, unknown>,
    universityDb: UniversityPrismaClient
  ): Promise<NotificationResult | null> {
    const template = STUDENT_NOTIFICATION_TEMPLATES[type];
    if (!template) {
      logger.warn(`No template found for student notification type: ${type}`);
      return null;
    }

    return this.createStudentNotification(
      {
        studentId,
        type,
        title: template.title,
        message: template.message(data),
        priority: template.priority as any,
        actionUrl: template.actionUrl?.(data),
        metadata: data,
      },
      universityDb
    );
  }

  /**
   * Get student notifications with cursor pagination
   */
  async getStudentNotifications(
    studentId: string,
    universityDb: UniversityPrismaClient,
    options: PaginationOptions = {}
  ): Promise<NotificationConnection> {
    const { first = 5, after } = options;
    const take = first + 1;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      universityDb.studentNotification.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take,
        ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      }),
      universityDb.studentNotification.count({ where: { studentId } }),
      universityDb.studentNotification.count({ where: { studentId, read: false } }),
    ]);

    const hasNextPage = notifications.length > first;
    const nodes = notifications.slice(0, first).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      priority: n.priority,
      metadata: n.metadata as Record<string, unknown> | null,
      actionUrl: n.actionUrl,
      read: n.read,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));

    return {
      nodes,
      pageInfo: {
        hasNextPage,
        endCursor: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
      },
      totalCount,
      unreadCount,
    };
  }

  /**
   * Get unread count for student
   */
  async getStudentUnreadCount(
    studentId: string,
    universityDb: UniversityPrismaClient
  ): Promise<number> {
    return universityDb.studentNotification.count({
      where: { studentId, read: false },
    });
  }

  /**
   * Mark student notification as read
   */
  async markStudentNotificationAsRead(
    notificationId: string,
    studentId: string,
    universityDb: UniversityPrismaClient
  ): Promise<NotificationResult | null> {
    const notification = await universityDb.studentNotification.updateMany({
      where: { id: notificationId, studentId },
      data: { read: true, readAt: new Date() },
    });

    if (notification.count === 0) return null;

    const updated = await universityDb.studentNotification.findUnique({
      where: { id: notificationId },
    });

    if (!updated) return null;

    return {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      priority: updated.priority,
      metadata: updated.metadata as Record<string, unknown> | null,
      actionUrl: updated.actionUrl,
      read: updated.read,
      readAt: updated.readAt,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Mark all student notifications as read
   */
  async markAllStudentNotificationsAsRead(
    studentId: string,
    universityDb: UniversityPrismaClient
  ): Promise<boolean> {
    await universityDb.studentNotification.updateMany({
      where: { studentId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return true;
  }

  /**
   * Delete student notification
   */
  async deleteStudentNotification(
    notificationId: string,
    studentId: string,
    universityDb: UniversityPrismaClient
  ): Promise<boolean> {
    const result = await universityDb.studentNotification.deleteMany({
      where: { id: notificationId, studentId },
    });
    return result.count > 0;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Delete expired notifications (run periodically)
   */
  async cleanupExpiredNotifications(): Promise<{ adminDeleted: number; studentDeleted: number }> {
    const now = new Date();

    const adminResult = await sharedDb.adminNotification.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    // Note: For student notifications, this would need to run per university DB
    // This is a simplified version that only handles admin notifications

    logger.info(`Cleaned up ${adminResult.count} expired admin notifications`);

    return {
      adminDeleted: adminResult.count,
      studentDeleted: 0, // Would need to iterate through university DBs
    };
  }
}

// Singleton instance
export const notificationService = new NotificationService();
export default notificationService;
