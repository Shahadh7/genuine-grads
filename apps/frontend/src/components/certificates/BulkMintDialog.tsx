'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Download, Pause, Play } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { graphqlClient } from '@/lib/graphql-client';
import { useToast } from '@/hooks/useToast';

interface BulkMintDialogProps {
  open: boolean;
  onClose: () => void;
  certificateIds: string[];
  onComplete: () => void;
}

interface CertificateProgress {
  certificateId: string;
  certificateNumber: string;
  studentName: string;
  studentWallet: string;
  badgeTitle: string;
  status: 'queued' | 'signing' | 'submitting' | 'confirming' | 'success' | 'failed';
  error?: string;
  signature?: string;
  attempts: number;
}

interface BatchJob {
  batchId: string;
  totalCertificates: number;
  estimatedTimeMinutes: number;
  certificates: Array<{
    certificateId: string;
    certificateNumber: string;
    studentName: string;
    studentWallet: string;
    badgeTitle: string;
  }>;
}

const CHUNK_SIZE = 5; // Sign 5 transactions at a time
const DELAY_BETWEEN_SUBMISSIONS = 2500; // 2.5 seconds between submissions
const MAX_RETRIES = 3;

export function BulkMintDialog({ open, onClose, certificateIds, onComplete }: BulkMintDialogProps) {
  const toast = useToast();
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const [progress, setProgress] = useState<CertificateProgress[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [universityMetadata, setUniversityMetadata] = useState<{
    universityId?: string;
    merkleTreeAddress?: string;
  }>({});

  // Initialize batch job
  useEffect(() => {
    if (open && certificateIds.length > 0) {
      initializeBatch();
    }
  }, [open, certificateIds]);

  const initializeBatch = async () => {
    try {
      const response = await graphqlClient.request<{ prepareBatchMinting: BatchJob }>(
        `
          mutation PrepareBatchMinting($certificateIds: [ID!]!) {
            prepareBatchMinting(certificateIds: $certificateIds) {
              batchId
              totalCertificates
              estimatedTimeMinutes
              certificates {
                certificateId
                certificateNumber
                studentName
                studentWallet
                badgeTitle
              }
            }
          }
        `,
        { certificateIds }
      );

      // Check for GraphQL errors
      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }

      const job = response.data?.prepareBatchMinting;

      if (!job) {
        throw new Error('No batch data received from server');
      }

      setBatchJob(job);

      // Fetch university metadata once at the start
      const universityInfo = await graphqlClient.request<any>(
        `
          query GetUniversityInfo {
            me {
              university {
                id
                merkleTreeAddress
              }
            }
          }
        `
      );

      setUniversityMetadata({
        universityId: universityInfo.data?.me?.university?.id,
        merkleTreeAddress: universityInfo.data?.me?.university?.merkleTreeAddress,
      });

      // Initialize progress tracking
      const initialProgress: CertificateProgress[] = job.certificates.map((cert) => ({
        ...cert,
        status: 'queued',
        attempts: 0,
      }));
      setProgress(initialProgress);
    } catch (error: any) {
      toast.error({
        title: 'Failed to prepare batch',
        description: error.message || 'Unable to prepare batch minting',
      });
      onClose();
    }
  };

  const startBatchMinting = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      toast.error({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to mint certificates',
      });
      return;
    }

    if (!batchJob) return;

    setIsProcessing(true);
    setIsPaused(false);

    // Process in chunks
    const chunks = chunkArray(batchJob.certificates, CHUNK_SIZE);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      if (isPaused) break;

      const chunk = chunks[chunkIndex];
      await processChunk(chunk, chunkIndex * CHUNK_SIZE);
    }

    setIsProcessing(false);
    setIsComplete(true);
  };

  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const processChunk = async (
    chunk: BatchJob['certificates'],
    startIndex: number
  ) => {
    try {
      // Step 1: Prepare all transactions for this chunk
      const transactionsToSign: VersionedTransaction[] = [];
      const certIndexMap: number[] = [];

      for (let i = 0; i < chunk.length; i++) {
        const cert = chunk[i];
        const index = startIndex + i;

        if (isPaused) break;

        // Update status to signing
        updateCertificateStatus(index, { status: 'signing' });

        try {
          // Request transaction from backend
          const txResponse = await graphqlClient.request<any>(
            `
              mutation MintCertificate($certificateId: ID!, $attachCollection: Boolean!) {
                mintCertificate(certificateId: $certificateId, attachCollection: $attachCollection) {
                  transaction
                  metadata
                }
              }
            `,
            { certificateId: cert.certificateId, attachCollection: true }
          );

          if (txResponse.errors) {
            throw new Error(txResponse.errors[0].message);
          }

          const transactionBase58 = txResponse.data?.mintCertificate.transaction;
          const transactionBuffer = bs58.decode(transactionBase58);
          const transaction = VersionedTransaction.deserialize(transactionBuffer);

          transactionsToSign.push(transaction);
          certIndexMap.push(index);
        } catch (error: any) {
          updateCertificateStatus(index, {
            status: 'failed',
            error: error.message || 'Failed to prepare transaction',
            attempts: progress[index].attempts + 1,
          });
          setFailedCount((prev) => prev + 1);
        }
      }

      // Step 2: Sign all transactions in this chunk at once
      if (transactionsToSign.length > 0 && signAllTransactions) {
        try {
          const signedTransactions = await signAllTransactions(transactionsToSign);

          // Step 3: Submit transactions sequentially with delays
          for (let i = 0; i < signedTransactions.length; i++) {
            if (isPaused) break;

            const signedTx = signedTransactions[i];
            const index = certIndexMap[i];
            const cert = chunk.find((c) => c.certificateId === progress[index].certificateId);

            if (!cert) continue;

            await submitTransaction(signedTx, cert, index);

            // Add delay between submissions (except for last one)
            if (i < signedTransactions.length - 1) {
              await delay(DELAY_BETWEEN_SUBMISSIONS);
            }
          }
        } catch (error: any) {
          // Mark all certs in chunk as failed
          certIndexMap.forEach((index) => {
            updateCertificateStatus(index, {
              status: 'failed',
              error: 'User rejected signing or signing failed',
              attempts: progress[index].attempts + 1,
            });
            setFailedCount((prev) => prev + 1);
          });
        }
      }
    } catch (error) {
      // Error processing chunk
    }
  };

  const submitTransaction = async (
    signedTx: VersionedTransaction,
    cert: BatchJob['certificates'][0],
    index: number
  ) => {
    try {
      // Update status to submitting
      updateCertificateStatus(index, { status: 'submitting' });

      // Submit to Solana
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Update status to confirming
      updateCertificateStatus(index, { status: 'confirming', signature });

      // Confirm transaction
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Notify backend of success
      await graphqlClient.request(
        `
          mutation UpdateBatchProgress(
            $batchId: ID!
            $certificateId: ID!
            $success: Boolean!
            $signature: String
          ) {
            updateBatchProgress(
              batchId: $batchId
              certificateId: $certificateId
              success: $success
              signature: $signature
            ) {
              processedCount
              successCount
              failedCount
            }
          }
        `,
        {
          batchId: batchJob!.batchId,
          certificateId: cert.certificateId,
          success: true,
          signature,
        }
      );

      // Confirm with backend - pass complete metadata for MintActivityLog update
      await graphqlClient.request(
        `
          mutation ConfirmTransaction($signature: String!, $operationType: String!, $metadata: JSON) {
            confirmTransaction(
              signature: $signature
              operationType: $operationType
              metadata: $metadata
            ) {
              success
              message
            }
          }
        `,
        {
          signature,
          operationType: 'mint_certificate',
          metadata: {
            certificateId: cert.certificateId,
            certificateNumber: cert.certificateNumber,
            studentWallet: cert.studentWallet,
            universityId: universityMetadata.universityId,
            merkleTreeAddress: universityMetadata.merkleTreeAddress,
          },
        }
      );

      // Success!
      updateCertificateStatus(index, { status: 'success', signature });
      setSuccessCount((prev) => prev + 1);
      setCurrentIndex(index + 1);
    } catch (error: any) {
      const attempts = progress[index].attempts + 1;

      // Update backend about failure
      await graphqlClient.request(
        `
          mutation UpdateBatchProgress(
            $batchId: ID!
            $certificateId: ID!
            $success: Boolean!
            $error: String
          ) {
            updateBatchProgress(
              batchId: $batchId
              certificateId: $certificateId
              success: $success
              error: $error
            ) {
              processedCount
              successCount
              failedCount
            }
          }
        `,
        {
          batchId: batchJob!.batchId,
          certificateId: cert.certificateId,
          success: false,
          error: error.message || 'Transaction submission failed',
        }
      );

      // Retry logic
      if (attempts < MAX_RETRIES) {
        updateCertificateStatus(index, {
          status: 'queued',
          error: `Retry ${attempts}/${MAX_RETRIES}`,
          attempts,
        });
        // TODO: Implement retry in next chunk
      } else {
        updateCertificateStatus(index, {
          status: 'failed',
          error: error.message || 'Transaction submission failed',
          attempts,
        });
        setFailedCount((prev) => prev + 1);
      }
    }
  };

  const updateCertificateStatus = (index: number, updates: Partial<CertificateProgress>) => {
    setProgress((prev) => {
      const newProgress = [...prev];
      newProgress[index] = { ...newProgress[index], ...updates };
      return newProgress;
    });
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleCancel = async () => {
    if (batchJob && isProcessing) {
      try {
        await graphqlClient.request(
          `
            mutation CancelBatchJob($batchId: ID!) {
              cancelBatchJob(batchId: $batchId) {
                id
                status
              }
            }
          `,
          { batchId: batchJob.batchId }
        );
      } catch (error) {
        // Failed to cancel batch job
      }
    }
    onClose();
  };

  const handleDownloadReport = () => {
    const report = {
      batchId: batchJob?.batchId,
      totalCertificates: progress.length,
      successCount,
      failedCount,
      timestamp: new Date().toISOString(),
      results: progress.map((p) => ({
        certificateNumber: p.certificateNumber,
        studentName: p.studentName,
        status: p.status,
        error: p.error,
        signature: p.signature,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-mint-report-${batchJob?.batchId || 'unknown'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const progressPercentage = progress.length > 0 ? (currentIndex / progress.length) * 100 : 0;

  const getStatusIcon = (status: CertificateProgress['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'signing':
      case 'submitting':
      case 'confirming':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: CertificateProgress['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Minted</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'signing':
        return <Badge className="bg-blue-500">Signing...</Badge>;
      case 'submitting':
        return <Badge className="bg-blue-500">Submitting...</Badge>;
      case 'confirming':
        return <Badge className="bg-blue-500">Confirming...</Badge>;
      default:
        return <Badge variant="secondary">Queued</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Certificate Minting</DialogTitle>
          <DialogDescription>
            {!isComplete
              ? `Minting ${certificateIds.length} certificates. Estimated time: ${batchJob?.estimatedTimeMinutes || 0} minutes.`
              : 'Batch minting complete'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Progress Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {currentIndex} / {progress.length}</span>
              <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 dark:text-green-400">✓ Success: {successCount}</span>
              <span className="text-red-600 dark:text-red-400">✗ Failed: {failedCount}</span>
              <span className="text-muted-foreground">⏳ Remaining: {progress.length - currentIndex}</span>
            </div>
          </div>

          {/* Certificate List */}
          <ScrollArea className="flex-1 border rounded-lg p-4">
            <div className="space-y-2">
              {progress.map((cert, index) => (
                <div
                  key={cert.certificateId}
                  className={`flex items-center justify-between p-3 rounded border ${
                    cert.status === 'success'
                      ? 'bg-green-950/20 border-green-800 dark:bg-green-950/30 dark:border-green-900'
                      : cert.status === 'failed'
                      ? 'bg-red-950/20 border-red-800 dark:bg-red-950/30 dark:border-red-900'
                      : 'bg-muted/50 border-muted'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(cert.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cert.studentName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cert.certificateNumber} • {cert.badgeTitle}
                      </p>
                      {cert.error && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{cert.error}</p>
                      )}
                      {cert.signature && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 truncate">
                          Tx: {cert.signature.slice(0, 8)}...{cert.signature.slice(-8)}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(cert.status)}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isProcessing && !isComplete && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={startBatchMinting} disabled={!publicKey}>
                {!publicKey ? 'Connect Wallet' : 'Start Minting'}
              </Button>
            </>
          )}

          {isProcessing && !isComplete && (
            <>
              <Button variant="outline" onClick={handlePauseResume}>
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button variant="destructive" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          )}

          {isComplete && (
            <>
              <Button variant="outline" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
              >
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
