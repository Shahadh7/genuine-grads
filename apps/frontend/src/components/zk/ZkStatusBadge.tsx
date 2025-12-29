'use client';

import { Shield, ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react';

export type ZkStatus = 'not_enabled' | 'proof_available' | 'verified' | 'failed';

interface ZkStatusBadgeProps {
  status: ZkStatus;
  verificationCount?: number;
  className?: string;
}

const statusConfig: Record<
  ZkStatus,
  {
    label: string;
    icon: typeof Shield;
    className: string;
  }
> = {
  not_enabled: {
    label: 'Not Enabled',
    icon: Shield,
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  proof_available: {
    label: 'Proof Available',
    icon: ShieldAlert,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  verified: {
    label: 'ZK Verified',
    icon: ShieldCheck,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  failed: {
    label: 'Verification Failed',
    icon: ShieldX,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function ZkStatusBadge({
  status,
  verificationCount,
  className = '',
}: ZkStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.className} ${className}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
      {verificationCount !== undefined && verificationCount > 0 && (
        <span className="ml-1 opacity-70">({verificationCount})</span>
      )}
    </span>
  );
}

/**
 * Helper to determine ZK status from achievement data
 */
export function getZkStatus(achievement: {
  zkEnabled?: boolean;
  hasCommitment?: boolean;
  hasProof?: boolean;
  lastVerifiedAt?: string | null;
}): ZkStatus {
  if (!achievement.zkEnabled && !achievement.hasCommitment) {
    return 'not_enabled';
  }
  if (achievement.hasProof && achievement.lastVerifiedAt) {
    return 'verified';
  }
  if (achievement.hasProof) {
    return 'proof_available';
  }
  return 'not_enabled';
}
