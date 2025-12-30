'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { graphqlClient } from '@/lib/graphql-client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { TransactionDialog } from '@/components/solana/TransactionDialog';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Building2,
  Loader2,
  ArrowLeft,
  Wallet,
  Globe
} from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { approveUniversityOnChain } from '@/lib/solana/university';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useToast } from '@/hooks/useToast';

export default function ApproveUniversityPage() {
  const router = useRouter();
  const params = useParams();
  const universityId = params.id as string;
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const { loading: guardLoading } = useRoleGuard(['super_admin']);
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [university, setUniversity] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [superAdminWallet, setSuperAdminWallet] = useState<string | null>(null);

  // Transaction dialog state
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  useEffect(() => {
    if (guardLoading) return;
    loadUniversity();
    loadSuperAdminWallet();
  }, [universityId, guardLoading]);

  const loadUniversity = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await graphqlClient.getUniversity(universityId);

      if (response.errors?.length) {
        throw new Error(response.errors[0].message);
      }

      if (!response.data?.university) {
        throw new Error('University not found');
      }

      setUniversity(response.data.university);
    } catch (err: any) {
      setError(err.message || 'Failed to load university details');
    } finally {
      setLoading(false);
    }
  };

  const loadSuperAdminWallet = async () => {
    try {
      const response = await graphqlClient.getSuperAdminWallet();
      if (response.data?.getSuperAdminWallet) {
        setSuperAdminWallet(response.data.getSuperAdminWallet);
      }
    } catch (err: any) {
      // Silent fail
    }
  };

  const handleApprove = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet to approve universities');
      return;
    }

    // Validate that the connected wallet is the super admin wallet
    if (superAdminWallet && publicKey.toString() !== superAdminWallet) {
      setError(`Wrong wallet connected. Please connect the super admin wallet: ${superAdminWallet.slice(0, 4)}...${superAdminWallet.slice(-4)}`);
      return;
    }

    setError('');
    setShowTxDialog(true);
  };

  const executeApproval = async () => {
    if (!publicKey || !connection) {
      setTxError('Wallet not connected');
      return;
    }

    if (!university) {
      setTxError('University not loaded');
      return;
    }

    try {
      setTxLoading(true);
      setTxError(null);

      const universityAuthority = new PublicKey(university.walletAddress);

      // Step 1: Execute on-chain approval via the super admin wallet
      const { signature, universityPda, confirmationSource } = await approveUniversityOnChain({
        wallet,
        connection,
        universityAuthority,
      });

      const shortSig = `${signature.slice(0, 4)}...${signature.slice(-4)}`;

      if (confirmationSource !== 'helius') {
        const method =
          confirmationSource === 'rpc'
            ? 'RPC confirmation'
            : confirmationSource === 'rpc-status'
              ? 'signature status fallback'
              : 'wallet status fallback';
        toast.warning({
          title: 'Confirmed without Helius realtime channel',
          description: `The transaction was finalized via ${method}.`,
        });
      } else {
        toast.success({
          title: 'On-chain transaction confirmed',
          description: `Signature ${shortSig} was finalized via Helius.`,
        });
      }

      setTxSignature(signature);

      // Step 2: Persist to backend
      const approveResponse = await graphqlClient.approveUniversity({
        universityId,
        approvalSignature: signature,
        universityPda,
      });
      
      if (approveResponse.errors) {
        throw new Error(approveResponse.errors[0]?.message || 'Failed to approve university');
      }

      setTxSuccess(true);
      toast.success({
        title:
          university.status === 'SUSPENDED'
            ? 'University reactivated successfully'
            : 'University approved successfully',
        description: `On-chain signature ${shortSig} recorded and backend updated.`,
      });

      setTimeout(() => {
        loadUniversity();
        router.push('/admin/dashboard');
      }, 2000);

    } catch (err: any) {
      setTxError(err.message || 'Failed to approve university');
      toast.error({
        title: 'Approval failed',
        description: err?.message || 'An unexpected error occurred while approving the university.',
      });
    } finally {
      setTxLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await graphqlClient.rejectUniversity(universityId, rejectionReason);

      if (response.errors) {
        throw new Error(response.errors[0]?.message || 'Failed to reject university');
      }

      // Redirect to dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to reject university');
    } finally {
      setProcessing(false);
    }
  };

  const statusMeta = useMemo(() => {
    if (!university) return null;
    const map = {
      PENDING_APPROVAL: {
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        label: 'Pending Approval',
        description:
          'Run the approval transaction to activate this university on-chain.',
      },
      APPROVED: {
        badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        label: 'Approved',
        description:
          'This university is already active on-chain.',
      },
      REJECTED: {
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        label: 'Rejected',
        description:
          'You can approve this university again if the issues have been resolved.',
      },
      SUSPENDED: {
        badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        label: 'Suspended',
        description:
          'Reactivate this university by running the approval flow again.',
      },
    } as const;

    return map[university.status as keyof typeof map] ?? map.PENDING_APPROVAL;
  }, [university]);

  const canApprove =
    university?.status === 'PENDING_APPROVAL' ||
    university?.status === 'REJECTED' ||
    university?.status === 'SUSPENDED';

  const showRejectForm = university?.status === 'PENDING_APPROVAL';

  const approveButtonLabel =
    university?.status === 'SUSPENDED'
      ? 'Reactivate University'
      : 'Approve University';

  const dialogTitle =
    university?.status === 'SUSPENDED'
      ? 'Reactivate University'
      : 'Approve University';

  const dialogDescription =
    university?.status === 'SUSPENDED'
      ? 'Sign the transaction to reactivate this university on Solana.'
      : 'Sign the transaction to approve this university on Solana.';

  if (guardLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!university) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || 'University not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* University Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {university.name}
            </CardTitle>
            <Badge variant="default" className={statusMeta?.badge}>
              {statusMeta?.label}
            </Badge>
          </div>
        </CardHeader>
        <div className="space-y-4 p-6 pt-0">
          {statusMeta?.description && (
            <Alert>
              <AlertDescription>{statusMeta.description}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Domain</Label>
              <div className="flex items-center gap-2 mt-1">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{university.domain}</span>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Country</Label>
              <div className="mt-1">
                <span className="font-medium">{university.country}</span>
              </div>
            </div>

            <div className="col-span-2">
              <Label className="text-muted-foreground">Wallet Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {university.walletAddress}
                </code>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Registered On</Label>
              <div className="mt-1">
                <span className="font-medium">
                  {new Date(university.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {university.websiteUrl && (
              <div>
                <Label className="text-muted-foreground">Website</Label>
                <div className="mt-1">
                  <a 
                    href={university.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {university.websiteUrl}
                  </a>
                </div>
              </div>
            )}

            {university.rejectedReason && university.status !== 'APPROVED' && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">Last Review Notes</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {university.rejectedReason}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Review & Decision</CardTitle>
        </CardHeader>
        <div className="space-y-6 p-6 pt-0">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {canApprove && !connected && (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Please connect your wallet to approve this university</span>
                <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
              </AlertDescription>
            </Alert>
          )}

          {canApprove && connected && superAdminWallet && publicKey && publicKey.toString() !== superAdminWallet && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Wrong wallet connected</p>
                  <p className="text-sm">You connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</p>
                  <p className="text-sm">Expected super admin wallet: {superAdminWallet.slice(0, 4)}...{superAdminWallet.slice(-4)}</p>
                  <p className="text-sm mt-2">Please switch to the correct super admin wallet in your wallet app.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Approve Section */}
          <div className="space-y-3">
            <Button
              onClick={handleApprove}
              disabled={!canApprove || !connected || processing || (superAdminWallet && publicKey ? publicKey.toString() !== superAdminWallet : false)}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {approveButtonLabel}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {university.status === 'SUSPENDED'
                ? 'Reactivate this university to allow it to resume issuing certificates.'
                : 'Approving will activate the university and allow it to start issuing certificates.'}
            </p>
          </div>

          {showRejectForm && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Reject Section */}
              <div className="space-y-3">
                <Label htmlFor="rejection-reason">Reason for Rejection</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please provide a detailed reason for rejecting this university..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || processing}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject University
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Transaction Dialog */}
      <TransactionDialog
        open={showTxDialog}
        onOpenChange={setShowTxDialog}
        title={dialogTitle}
        description={dialogDescription}
        loading={txLoading}
        success={txSuccess}
        error={txError}
        signature={txSignature}
        onConfirm={executeApproval}
      />
    </div>
  );
}

