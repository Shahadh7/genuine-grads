'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSession, clearSession } from '@/lib/session';
import { GraduationCap } from 'lucide-react';

export default function StudentDashboard(): React.JSX.Element {
  const router = useRouter();
  const [session, setSession] = useState<any | null>(null);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession || currentSession.role !== 'student') {
      router.push('/login');
      return;
    }

    setSession(currentSession);
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center space-y-3">
          <GraduationCap className="h-10 w-10 text-primary mx-auto" />
          <CardTitle className="text-2xl font-bold">Student Portal Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center text-muted-foreground">
          <p>
            We&apos;re building a dedicated student experience for managing credentials, achievements, and
            blockchain proofs. Until then, you can continue to verify certificates using the public verification flow.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.push('/verify')}>
              Go to Certificate Verification
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

