'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mail,
  Lock,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  ArrowLeft,
  User,
  Shield,
  KeyRound
} from 'lucide-react';
import { graphqlClient } from '@/lib/graphql-client';
import { createSessionFromAdmin, setSession } from '@/lib/session';

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [totpCode, setTotpCode] = useState(['', '', '', '', '', '']);
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const totpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first TOTP input when TOTP step is shown
  useEffect(() => {
    if (requiresTOTP && totpInputRefs.current[0]) {
      totpInputRefs.current[0].focus();
    }
  }, [requiresTOTP]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTotpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newCode = [...totpCode];
    newCode[index] = digit;
    setTotpCode(newCode);

    // Clear any TOTP error
    if (errors.totp) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.totp;
        return newErrors;
      });
    }

    // Auto-focus next input
    if (digit && index < 5) {
      totpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
      totpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleTotpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length > 0) {
      const newCode = [...totpCode];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newCode[i] = pastedData[i];
      }
      setTotpCode(newCode);

      // Focus the input after the last pasted digit
      const focusIndex = Math.min(pastedData.length, 5);
      totpInputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await graphqlClient.login(
        formData.email,
        formData.password
      );

      if (response.errors) {
        setErrors({
          submit: response.errors[0]?.message || 'Login failed. Please check your credentials.'
        });
        return;
      }

      if (response.data?.login) {
        const { admin, accessToken, refreshToken, requiresTOTP: needsTOTP } = response.data.login;

        // Check if TOTP verification is required
        if (needsTOTP) {
          setRequiresTOTP(true);
          return;
        }

        if (admin && accessToken && refreshToken) {
          const sessionPayload = createSessionFromAdmin(admin);
          setSession(sessionPayload, accessToken, refreshToken);

          // Redirect based on user role
          if (admin.isSuperAdmin) {
            router.push('/admin/dashboard');
          } else if (admin.university) {
            router.push('/university/dashboard');
          } else {
            router.push('/');
          }
        } else {
          setErrors({ submit: 'Login failed. Please try again.' });
        }
      } else {
        setErrors({ submit: 'Login failed. Please try again.' });
      }

    } catch (error: any) {
      console.error('Login error:', error);
      setErrors({
        submit: error.message || 'An error occurred during login. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = totpCode.join('');
    if (code.length !== 6) {
      setErrors({ totp: 'Please enter the complete 6-digit code' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await graphqlClient.login(
        formData.email,
        formData.password,
        code
      );

      if (response.errors) {
        setErrors({
          totp: response.errors[0]?.message || 'Invalid verification code'
        });
        // Clear the TOTP input on error
        setTotpCode(['', '', '', '', '', '']);
        totpInputRefs.current[0]?.focus();
        return;
      }

      if (response.data?.login) {
        const { admin, accessToken, refreshToken } = response.data.login;

        if (admin && accessToken && refreshToken) {
          const sessionPayload = createSessionFromAdmin(admin);
          setSession(sessionPayload, accessToken, refreshToken);

          if (admin.isSuperAdmin) {
            router.push('/admin/dashboard');
          } else if (admin.university) {
            router.push('/university/dashboard');
          } else {
            router.push('/');
          }
        } else {
          setErrors({ totp: 'Login failed. Please try again.' });
        }
      }

    } catch (error: any) {
      console.error('TOTP verification error:', error);
      setErrors({
        totp: error.message || 'Verification failed. Please try again.'
      });
      setTotpCode(['', '', '', '', '', '']);
      totpInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresTOTP(false);
    setTotpCode(['', '', '', '', '', '']);
    setErrors({});
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
            {requiresTOTP ? 'Two-Factor Authentication' : 'Welcome Back'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {requiresTOTP
              ? 'Enter the code from your authenticator app'
              : 'Sign in to your GenuineGrads account'}
          </p>
        </div>

        {/* Login Form or TOTP Form */}
        <Card className="shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {requiresTOTP ? (
                <>
                  <Shield className="h-5 w-5 text-primary" />
                  Verify Your Identity
                </>
              ) : (
                <>
                  <User className="h-5 w-5 text-primary" />
                  Sign In
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requiresTOTP ? (
              // TOTP Verification Form
              <form onSubmit={handleTotpSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                    <KeyRound className="h-5 w-5" />
                    <span className="text-sm">Open your authenticator app and enter the 6-digit code</span>
                  </div>

                  {/* TOTP Code Input */}
                  <div className="flex justify-center gap-2">
                    {totpCode.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => { totpInputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleTotpChange(index, e.target.value)}
                        onKeyDown={(e) => handleTotpKeyDown(index, e)}
                        onPaste={handleTotpPaste}
                        className={`w-12 h-14 text-center text-2xl font-mono ${
                          errors.totp ? 'border-red-500' : ''
                        }`}
                        disabled={loading}
                      />
                    ))}
                  </div>

                  {errors.totp && (
                    <p className="text-sm text-red-500 text-center">{errors.totp}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  disabled={loading || totpCode.join('').length !== 6}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verifying...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Verify
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>

                {/* Back to Login */}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBackToLogin}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </form>
            ) : (
              // Email/Password Form
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@university.edu"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                    disabled={loading}
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
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={errors.password ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
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

                {/* Registration Link */}
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-primary hover:text-primary/80"
                      onClick={() => router.push('/admin/universities/register')}
                      disabled={loading}
                    >
                      Register your university
                    </Button>
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Student Login - Only show when not in TOTP step */}
        {!requiresTOTP && (
          <div className="mt-6">
            <Card className="border-border/50 bg-muted/30 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Student?</p>
                      <p className="text-sm text-muted-foreground">Login with your wallet</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => router.push('/student-login')}
                    disabled={loading}
                  >
                    Student Login
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/')}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
