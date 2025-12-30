import { NotificationType, NotificationPriority } from '../../../node_modules/.prisma/shared/index.js';
import { StudentNotificationType, StudentNotificationPriority } from '../../../node_modules/.prisma/university/index.js';

// Re-export enums for convenience
export { NotificationType, NotificationPriority };
export { StudentNotificationType, StudentNotificationPriority };

// Admin notification interfaces
export interface CreateAdminNotificationParams {
  adminId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface AdminNotificationResult {
  id: string;
  adminId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  metadata: Record<string, unknown> | null;
  actionUrl: string | null;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

// Student notification interfaces
export interface CreateStudentNotificationParams {
  studentId: string;
  type: StudentNotificationType;
  title: string;
  message: string;
  priority?: StudentNotificationPriority;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface StudentNotificationResult {
  id: string;
  studentId: string;
  type: StudentNotificationType;
  title: string;
  message: string;
  priority: StudentNotificationPriority;
  metadata: Record<string, unknown> | null;
  actionUrl: string | null;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

// Generic notification result for GraphQL
export interface NotificationResult {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  metadata: Record<string, unknown> | null;
  actionUrl: string | null;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

// Pagination
export interface PaginationOptions {
  first?: number;
  after?: string; // cursor (notification id)
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface NotificationConnection {
  nodes: NotificationResult[];
  pageInfo: PageInfo;
  totalCount: number;
  unreadCount: number;
}

// SSE Event types
export interface SSENotificationEvent {
  type: 'notification';
  data: NotificationResult;
}

export interface SSEHeartbeatEvent {
  type: 'heartbeat';
  data: Record<string, never>;
}

export interface SSEConnectedEvent {
  type: 'connected';
  data: { status: 'connected' };
}

export type SSEEvent = SSENotificationEvent | SSEHeartbeatEvent | SSEConnectedEvent;

// User roles for notification context
export type NotificationRole = 'admin' | 'super_admin' | 'student';

// Notification templates
export interface NotificationTemplate {
  title: string;
  message: (data: Record<string, unknown>) => string;
  actionUrl?: (data: Record<string, unknown>) => string;
  priority: NotificationPriority | StudentNotificationPriority;
}

// Admin notification templates
export const ADMIN_NOTIFICATION_TEMPLATES: Partial<Record<NotificationType, NotificationTemplate>> = {
  UNIVERSITY_REGISTERED: {
    title: 'New University Registration',
    message: (data) => `${data.universityName} has registered and is pending approval.`,
    actionUrl: (data) => `/admin/universities/${data.universityId}`,
    priority: 'HIGH' as NotificationPriority,
  },
  UNIVERSITY_APPROVED: {
    title: 'University Approved',
    message: (data) => `${data.universityName} has been approved and is now active.`,
    actionUrl: () => '/university/dashboard',
    priority: 'NORMAL' as NotificationPriority,
  },
  UNIVERSITY_REJECTED: {
    title: 'University Registration Rejected',
    message: (data) => `Your university registration has been rejected. Reason: ${data.reason || 'Not specified'}`,
    actionUrl: () => '/university/dashboard',
    priority: 'HIGH' as NotificationPriority,
  },
  UNIVERSITY_SUSPENDED: {
    title: 'University Suspended',
    message: (data) => `${data.universityName} has been suspended. Reason: ${data.reason || 'Not specified'}`,
    actionUrl: () => '/university/dashboard',
    priority: 'URGENT' as NotificationPriority,
  },
  CERTIFICATE_ISSUED: {
    title: 'Certificate Issued',
    message: (data) => `Certificate "${data.badgeTitle}" has been issued to ${data.studentName}.`,
    actionUrl: (data) => `/university/certificates/${data.certificateId}`,
    priority: 'NORMAL' as NotificationPriority,
  },
  CERTIFICATE_MINTED: {
    title: 'Certificate Minted on Blockchain',
    message: (data) => `Certificate "${data.badgeTitle}" for ${data.studentName} is now live on Solana.`,
    actionUrl: (data) => `/university/certificates/${data.certificateId}`,
    priority: 'NORMAL' as NotificationPriority,
  },
  CERTIFICATE_REVOKED: {
    title: 'Certificate Revoked',
    message: (data) => `Certificate "${data.badgeTitle}" for ${data.studentName} has been revoked.`,
    actionUrl: (data) => `/university/certificates/${data.certificateId}`,
    priority: 'HIGH' as NotificationPriority,
  },
  BATCH_JOB_COMPLETED: {
    title: 'Batch Issuance Completed',
    message: (data) => `Batch job "${data.batchName}" completed. ${data.successCount}/${data.totalCount} certificates minted.`,
    actionUrl: (data) => `/university/batch/${data.batchId}`,
    priority: 'NORMAL' as NotificationPriority,
  },
  BATCH_JOB_FAILED: {
    title: 'Batch Issuance Failed',
    message: (data) => `Batch job "${data.batchName}" failed. ${data.failedCount} certificates could not be minted.`,
    actionUrl: (data) => `/university/batch/${data.batchId}`,
    priority: 'HIGH' as NotificationPriority,
  },
  SECURITY_LOGIN_FAILED: {
    title: 'Failed Login Attempt',
    message: (data) => `Multiple failed login attempts detected for ${data.email}. ${data.attempts} attempts.`,
    actionUrl: () => '/admin/security',
    priority: 'HIGH' as NotificationPriority,
  },
  SECURITY_ACCOUNT_LOCKED: {
    title: 'Account Locked',
    message: (data) => `Account ${data.email} has been locked due to too many failed login attempts.`,
    actionUrl: () => '/admin/security',
    priority: 'URGENT' as NotificationPriority,
  },
};

// Student notification templates
export const STUDENT_NOTIFICATION_TEMPLATES: Partial<Record<StudentNotificationType, NotificationTemplate>> = {
  CERTIFICATE_ISSUED: {
    title: 'New Certificate Issued',
    message: (data) => `Your certificate "${data.badgeTitle}" has been issued and is pending blockchain confirmation.`,
    actionUrl: (data) => `/student/certificates/${data.certificateId}`,
    priority: 'NORMAL' as StudentNotificationPriority,
  },
  CERTIFICATE_MINTED: {
    title: 'Certificate Live on Blockchain',
    message: (data) => `Your certificate "${data.badgeTitle}" is now live on Solana blockchain!`,
    actionUrl: (data) => `/student/certificates/${data.certificateId}`,
    priority: 'NORMAL' as StudentNotificationPriority,
  },
  CERTIFICATE_REVOKED: {
    title: 'Certificate Revoked',
    message: (data) => `Your certificate "${data.badgeTitle}" has been revoked. Reason: ${data.reason || 'Not specified'}`,
    actionUrl: (data) => `/student/certificates/${data.certificateId}`,
    priority: 'URGENT' as StudentNotificationPriority,
  },
  CERTIFICATE_VERIFIED: {
    title: 'Certificate Verified',
    message: (data) => `Your certificate "${data.badgeTitle}" was verified by someone${data.location ? ` from ${data.location}` : ''}.`,
    actionUrl: () => '/student/verification-log',
    priority: 'LOW' as StudentNotificationPriority,
  },
  ZK_COMMITMENT_REGISTERED: {
    title: 'ZK Commitment Registered',
    message: (data) => `Your ZK commitment for "${data.achievementCode}" has been registered.`,
    actionUrl: (data) => `/student/achievements/${data.certificateId}`,
    priority: 'NORMAL' as StudentNotificationPriority,
  },
  ZK_PROOF_UPLOADED: {
    title: 'ZK Proof Uploaded',
    message: (data) => `Your ZK proof for "${data.achievementCode}" has been uploaded successfully.`,
    actionUrl: (data) => `/student/achievements/${data.certificateId}`,
    priority: 'NORMAL' as StudentNotificationPriority,
  },
  ZK_PROOF_VERIFIED: {
    title: 'ZK Proof Verified',
    message: (data) => `Your ZK proof for "${data.achievementCode}" was successfully verified.`,
    actionUrl: () => '/student/achievements',
    priority: 'NORMAL' as StudentNotificationPriority,
  },
  ZK_PROOF_FAILED: {
    title: 'ZK Proof Verification Failed',
    message: (data) => `ZK proof verification failed for "${data.achievementCode}". ${data.reason || ''}`,
    actionUrl: () => '/student/achievements',
    priority: 'HIGH' as StudentNotificationPriority,
  },
  ACHIEVEMENT_AWARDED: {
    title: 'New Achievement Awarded',
    message: (data) => `Congratulations! You have been awarded "${data.achievementTitle}".`,
    actionUrl: () => '/student/achievements',
    priority: 'NORMAL' as StudentNotificationPriority,
  },
  ENROLLMENT_ADDED: {
    title: 'New Course Enrollment',
    message: (data) => `You have been enrolled in "${data.courseName}".`,
    actionUrl: () => '/student/dashboard',
    priority: 'NORMAL' as StudentNotificationPriority,
  },
  SECURITY_NEW_LOGIN: {
    title: 'New Login Detected',
    message: (data) => `A new login was detected${data.location ? ` from ${data.location}` : ''}.`,
    actionUrl: () => '/student/account',
    priority: 'NORMAL' as StudentNotificationPriority,
  },
  SECURITY_WALLET_LINKED: {
    title: 'Wallet Linked',
    message: (data) => {
      const wallet = data.walletAddress as string | undefined;
      return wallet
        ? `Wallet ${wallet.slice(0, 8)}...${wallet.slice(-4)} has been linked to your account.`
        : 'A wallet has been linked to your account.';
    },
    actionUrl: () => '/student/account',
    priority: 'NORMAL' as StudentNotificationPriority,
  },
};
