'use client';

import { useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { graphqlClient } from '@/lib/graphql-client';

export interface ZkVerificationResult {
  verified: boolean;
  verifiedAt?: string | null;
  failureReason?: string | null;
  proofHash?: string | null;
}

interface ZkVerifyButtonProps {
  credentialId: string;
  achievementCode: string;
  onVerified?: (result: ZkVerificationResult) => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showViewReport?: boolean;
  onViewReport?: () => void;
}

export function ZkVerifyButton({
  credentialId,
  achievementCode,
  onVerified,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  showViewReport = false,
  onViewReport,
}: ZkVerifyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ZkVerificationResult | null>(null);

  const handleVerify = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await graphqlClient.verifyStoredAchievementProof({
        credentialId,
        achievementCode,
      });

      if (response.errors) {
        const errorResult: ZkVerificationResult = {
          verified: false,
          failureReason: response.errors[0].message,
        };
        setResult(errorResult);
        onVerified?.(errorResult);
        return;
      }

      const verificationResult = response.data?.verifyStoredAchievementProof;
      if (!verificationResult) {
        const errorResult: ZkVerificationResult = {
          verified: false,
          failureReason: 'No verification result received',
        };
        setResult(errorResult);
        onVerified?.(errorResult);
        return;
      }

      const resultData: ZkVerificationResult = {
        verified: verificationResult.verified,
        verifiedAt: verificationResult.verifiedAt,
        failureReason: verificationResult.failureReason,
        proofHash: verificationResult.proofHash,
      };
      setResult(resultData);
      onVerified?.(resultData);
    } catch (error: any) {
      const errorResult: ZkVerificationResult = {
        verified: false,
        failureReason: error.message || 'Verification failed',
      };
      setResult(errorResult);
      onVerified?.(errorResult);
    } finally {
      setIsLoading(false);
    }
  };

  // Show result state
  if (result) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant={result.verified ? 'outline' : 'destructive'}
          size={size}
          disabled
          className="gap-1"
        >
          {result.verified ? (
            <>
              <CheckCircle className="w-3 h-3" />
              Verified
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3" />
              Failed
            </>
          )}
        </Button>
        {showViewReport && result.verified && onViewReport && (
          <Button
            variant="ghost"
            size={size}
            onClick={onViewReport}
            className="gap-1"
            title="View verification report"
          >
            <FileText className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleVerify}
      disabled={disabled || isLoading}
      className="gap-1"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Verifying...
        </>
      ) : (
        <>
          <ShieldCheck className="w-3 h-3" />
          Verify
        </>
      )}
    </Button>
  );
}
