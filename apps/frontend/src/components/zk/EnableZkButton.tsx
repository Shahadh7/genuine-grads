'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { graphqlClient } from '@/lib/graphql-client';
import {
  deriveSecrets,
  walletSupportsDeterministicSignatures,
} from '@/lib/zk/deterministic-secrets';
import { computeCommitmentsForCertificate } from '@/lib/zk/commitment';

interface EnableZkButtonProps {
  credentialId: string; // mintAddress
  achievements: string[]; // Array of achievement badgeTitles
  studentWalletAddress?: string | null; // Student's registered wallet address
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  isEnabled?: boolean;
}

export function EnableZkButton({
  credentialId,
  achievements,
  studentWalletAddress,
  onSuccess,
  onError,
  disabled = false,
  isEnabled = false,
}: EnableZkButtonProps) {
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<string>('');

  const handleEnableZk = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      onError?.('Please connect your wallet first');
      return;
    }

    if (!walletSupportsDeterministicSignatures(wallet)) {
      onError?.('Your wallet does not support message signing');
      return;
    }

    // Security: Validate connected wallet matches student's registered wallet
    if (studentWalletAddress && wallet.publicKey.toBase58() !== studentWalletAddress) {
      onError?.('Connected wallet does not match your registered wallet. Please connect the wallet associated with your student account.');
      return;
    }

    if (achievements.length === 0) {
      onError?.('No achievements found on this certificate');
      return;
    }

    setIsLoading(true);
    setStep('Requesting wallet signature...');

    try {
      // Step 1: Derive secrets from wallet signature
      const secrets = await deriveSecrets(wallet, credentialId);

      setStep('Computing commitments...');

      // Step 2: Compute commitments for all achievements
      const commitments = await computeCommitmentsForCertificate(
        credentialId,
        secrets.studentSecret,
        secrets.salt,
        achievements
      );

      setStep('Registering commitments...');

      // Step 3: Register commitments with backend
      const inputs = Array.from(commitments.entries()).map(
        ([achievementCode, commitment]) => ({
          credentialId,
          achievementCode,
          commitment: commitment.commitment,
        })
      );

      const response = await graphqlClient.registerAchievementCommitmentsBatch(
        inputs
      );

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      // Check for failures
      const results = response.data?.registerAchievementCommitmentsBatch || [];
      const failures = results.filter((r) => !r.success);

      if (failures.length > 0) {
        throw new Error(
          `Failed to register some commitments: ${failures[0].message}`
        );
      }

      setStep('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error enabling ZK:', error);
      setStep('');
      onError?.(error.message || 'Failed to enable ZK verification');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEnabled) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <CheckCircle className="w-4 h-4 text-green-500" />
        ZK Enabled
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleEnableZk}
      disabled={disabled || isLoading || !wallet.connected}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">{step || 'Processing...'}</span>
        </>
      ) : (
        <>
          <Shield className="w-4 h-4" />
          Enable ZK Verification
        </>
      )}
    </Button>
  );
}
