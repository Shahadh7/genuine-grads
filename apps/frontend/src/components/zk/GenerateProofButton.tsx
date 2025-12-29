'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { FileKey, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { graphqlClient } from '@/lib/graphql-client';
import { deriveSecrets } from '@/lib/zk/deterministic-secrets';
import { computeCommitment, ComputedCommitment } from '@/lib/zk/commitment';
import {
  generateProofPack,
  ProofGenerationProgress,
} from '@/lib/zk/proof-generator';

interface GenerateProofButtonProps {
  credentialId: string; // mintAddress
  achievements: string[]; // Array of achievement badgeTitles
  studentWalletAddress?: string | null; // Student's registered wallet address
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  hasProofs?: boolean;
}

interface ProgressState {
  currentAchievement: string;
  stage: string;
  percent: number;
  completed: number;
  total: number;
}

export function GenerateProofButton({
  credentialId,
  achievements,
  studentWalletAddress,
  onSuccess,
  onError,
  disabled = false,
  hasProofs = false,
}: GenerateProofButtonProps) {
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleGenerateProofs = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      onError?.('Please connect your wallet first');
      return;
    }

    // Security: Validate connected wallet matches student's registered wallet
    if (studentWalletAddress && wallet.publicKey.toBase58() !== studentWalletAddress) {
      onError?.('Connected wallet does not match your registered wallet. Please connect the wallet associated with your student account.');
      return;
    }

    if (achievements.length === 0) {
      onError?.('No achievements to generate proofs for');
      return;
    }

    setIsLoading(true);
    setShowDialog(true);
    setError(null);
    setIsComplete(false);
    setProgress({
      currentAchievement: '',
      stage: 'Requesting wallet signature...',
      percent: 0,
      completed: 0,
      total: achievements.length,
    });

    try {
      // Step 1: Derive secrets from wallet signature
      const secrets = await deriveSecrets(wallet, credentialId);

      setProgress((p) => ({
        ...p!,
        stage: 'Computing commitments...',
        percent: 5,
      }));

      // Step 2: Compute commitments for all achievements
      const achievementsWithCommitments: Array<{
        code: string;
        commitment: ComputedCommitment;
      }> = [];

      for (const achievementCode of achievements) {
        const commitment = await computeCommitment({
          credentialId,
          studentSecret: secrets.studentSecret,
          salt: secrets.salt,
          achievementCode,
        });
        achievementsWithCommitments.push({
          code: achievementCode,
          commitment,
        });
      }

      // Step 3: Generate proofs
      const proofs = await generateProofPack({
        credentialId,
        studentSecret: secrets.studentSecret,
        salt: secrets.salt,
        achievements: achievementsWithCommitments,
        onProgress: (achievementCode, prg) => {
          const completedCount = achievementsWithCommitments.findIndex(
            (a) => a.code === achievementCode
          );
          setProgress({
            currentAchievement: achievementCode,
            stage: prg.message,
            percent: prg.percent,
            completed: completedCount,
            total: achievements.length,
          });
        },
      });

      setProgress((p) => ({
        ...p!,
        stage: 'Uploading proofs...',
        percent: 95,
      }));

      // Step 4: Upload proofs to backend
      const inputs = proofs.map((proof) => ({
        credentialId,
        achievementCode: proof.achievementCode,
        proof: proof.proof,
        publicSignals: proof.publicSignals,
      }));

      const response = await graphqlClient.uploadAchievementProofsBatch(inputs);

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      // Check for failures
      const results = response.data?.uploadAchievementProofsBatch || [];
      const failures = results.filter((r) => !r.success);

      if (failures.length > 0) {
        throw new Error(
          `Failed to upload some proofs: ${failures[0].message}`
        );
      }

      setProgress((p) => ({
        ...p!,
        stage: 'Complete!',
        percent: 100,
        completed: achievements.length,
      }));
      setIsComplete(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('Error generating proofs:', err);
      setError(err.message || 'Failed to generate proofs');
      onError?.(err.message || 'Failed to generate proofs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setProgress(null);
    setError(null);
    setIsComplete(false);
  };

  return (
    <>
      <Button
        variant={hasProofs ? 'outline' : 'default'}
        onClick={handleGenerateProofs}
        disabled={disabled || isLoading || !wallet.connected}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileKey className="w-4 h-4" />
            {hasProofs ? 'Regenerate Proofs' : 'Generate Proof Pack'}
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isComplete ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Proofs Generated Successfully
                </span>
              ) : error ? (
                <span className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  Generation Failed
                </span>
              ) : (
                'Generating ZK Proofs'
              )}
            </DialogTitle>
            <DialogDescription>
              {isComplete
                ? 'Your ZK proofs have been generated and uploaded. Employers can now verify your achievements.'
                : error
                ? error
                : 'This may take a few moments. Please do not close this window.'}
            </DialogDescription>
          </DialogHeader>

          {progress && !error && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{progress.stage}</span>
                  <span className="text-muted-foreground">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
                <Progress value={progress.percent} className="h-2" />
              </div>

              {progress.currentAchievement && !isComplete && (
                <div className="text-sm text-center text-muted-foreground">
                  Processing: <strong>{progress.currentAchievement}</strong>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              {isComplete || error ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
