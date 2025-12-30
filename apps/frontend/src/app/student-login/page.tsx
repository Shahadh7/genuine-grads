'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { graphqlClient } from '@/lib/graphql-client';
import { setSession, createSessionFromStudent, getSession } from '@/lib/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Home } from 'lucide-react';

export default function StudentLoginPage() {
  const router = useRouter();
  const { publicKey, connected, disconnect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const session = getSession();
    if (session && session.role === 'student') {
      router.push('/student/dashboard');
    }
  }, [router]);

  // Handle wallet connection and authentication
  useEffect(() => {
    if (connected && publicKey && !loading && !success) {
      handleWalletLogin();
    }
  }, [connected, publicKey]);

  const handleWalletLogin = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();

      // Call the student login mutation
      const response = await graphqlClient.studentLoginWithWallet(walletAddress);

      if (response.errors) {
        throw new Error(response.errors[0]?.message || 'Login failed');
      }

      if (!response.data?.studentLoginWithWallet) {
        throw new Error('Invalid response from server');
      }

      const { student, accessToken, refreshToken } = response.data.studentLoginWithWallet;

      // Create session
      const session = createSessionFromStudent(student);
      setSession(session, accessToken, refreshToken);

      setSuccess(true);

      // Wait a bit for localStorage to commit, then do a hard redirect
      setTimeout(() => {
        window.location.href = '/student/dashboard';
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please ensure your wallet is registered with a university.');

      // Disconnect wallet on error
      if (disconnect) {
        await disconnect();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10"
      >
        <Button variant="ghost" size="sm" className="gap-2" disabled={loading}>
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Home</span>
          <Home className="h-4 w-4 sm:hidden" />
        </Button>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Student Portal</CardTitle>
          <CardDescription>
            Connect your wallet to access your certificates and achievements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              <AlertDescription>
                Login successful! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect with your registered Solana wallet
              </p>

              <div className="flex justify-center">
                <WalletMultiButton className="!bg-primary hover:!bg-primary/90" />
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying your wallet...</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                Don't have access?{' '}
                <span className="text-primary font-medium">
                  Contact your university to register your wallet address
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
