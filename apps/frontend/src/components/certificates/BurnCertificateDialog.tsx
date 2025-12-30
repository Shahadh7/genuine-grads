'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, VersionedTransaction, Transaction } from '@solana/web3.js';
import { graphqlClient } from '@/lib/graphql-client';
import { useToast } from '@/hooks/useToast';
import bs58 from 'bs58';

// Helper to wait for ALT to be active on-chain (Solana requires ~1-2 slots)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle2, Flame } from 'lucide-react';

interface Certificate {
  id: string;
  badgeTitle: string;
  certificateNumber?: string | null;
  mintAddress?: string | null;
  status: string;
  revoked?: boolean;
  student?: {
    fullName?: string | null;
    walletAddress?: string | null;
  } | null;
}

interface BurnCertificateDialogProps {
  certificate: Certificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BurnCertificateDialog({
  certificate,
  open,
  onOpenChange,
  onSuccess,
}: BurnCertificateDialogProps) {
  const { publicKey, signTransaction } = useWallet();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'confirm' | 'creating_alt' | 'burning' | 'success' | 'error'>('confirm');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setAdminPassword('');
      setCurrentStep('confirm');
      setSignature(null);
      setError(null);
      setStatusMessage('');
      onOpenChange(false);
    }
  };

  const handleBurn = async () => {
    if (!certificate || !publicKey || !signTransaction) {
      toast.error({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to burn certificates.',
      });
      return;
    }

    if (!reason.trim()) {
      toast.error({
        title: 'Reason required',
        description: 'Please provide a reason for burning this certificate.',
      });
      return;
    }

    if (!adminPassword.trim()) {
      toast.error({
        title: 'Password required',
        description: 'Please enter your admin password to confirm.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Use the workflow to get prerequisites and burn transaction
      setStatusMessage('Preparing burn transaction...');
      const workflowResponse = await graphqlClient.prepareBurnCertificateWorkflow(
        certificate.id,
        reason
      );

      if (!workflowResponse.data?.prepareBurnCertificateWorkflow) {
        throw new Error('Failed to prepare burn workflow');
      }

      const { prerequisites, burn } = workflowResponse.data.prepareBurnCertificateWorkflow;

      // Step 2: Execute prerequisites (ALT creation) if any
      if (prerequisites.length > 0) {
        setCurrentStep('creating_alt');

        for (const prereq of prerequisites) {
          setStatusMessage(`${prereq.message}...`);

          // Deserialize and sign the prerequisite transaction (legacy transaction for ALT)
          const prereqBuffer = bs58.decode(prereq.transaction);
          const prereqTx = Transaction.from(prereqBuffer);

          // Sign the transaction
          const signedPrereq = await signTransaction(prereqTx);
          const signedPrereqBase58 = bs58.encode(signedPrereq.serialize());

          // Submit to backend
          const prereqSubmitResponse = await graphqlClient.submitSignedTransaction({
            signedTransaction: signedPrereqBase58,
            operationType: prereq.operationType,
            metadata: prereq.metadata,
          });

          if (!prereqSubmitResponse.data?.submitSignedTransaction?.success) {
            throw new Error(
              prereqSubmitResponse.data?.submitSignedTransaction?.message ||
              `Prerequisite ${prereq.operationType} failed`
            );
          }

          // Wait for ALT to be active on-chain (takes a few slots)
          if (prereq.operationType === 'create_address_lookup_table') {
            setStatusMessage('Waiting for Address Lookup Table to activate...');
            await sleep(3000); // Wait 3 seconds for ALT to be active
          }
        }

        // Re-fetch the burn transaction now that ALT exists
        setStatusMessage('Preparing burn transaction with optimized size...');
        const burnResponse = await graphqlClient.prepareBurnCertificateWorkflow(
          certificate.id,
          reason
        );

        if (!burnResponse.data?.prepareBurnCertificateWorkflow?.burn) {
          throw new Error('Failed to prepare burn transaction after ALT creation');
        }

        // Use the new burn transaction
        const { burn: burnTx } = burnResponse.data.prepareBurnCertificateWorkflow;

        setCurrentStep('burning');
        setStatusMessage('Burning certificate...');

        // Deserialize and sign the burn transaction (versioned transaction)
        const burnBuffer = bs58.decode(burnTx.transaction);
        const versionedTransaction = VersionedTransaction.deserialize(burnBuffer);
        const signedBurn = await signTransaction(versionedTransaction);
        const signedBurnBase58 = bs58.encode(signedBurn.serialize());

        // Submit burn transaction
        const burnSubmitResponse = await graphqlClient.submitSignedTransaction({
          signedTransaction: signedBurnBase58,
          operationType: 'burn_certificate',
          metadata: burnTx.metadata,
        });

        if (!burnSubmitResponse.data?.submitSignedTransaction?.success) {
          throw new Error(
            burnSubmitResponse.data?.submitSignedTransaction?.message || 'Burn transaction failed'
          );
        }

        const txSignature = burnSubmitResponse.data.submitSignedTransaction.signature;
        setSignature(txSignature);
        setCurrentStep('success');
      } else if (burn) {
        // No prerequisites, execute burn directly
        setCurrentStep('burning');
        setStatusMessage('Burning certificate...');

        // Deserialize and sign the burn transaction (versioned transaction)
        const burnBuffer = bs58.decode(burn.transaction);
        const versionedTransaction = VersionedTransaction.deserialize(burnBuffer);
        const signedBurn = await signTransaction(versionedTransaction);
        const signedBurnBase58 = bs58.encode(signedBurn.serialize());

        // Submit burn transaction
        const burnSubmitResponse = await graphqlClient.submitSignedTransaction({
          signedTransaction: signedBurnBase58,
          operationType: 'burn_certificate',
          metadata: burn.metadata,
        });

        if (!burnSubmitResponse.data?.submitSignedTransaction?.success) {
          throw new Error(
            burnSubmitResponse.data?.submitSignedTransaction?.message || 'Burn transaction failed'
          );
        }

        const txSignature = burnSubmitResponse.data.submitSignedTransaction.signature;
        setSignature(txSignature);
        setCurrentStep('success');
      } else {
        throw new Error('No burn transaction available');
      }

      toast.success({
        title: 'Certificate burned successfully!',
        description: 'The certificate has been permanently destroyed on-chain.',
      });

      // Wait a bit before calling onSuccess to let user see the success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to burn certificate');
      setCurrentStep('error');
      toast.error({
        title: 'Failed to burn certificate',
        description: err.message || 'An error occurred while burning the certificate.',
      });
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'confirm':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Flame className="h-5 w-5" />
                Burn Certificate
              </DialogTitle>
              <DialogDescription>
                This action will permanently destroy the certificate NFT on the blockchain and mark it
                as revoked. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {certificate && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This will permanently burn the certificate for{' '}
                    <strong>{certificate.student?.fullName ?? 'Unknown Student'}</strong> ({certificate.badgeTitle}).
                  </AlertDescription>
                </Alert>

                <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certificate Number:</span>
                    <span className="font-medium">{certificate.certificateNumber ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium">{certificate.badgeTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student:</span>
                    <span className="font-medium">{certificate.student?.fullName ?? 'Unknown Student'}</span>
                  </div>
                  {certificate.mintAddress && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mint Address:</span>
                      <span className="font-mono text-xs truncate max-w-[200px]">
                        {certificate.mintAddress}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Burn Reason *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter the reason for burning this certificate..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This reason will be permanently stored in the blockchain event and revocation index.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Admin Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBurn}
                disabled={isLoading || !reason.trim() || !adminPassword.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Burning...
                  </>
                ) : (
                  <>
                    <Flame className="mr-2 h-4 w-4" />
                    Burn Certificate
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        );

      case 'creating_alt':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Setting Up Transaction Optimization</DialogTitle>
              <DialogDescription>
                Creating an Address Lookup Table to enable certificate burning...
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div className="text-center space-y-2">
                <p className="font-medium">One-time setup in progress</p>
                <p className="text-sm text-muted-foreground">
                  {statusMessage || 'Creating Address Lookup Table...'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This is required once per university to enable certificate burning.
                </p>
              </div>
            </div>
          </>
        );

      case 'burning':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Burning Certificate</DialogTitle>
              <DialogDescription>
                Please wait while the certificate is being burned...
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-red-600" />
              <div className="text-center space-y-2">
                <p className="font-medium">Processing burn transaction</p>
                <p className="text-sm text-muted-foreground">
                  {statusMessage || 'Please approve the transaction in your wallet and wait for confirmation...'}
                </p>
              </div>
            </div>
          </>
        );

      case 'success':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Certificate Burned Successfully
              </DialogTitle>
              <DialogDescription>
                The certificate has been permanently destroyed and marked as revoked.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  The certificate NFT has been burned on-chain and the revocation has been recorded.
                </AlertDescription>
              </Alert>

              {signature && (
                <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
                  <div className="font-medium">Transaction Signature:</div>
                  <code className="block p-2 bg-background rounded text-xs break-all">
                    {signature}
                  </code>
                  <a
                    href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm inline-block mt-2"
                  >
                    View on Solana Explorer →
                  </a>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        );

      case 'error':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Burn Failed
              </DialogTitle>
              <DialogDescription>
                There was an error burning the certificate.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error || 'Unknown error occurred'}</AlertDescription>
              </Alert>

              <p className="text-sm text-muted-foreground">
                The certificate was not burned. Please try again or contact support if the problem
                persists.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setCurrentStep('confirm');
                  setError(null);
                }}
              >
                Try Again
              </Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">{renderContent()}</DialogContent>
    </Dialog>
  );
}
