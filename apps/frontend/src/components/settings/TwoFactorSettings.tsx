'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Copy,
  CheckCircle,
  AlertTriangle,
  Loader2,
  KeyRound,
  Lock
} from 'lucide-react';
import { graphqlClient } from '@/lib/graphql-client';
import { useToast } from '@/hooks/useToast';
import { totpCodeSchema } from '@/lib/validation/schemas/common';

interface TwoFactorSettingsProps {
  totpEnabled: boolean;
  onStatusChange?: () => void;
}

export default function TwoFactorSettings({ totpEnabled, onStatusChange }: TwoFactorSettingsProps) {
  const toast = useToast();

  // Setup state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify'>('qr');
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', '']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // Disable state
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  const verifyInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when verify step is shown
  useEffect(() => {
    if (setupStep === 'verify' && verifyInputRefs.current[0]) {
      verifyInputRefs.current[0].focus();
    }
  }, [setupStep]);

  const handleStartSetup = async () => {
    setSetupLoading(true);
    try {
      const response = await graphqlClient.initiateTOTPSetup();

      if (response.errors) {
        toast.error({
          title: 'Setup Failed',
          description: response.errors[0]?.message || 'Failed to start 2FA setup',
        });
        return;
      }

      if (response.data?.initiateTOTPSetup) {
        setSetupData(response.data.initiateTOTPSetup);
        setShowSetupDialog(true);
        setSetupStep('qr');
      }
    } catch (error: any) {
      toast.error({
        title: 'Setup Failed',
        description: error.message || 'Failed to start 2FA setup',
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...verifyCode];
    newCode[index] = digit;
    setVerifyCode(newCode);
    setVerifyError(null);

    if (digit && index < 5) {
      verifyInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) {
      verifyInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length > 0) {
      const newCode = [...verifyCode];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newCode[i] = pastedData[i];
      }
      setVerifyCode(newCode);
      const focusIndex = Math.min(pastedData.length, 5);
      verifyInputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerifyAndEnable = async () => {
    const code = verifyCode.join('');

    // Validate using Yup schema
    try {
      await totpCodeSchema.validate(code);
    } catch (err: any) {
      setVerifyError(err.message || 'Please enter the complete 6-digit code');
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);

    try {
      const response = await graphqlClient.verifyAndEnableTOTP(code);

      if (response.errors) {
        setVerifyError(response.errors[0]?.message || 'Invalid verification code');
        setVerifyCode(['', '', '', '', '', '']);
        verifyInputRefs.current[0]?.focus();
        return;
      }

      if (response.data?.verifyAndEnableTOTP) {
        toast.success({
          title: 'Two-Factor Authentication Enabled',
          description: 'Your account is now protected with 2FA',
        });
        setShowSetupDialog(false);
        resetSetupState();
        onStatusChange?.();
      }
    } catch (error: any) {
      setVerifyError(error.message || 'Verification failed');
      setVerifyCode(['', '', '', '', '', '']);
      verifyInputRefs.current[0]?.focus();
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword.trim()) {
      setDisableError('Password is required');
      return;
    }

    setDisableLoading(true);
    setDisableError(null);

    try {
      const response = await graphqlClient.disableTOTP(disablePassword);

      if (response.errors) {
        setDisableError(response.errors[0]?.message || 'Failed to disable 2FA');
        return;
      }

      if (response.data?.disableTOTP) {
        toast.success({
          title: 'Two-Factor Authentication Disabled',
          description: 'Your account is no longer protected with 2FA',
        });
        setShowDisableDialog(false);
        setDisablePassword('');
        onStatusChange?.();
      }
    } catch (error: any) {
      setDisableError(error.message || 'Failed to disable 2FA');
    } finally {
      setDisableLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const resetSetupState = () => {
    setSetupData(null);
    setSetupStep('qr');
    setVerifyCode(['', '', '', '', '', '']);
    setVerifyError(null);
    setSecretCopied(false);
  };

  const handleCloseSetupDialog = () => {
    setShowSetupDialog(false);
    resetSetupState();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {totpEnabled ? (
                <ShieldCheck className="h-6 w-6 text-green-600" />
              ) : (
                <ShieldOff className="h-6 w-6 text-orange-600" />
              )}
              <div>
                <div className="font-medium">
                  {totpEnabled ? '2FA is Enabled' : '2FA is Disabled'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {totpEnabled
                    ? 'Your account is protected with two-factor authentication'
                    : 'Enable 2FA to add an extra layer of security'}
                </div>
              </div>
            </div>
            <Badge variant={totpEnabled ? 'default' : 'secondary'}>
              {totpEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {totpEnabled ? (
            <Button
              variant="destructive"
              onClick={() => setShowDisableDialog(true)}
              className="w-full"
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Disable Two-Factor Authentication
            </Button>
          ) : (
            <Button
              onClick={handleStartSetup}
              disabled={setupLoading}
              className="w-full"
            >
              {setupLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Enable Two-Factor Authentication
                </>
              )}
            </Button>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Compatible Apps
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Use any TOTP-compatible authenticator app such as Google Authenticator,
              Microsoft Authenticator, Authy, or 1Password.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={handleCloseSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {setupStep === 'qr' ? 'Set Up Two-Factor Authentication' : 'Verify Setup'}
            </DialogTitle>
            <DialogDescription>
              {setupStep === 'qr'
                ? 'Scan the QR code with your authenticator app'
                : 'Enter the 6-digit code from your authenticator app'}
            </DialogDescription>
          </DialogHeader>

          {setupStep === 'qr' && setupData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={setupData.qrCodeDataUrl}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>

              {/* Manual Entry */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Can't scan? Enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                    {setupData.secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopySecret}
                  >
                    {secretCopied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Save this secret code in a safe place. You won't be able to see it again.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {setupStep === 'verify' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                <KeyRound className="h-5 w-5" />
                <span className="text-sm">Enter the code from your authenticator app</span>
              </div>

              {/* TOTP Code Input */}
              <div className="flex justify-center gap-2">
                {verifyCode.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { verifyInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    onPaste={handleCodePaste}
                    className={`w-12 h-14 text-center text-2xl font-mono ${
                      verifyError ? 'border-red-500' : ''
                    }`}
                    disabled={verifyLoading}
                  />
                ))}
              </div>

              {verifyError && (
                <p className="text-sm text-red-500 text-center">{verifyError}</p>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {setupStep === 'qr' ? (
              <>
                <Button variant="outline" onClick={handleCloseSetupDialog}>
                  Cancel
                </Button>
                <Button onClick={() => setSetupStep('verify')}>
                  I've Scanned the Code
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSetupStep('qr')}>
                  Back
                </Button>
                <Button
                  onClick={handleVerifyAndEnable}
                  disabled={verifyLoading || verifyCode.join('').length !== 6}
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Enable 2FA'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldOff className="h-5 w-5" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter your password to confirm disabling 2FA. This will make your account less secure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="disable-password"
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={(e) => {
                  setDisablePassword(e.target.value);
                  setDisableError(null);
                }}
                className={disableError ? 'border-red-500' : ''}
                disabled={disableLoading}
              />
              {disableError && (
                <p className="text-sm text-red-500">{disableError}</p>
              )}
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Disabling 2FA will remove the extra layer of security from your account.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableDialog(false);
                setDisablePassword('');
                setDisableError(null);
              }}
              disabled={disableLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={disableLoading || !disablePassword.trim()}
            >
              {disableLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
