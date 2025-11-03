
'use client';
import React from "react"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { initializeMockData, getDemoCredentials } from '@/lib/mock-data-clean';
import {
  Building,
  Mail,
  Lock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  ArrowLeft,
  User,
  Users
} from 'lucide-react';

interface Props {
  // Add props here
}

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const { publicKey, connected } = useWallet();

  const [formData, setFormData] = useState<any>({
    email: '',
    password: '',
    userType: 'student' // 'student' or 'admin'
  });

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState<any>(false);
  const [demoCredentials] = useState<any>(getDemoCredentials());

  // Initialize mock data on component mount
  useEffect(() => {
    initializeMockData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    if (!connected || !publicKey) {
      newErrors.wallet = 'Wallet connection is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (formData.userType === 'admin') {
        // Check if university exists in localStorage
        const universities = JSON.parse(localStorage.getItem('universities') || '[]');
        const university = universities.find(uni =>
          uni.email === formData.email &&
          uni.wallet === publicKey.toString()
        );

        if (!university) {
          setErrors({ submit: 'Invalid credentials or wallet not registered with this university.' });
          setLoading(false);
          return;
        }

        // Store admin session
        const adminSession = {
          universityId: university.id,
          email: university.email,
          wallet: university.wallet,
          role: 'admin',
          loggedInAt: new Date().toISOString()
        };
        console.log('Login - storing admin session:', adminSession);
        localStorage.setItem('adminSession', JSON.stringify(adminSession));
        localStorage.setItem('session', JSON.stringify(adminSession));

        console.log('Redirecting to admin dashboard...');
        // Ensure session is stored before redirecting
        const storedSession = localStorage.getItem('session');
        if (storedSession) {
          router.replace('/university/dashboard');
        } else {
          console.error('Session not stored properly');
        }
      } else {
        // Student login logic
        const students = JSON.parse(localStorage.getItem('students') || '[]');
        const student = students.find(stu =>
          stu.email === formData.email &&
          stu.walletAddress === publicKey.toString()
        );

        if (!student) {
          setErrors({ submit: 'Invalid credentials or wallet not registered for this student.' });
          setLoading(false);
          return;
        }

        // Store student session
        const studentSession = {
          studentId: student.id,
          email: student.email,
          wallet: student.walletAddress,
          role: 'student',
          loggedInAt: new Date().toISOString()
        };
        console.log('Login - storing student session:', studentSession);
        localStorage.setItem('studentSession', JSON.stringify(studentSession));
        localStorage.setItem('session', JSON.stringify(studentSession));

        // Redirect to student dashboard
        // Ensure session is stored before redirecting
        const storedSession = localStorage.getItem('session');
        if (storedSession) {
          router.replace('/student/dashboard');
        } else {
          console.error('Session not stored properly');
        }
      }

    } catch (error) {
      console.error('Login error:', error);
      setErrors({ submit: 'Login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const formatWalletAddress = (address) => {
    if (!address) return 'Not Connected';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your GenuineGrads account
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Sign In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">I am a:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={formData.userType === 'student' ? 'default' : 'outline'}
                    className={`h-12 ${formData.userType === 'student' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => handleInputChange('userType', 'student')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Student
                  </Button>
                  <Button
                    type="button"
                    variant={formData.userType === 'admin' ? 'default' : 'outline'}
                    className={`h-12 ${formData.userType === 'admin' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => handleInputChange('userType', 'admin')}
                  >
                    <Building className="h-4 w-4 mr-2" />
                    University Admin
                  </Button>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={formData.userType === 'admin' ? 'admin@genuinegrads.edu' : 'student@genuinegrads.edu'}
                  value={formData.email}
                  onChange={(e: any) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e: any) => handleInputChange('password', e.target.value)}
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Wallet Connection */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {formData.userType === 'admin' ? 'Registered Wallet' : 'Student Wallet'}
                </Label>

                {connected && publicKey ? (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Wallet Connected</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {formatWalletAddress(publicKey.toString())}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <p className="font-medium text-orange-800 dark:text-orange-200">
                        Wallet Connection Required
                      </p>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                      Connect the wallet registered with your {formData.userType === 'admin' ? 'university' : 'student account'}.
                    </p>
                    <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
                  </div>
                )}

                {errors.wallet && (
                  <p className="text-sm text-red-500">{errors.wallet}</p>
                )}
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errors.submit}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>

              {/* Registration Links */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  {formData.userType === 'admin' ? (
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-primary hover:text-primary/80"
                      onClick={() => router.push('/admin/universities/register')}
                    >
                      Register your university
                    </Button>
                  ) : (
                    <span className="text-primary">Contact your university to get registered</span>
                  )}
                </p>
              </div>

              {/* Demo Credentials */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-dashed">
                <p className="text-sm font-medium text-center mb-3">Demo Credentials</p>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground">Students:</p>
                    {demoCredentials.students.map((student: any, index: any) => (
                      <p key={index} className="font-mono text-muted-foreground">
                        {student.email} / Wallet: {student.wallet.slice(0, 4)}...{student.wallet.slice(-4)}
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Universities:</p>
                    {demoCredentials.universities.map((uni: any, index: any) => (
                      <p key={index} className="font-mono text-muted-foreground">
                        {uni.email} / Wallet: {uni.wallet.slice(0, 4)}...{uni.wallet.slice(-4)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
} 