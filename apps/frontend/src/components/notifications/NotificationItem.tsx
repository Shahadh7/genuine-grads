'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCheck,
  Award,
  XCircle,
  CheckCircle,
  Ban,
  Shield,
  AlertTriangle,
  Bell,
  Trophy,
  BookOpen,
  UserPlus,
  Wallet,
  Megaphone,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Notification } from '@/contexts/NotificationContext';

// Map notification types to icons
const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  CERTIFICATE_ISSUED: FileCheck,
  CERTIFICATE_MINTED: Award,
  CERTIFICATE_REVOKED: XCircle,
  CERTIFICATE_VERIFIED: CheckCircle,
  BATCH_JOB_COMPLETED: CheckCircle,
  BATCH_JOB_FAILED: XCircle,
  UNIVERSITY_REGISTERED: BookOpen,
  UNIVERSITY_APPROVED: CheckCircle,
  UNIVERSITY_REJECTED: XCircle,
  UNIVERSITY_SUSPENDED: Ban,
  ZK_COMMITMENT_REGISTERED: Shield,
  ZK_PROOF_UPLOADED: Shield,
  ZK_PROOF_VERIFIED: Shield,
  ZK_PROOF_FAILED: AlertTriangle,
  ACHIEVEMENT_AWARDED: Trophy,
  ENROLLMENT_ADDED: UserPlus,
  SECURITY_LOGIN_FAILED: AlertTriangle,
  SECURITY_ACCOUNT_LOCKED: Ban,
  SECURITY_NEW_DEVICE: AlertTriangle,
  SECURITY_NEW_LOGIN: UserPlus,
  SECURITY_WALLET_LINKED: Wallet,
  SYSTEM_ANNOUNCEMENT: Megaphone,
};

// Priority styling
const priorityStyles: Record<string, { border: string; bg: string }> = {
  LOW: { border: 'border-l-gray-300 dark:border-l-gray-600', bg: '' },
  NORMAL: { border: 'border-l-blue-500', bg: '' },
  HIGH: { border: 'border-l-orange-500', bg: 'bg-orange-50/50 dark:bg-orange-900/10' },
  URGENT: { border: 'border-l-red-500', bg: 'bg-red-50/50 dark:bg-red-900/10' },
};

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  onMarkRead?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onClick,
  onMarkRead,
  onDelete,
  showActions = false,
  compact = false,
}: NotificationItemProps) {
  const router = useRouter();
  const Icon = typeIcons[notification.type] || Bell;
  const priority = priorityStyles[notification.priority] || priorityStyles.NORMAL;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    if (!notification.read && onMarkRead) {
      onMarkRead();
    }
  };

  return (
    <div
      className={cn(
        'p-3 border-l-4 cursor-pointer hover:bg-muted/50 transition-colors',
        priority.border,
        priority.bg,
        !notification.read && 'bg-muted/30'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-full flex-shrink-0',
            notification.read ? 'bg-muted' : 'bg-primary/10'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4',
              notification.read ? 'text-muted-foreground' : 'text-primary'
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm leading-tight',
                !notification.read && 'font-medium'
              )}
            >
              {notification.title}
            </p>
            {!notification.read && (
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
            )}
          </div>

          {!compact && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {notification.message}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>

        {showActions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
