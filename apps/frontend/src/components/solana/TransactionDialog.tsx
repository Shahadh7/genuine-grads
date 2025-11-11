'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  loading: boolean;
  success: boolean;
  error: string | null;
  signature: string | null;
  onConfirm: () => Promise<void>;
}

export function TransactionDialog({
  open,
  onOpenChange,
  title,
  description,
  loading,
  success,
  error,
  signature,
  onConfirm,
}: TransactionDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const explorerUrl = signature
    ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Status display */}
        <div className="py-4">
          {loading || isProcessing ? (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Processing transaction...</span>
            </div>
          ) : success ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                <span>Transaction successful!</span>
              </div>
              {signature && (
                <div className="text-center">
                  <a
                    href={explorerUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:underline"
                  >
                    <span>View on Solana Explorer</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="mt-2 text-xs text-muted-foreground break-all">
                    {signature}
                  </p>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2 text-red-600">
                <XCircle className="h-6 w-6" />
                <span>Transaction failed</span>
              </div>
              <p className="text-center text-sm text-muted-foreground">{error}</p>
            </div>
          ) : null}
        </div>

        <AlertDialogFooter>
          {!success && !loading && !isProcessing && (
            <>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button onClick={handleConfirm} disabled={isProcessing}>
                  Confirm & Sign
                </Button>
              </AlertDialogAction>
            </>
          )}
          {success && (
            <AlertDialogAction onClick={() => onOpenChange(false)}>
              Close
            </AlertDialogAction>
          )}
          {error && (
            <>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button onClick={handleConfirm} disabled={isProcessing}>
                  Retry
                </Button>
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

