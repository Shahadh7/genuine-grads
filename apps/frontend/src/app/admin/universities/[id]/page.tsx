'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { graphqlClient } from '@/lib/graphql-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  ArrowLeft,
  Building2,
  Globe,
  Wallet,
  CalendarDays,
  CheckCircle,
  Ban,
  RefreshCcw,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type UniversityDetails = {
  id: string;
  name: string;
  domain: string;
  country: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  walletAddress: string;
  universityPDA?: string | null;
  merkleTreeAddress?: string | null;
  collectionAddress?: string | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
  approvedAt?: string | null;
  registrationTxSignature?: string | null;
  approvalTxSignature?: string | null;
  deactivationTxSignature?: string | null;
  rejectedReason?: string | null;
  databaseName?: string | null;
  databaseUrl?: string | null;
  superAdminPubkey?: string | null;
  admins: Array<{
    id: string;
    email: string;
    fullName?: string | null;
    isSuperAdmin: boolean;
  }>;
  mintLogs: Array<{
    id: string;
    badgeTitle: string;
    status: string;
    transactionSignature?: string | null;
    timestamp: string;
  }>;
};

const STATUS_META: Record<
  UniversityDetails['status'],
  { label: string; badgeClass: string; description: string }
> = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description:
      'This university has completed registration and is awaiting on-chain approval.',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description:
      'University is fully active and can issue certificates on-chain.',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    description:
      'This university was rejected during review. You can revisit the approval process at any time.',
  },
  SUSPENDED: {
    label: 'Suspended',
    badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    description:
      'University is temporarily deactivated on-chain and cannot issue new certificates until reactivated.',
  },
};

const EXPLORER_BASE = 'https://explorer.solana.com/tx';

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : '—';

const truncate = (value?: string | null, chars = 6) => {
  if (!value) return '—';
  if (value.length <= chars * 2) return value;
  return `${value.slice(0, chars)}…${value.slice(-chars)}`;
};

export default function UniversityDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const universityId = params.id as string;
  const { loading: guardLoading } = useRoleGuard(['super_admin']);

  const [loading, setLoading] = useState(true);
  const [university, setUniversity] = useState<UniversityDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await graphqlClient.getUniversity(universityId);
        if (response.errors?.length) {
          throw new Error(response.errors[0].message);
        }
        if (!response.data?.university) {
          throw new Error('University data not available');
        }
        setUniversity(response.data.university as UniversityDetails);
      } catch (err: any) {
        console.error('Failed to load university', err);
        setError(err.message || 'Failed to load university');
      } finally {
        setLoading(false);
      }
    };

    if (universityId && !guardLoading) {
      load();
    }
  }, [universityId, guardLoading]);

  const statusMeta = useMemo(() => {
    if (!university) return null;
    return STATUS_META[university.status];
  }, [university]);

  const goBack = () => router.push('/admin/dashboard');
  const gotoApprove = () => router.push(`/admin/universities/${universityId}/approve`);
  const gotoSuspend = () => router.push(`/admin/universities/${universityId}/suspend`);

  const renderActionButtons = () => {
    if (!university) return null;

    const actions: Array<{
      label: string;
      description: string;
      icon: React.ElementType;
      variant?: 'destructive' | 'outline' | 'default';
      onClick: () => void;
    }> = [];

    if (university.status === 'PENDING_APPROVAL' || university.status === 'REJECTED') {
      actions.push({
        label: 'Review & Approve',
        description: 'Run the on-chain approval / reactivation flow for this university.',
        icon: CheckCircle,
        variant: 'default',
        onClick: gotoApprove,
      });
    }

    if (university.status === 'APPROVED') {
      actions.push({
        label: 'Suspend University',
        description: 'Initiate the on-chain deactivation flow to suspend operations.',
        icon: Ban,
        variant: 'destructive',
        onClick: gotoSuspend,
      });
    }

    if (university.status === 'SUSPENDED') {
      actions.push({
        label: 'Reactivate University',
        description: 'Resume operations by running the approval flow again.',
        icon: RefreshCcw,
        variant: 'default',
        onClick: gotoApprove,
      });
    }

    if (actions.length === 0) {
      return (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No immediate actions are available for this university in its current state.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <div
              key={action.label}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-muted p-2">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{action.label}</p>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
              <Button variant={action.variant} onClick={action.onClick} className="w-full md:w-auto">
                <Icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  if (guardLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !university || !statusMeta) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={goBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'University could not be loaded.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={goBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              {university.name}
            </h1>
            <Badge variant="outline" className={statusMeta.badgeClass}>
              {statusMeta.label}
            </Badge>
          </div>
          <p className="mt-2 text-muted-foreground max-w-xl">{statusMeta.description}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span className="font-medium">Domain:</span>
              <span>{university.domain}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">Country:</span>
              <span>{university.country}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="font-medium">Wallet:</span>
              <code>{university.walletAddress}</code>
            </div>
            {university.websiteUrl && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <span className="font-medium">Website:</span>
                <a
                  href={university.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                >
                  {university.websiteUrl}
                </a>
              </div>
            )}
            <Divider />
            <div className="space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="font-medium">Registered:</span>
                <span>{formatDate(university.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Approved:</span>
                <span>{formatDate(university.approvedAt)}</span>
              </div>
              {university.rejectedReason && (
                <div>
                  <span className="font-medium text-red-500">Last Decision Notes:</span>
                  <p className="text-sm">{university.rejectedReason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>On-Chain References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="University PDA" value={university.universityPDA} />
            <InfoRow label="Merkle Tree" value={university.merkleTreeAddress} />
            <InfoRow label="Collection" value={university.collectionAddress} />
            <Divider />
            <TxRow label="Registration Tx" signature={university.registrationTxSignature} />
            <TxRow label="Approval Tx" signature={university.approvalTxSignature} />
            <TxRow label="Deactivation Tx" signature={university.deactivationTxSignature} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Actions</CardTitle>
        </CardHeader>
        <CardContent>{renderActionButtons()}</CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Administrators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {university.admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No administrators found.</p>
            ) : (
              university.admins.map((admin) => (
                <div key={admin.id} className="border rounded-lg p-3">
                  <p className="font-medium">{admin.fullName || 'Administrator'}</p>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                  {admin.isSuperAdmin && (
                    <Badge variant="secondary" className="mt-2">
                      Super Admin
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Mint Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {university.mintLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No mint activity recorded for this university.
              </p>
            ) : (
              university.mintLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 space-y-1">
                  <p className="font-medium">{log.badgeTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(log.timestamp)} — {log.status}
                  </p>
                  <TxRow label="Signature" signature={log.transactionSignature} compact />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-border" />;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <code className="text-xs">{truncate(value)}</code>
    </div>
  );
}

function TxRow({
  label,
  signature,
  compact,
}: {
  label: string;
  signature?: string | null;
  compact?: boolean;
}) {
  if (!signature) {
    return (
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>{label}</span>
        <span>—</span>
      </div>
    );
  }

  const explorerUrl = `${EXPLORER_BASE}/${signature}?cluster=devnet`;

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-primary hover:underline"
      >
        <code className={compact ? 'text-[10px]' : 'text-xs'}>{truncate(signature)}</code>
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

