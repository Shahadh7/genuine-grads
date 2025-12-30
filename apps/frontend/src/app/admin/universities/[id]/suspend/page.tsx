'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { graphqlClient } from '@/lib/graphql-client';
import { TransactionDialog } from '@/components/solana/TransactionDialog';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { deactivateUniversityOnChain } from '@/lib/solana/university';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useToast } from '@/hooks/useToast';
import {
  Ban,
  AlertTriangle,
  Building2,
  Loader2,
  ArrowLeft,
  Wallet,
  Shield,
} from 'lucide-react';

export default function SuspendUniversityPage() {
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
  const [reason, setReason] = useState('');
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
      const response = await graphqlClient.getAllUniversities();
      const uni = response.data?.allUniversities?.find((u: any) => u.id === universityId);

      if (uni) {
        setUniversity(uni);
      } else {
        setError('University not found');
      }
    } catch (err) {
      // Silent fail
      setError('Failed to load university details');
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

  const handleSuspend = () => {
    if (!reason.trim()) {
      setError('Please provide a reason for suspension');
      return;
    }

    if (!connected || !publicKey) {
      setError('Please connect the super admin wallet before suspending a university');
      return;
    }

    // Validate that the connected wallet is the super admin wallet
    if (superAdminWallet && publicKey.toString() !== superAdminWallet) {
      setError(`Wrong wallet connected. Please connect the super admin wallet: ${superAdminWallet.slice(0, 4)}...${superAdminWallet.slice(-4)}`);
      return;
    }

    setError('');
    setTxSignature(null);
    setTxSuccess(false);
    setTxError(null);
    setShowTxDialog(true);
  };

  const executeSuspension = async () => {
    if (!connection || !publicKey) {
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

      // Step 1: Execute on-chain deactivation via super admin wallet
      const { signature, universityPda, confirmationSource } = await deactivateUniversityOnChain({
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
          title: 'On-chain suspension confirmed',
          description: `Signature ${shortSig} was finalized via Helius.`,
        });
      }

      setTxSignature(signature);

      // Step 2: Persist suspension in backend
      const suspendResponse = await graphqlClient.suspendUniversity({
        universityId,
        deactivationSignature: signature,
        universityPda,
        reason,
      });

      if (suspendResponse.errors) {
        throw new Error(suspendResponse.errors[0]?.message || 'Failed to suspend university');
      }

      setTxSuccess(true);
      toast.success({
        title: 'University suspended successfully',
        description: `On-chain signature ${shortSig} recorded and backend updated.`,
      });

      setTimeout(() => {
        loadUniversity();
        router.push('/admin/dashboard');
      }, 2000);
    } catch (err: any) {
      setTxError(err.message || 'Failed to suspend university');
      toast.error({
        title: 'Suspension failed',
        description: err?.message || 'An unexpected error occurred while suspending the university.',
      });
    } finally {
      setTxLoading(false);
    }
  };

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

      {/* Warning Alert */}
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> Suspending this university will immediately prevent them from issuing new certificates. Existing certificates will remain valid.
        </AlertDescription>
      </Alert>

      {/* University Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {university.name}
            </CardTitle>
            <Badge variant="default" className="bg-green-100 text-green-800">
              {university.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Domain</Label>
              <div className="mt-1">
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

            {university.approvedAt && (
              <div>
                <Label className="text-muted-foreground">Approved On</Label>
                <div className="mt-1">
                  <span className="font-medium">
                    {new Date(university.approvedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suspension Form */}
      <Card>
        <CardHeader>
          <CardTitle>Suspend University</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!connected && (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Please connect the configured super admin wallet to suspend this university</span>
                <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
              </AlertDescription>
            </Alert>
          )}

          {connected && superAdminWallet && publicKey && publicKey.toString() !== superAdminWallet && (
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

          <div className="space-y-3">
            <Label htmlFor="suspension-reason">
              Reason for Suspension <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="suspension-reason"
              placeholder="Please provide a detailed reason for suspending this university..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={6}
            />
            <p className="text-sm text-muted-foreground">
              This reason will be logged and may be shared with the university.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/dashboard')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={!reason.trim() || txLoading || !connected || (superAdminWallet && publicKey ? publicKey.toString() !== superAdminWallet : false)}
              variant="destructive"
              className="flex-1"
            >
              <Ban className="h-4 w-4 mr-2" />
              Suspend University
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Dialog */}
      <TransactionDialog
        open={showTxDialog}
        onOpenChange={setShowTxDialog}
        title="Suspend University"
        description="Sign the transaction to deactivate this university on Solana"
        loading={txLoading}
        success={txSuccess}
        error={txError}
        signature={txSignature}
        onConfirm={executeSuspension}
      />
    </div>
  );
}

