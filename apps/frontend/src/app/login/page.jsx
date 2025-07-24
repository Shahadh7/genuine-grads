'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/login-form';
import { setSession, getSession } from '@/lib/session';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const session = getSession();
    if (session) {
      if (session.role === 'student') {
        router.push('/student/dashboard');
      } else if (session.role === 'university') {
        router.push('/university/dashboard');
      }
    }
  }, [router]);

  const handleLogin = async (email, password) => {
    setLoading(true);
    setError('');

    try {
      // Mock role detection
      let role = 'student';
      if (email.includes('@university.com')) {
        role = 'university';
      } else if (!email.includes('@student.com')) {
        // Default to student for any other email
        role = 'student';
      }

      // Mock authentication delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create session
      const session = {
        role,
        email,
        nic: email.split('@')[0], // Mock NIC from email
        wallet: null
      };

      setSession(session);

      // Redirect based on role
      if (role === 'student') {
        router.push('/student/dashboard');
      } else {
        router.push('/university/dashboard');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">GenuineGrads</h1>
          <p className="text-muted-foreground">
            NFT-based Academic Credential Verification
          </p>
        </div>
        <LoginForm
          onSubmit={handleLogin}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  );
} 