'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  Hash,
  Award,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';
import { useState } from 'react';
import { ZkVerificationResult } from './ZkVerifyButton';

interface ZkVerificationReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievementCode: string;
  credentialId: string;
  verificationResult: ZkVerificationResult;
  studentName?: string;
  universityName?: string;
  certificateTitle?: string;
  verificationCount?: number;
}

export function ZkVerificationReportDialog({
  open,
  onOpenChange,
  achievementCode,
  credentialId,
  verificationResult,
  studentName,
  universityName,
  certificateTitle,
  verificationCount = 1,
}: ZkVerificationReportDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  const truncateHash = (hash?: string | null) => {
    if (!hash) return 'N/A';
    if (hash.length <= 20) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-10)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-6 w-6 text-green-600" />
            Zero-Knowledge Proof Verification Report
          </DialogTitle>
          <DialogDescription>
            Cryptographic proof verification details for employer review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Verification Status Banner */}
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    Verification Successful
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    The zero-knowledge proof has been cryptographically verified
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto bg-green-100 text-green-700 border-green-300">
                  Verified {verificationCount}x
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* What This Means Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-foreground mb-2">What This Verification Means</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>The student genuinely possesses this achievement as recorded on the blockchain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>The proof was generated using the student&apos;s private cryptographic secret</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>The verification used the Groth16 zero-knowledge proof system (bn254 curve)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>No sensitive information about the student was revealed during verification</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievement Details */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Achievement Details
              </h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Achievement</p>
                    <p className="font-medium">{achievementCode}</p>
                  </div>
                  {certificateTitle && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Certificate</p>
                      <p className="font-medium">{certificateTitle}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {studentName && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Student</p>
                      <p className="font-medium">{studentName}</p>
                    </div>
                  )}
                  {universityName && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">University</p>
                      <p className="font-medium">{universityName}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Verification Details */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Technical Verification Details
              </h4>
              <div className="space-y-4">
                {/* Verification Time */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Verification Time</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(verificationResult.verifiedAt)}
                  </span>
                </div>

                {/* Proof Hash */}
                {verificationResult.proofHash && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Proof Hash (SHA-256)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(verificationResult.proofHash!, 'proofHash')}
                        className="h-7 px-2"
                      >
                        {copied === 'proofHash' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <code className="text-xs font-mono text-muted-foreground break-all">
                      {verificationResult.proofHash}
                    </code>
                  </div>
                )}

                {/* Credential ID */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Credential ID (Mint Address)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(credentialId, 'credentialId')}
                        className="h-7 px-2"
                      >
                        {copied === 'credentialId' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://explorer.solana.com/address/${credentialId}?cluster=devnet`, '_blank')}
                        className="h-7 px-2"
                        title="View on Solana Explorer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <code className="text-xs font-mono text-muted-foreground break-all">
                    {credentialId}
                  </code>
                </div>

                {/* Cryptographic Protocol */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Cryptographic Protocol</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Proof System:</span>
                      <span className="ml-1 font-medium">Groth16</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Curve:</span>
                      <span className="ml-1 font-medium">BN254 (alt_bn128)</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hash Function:</span>
                      <span className="ml-1 font-medium">Poseidon</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Circuit:</span>
                      <span className="ml-1 font-medium">ach_member_v1</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <div className="text-center text-xs text-muted-foreground p-4 bg-muted/30 rounded-lg">
            <p>
              This verification was performed using industry-standard zero-knowledge proof technology.
              The proof cryptographically demonstrates possession of the achievement without revealing
              any private information about the student or their credentials.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
