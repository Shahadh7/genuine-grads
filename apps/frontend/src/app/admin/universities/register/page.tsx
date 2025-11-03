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
import PasswordStrengthBar from '@/components/admin/password-strength-bar';
import SuccessDialog from '@/components/admin/success-dialog';
import { 
  Building, 
  Mail, 
  Globe, 
  User, 
  Phone, 
  Wallet, 
  Lock, 
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  GraduationCap
} from 'lucide-react';

interface Props {
  // Add props here
}

export default function UniversityRegistrationPage(): React.JSX.Element {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  
  const [formData, setFormData] = useState<any>({
    universityName: '',
    email: '',
    domain: '',
    adminName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState<any>(false);
  const [success, setSuccess] = useState<any>(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState<any>(false);
  const [registeredUniversity, setRegisteredUniversity] = useState<any>(null);

  // Validate form fields
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // University Name validation
    if (!formData.universityName.trim()) {
      newErrors.universityName = 'University name is required';
    } else if (formData.universityName.length < 5) {
      newErrors.universityName = 'University name must be at least 5 characters';
    } else if (formData.universityName.length > 100) {
      newErrors.universityName = 'University name must be less than 100 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Domain validation
    if (!formData.domain.trim()) {
      newErrors.domain = 'Official domain is required';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      newErrors.domain = 'Please enter a valid domain (e.g., colombo.ac.lk)';
    }

    // Admin Name validation
    if (!formData.adminName.trim()) {
      newErrors.adminName = 'Admin full name is required';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Wallet validation
    if (!connected || !publicKey) {
      newErrors.wallet = 'Wallet connection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Save to localStorage
      const universityData = {
        id: `uni_${Date.now()}`,
        name: formData.universityName,
        email: formData.email,
        domain: formData.domain,
        admin: formData.adminName,
        phone: formData.phone,
        wallet: publicKey.toString(),
        createdAt: new Date().toISOString()
      };

      // Get existing universities or create new array
      const existingUniversities = JSON.parse(localStorage.getItem('universities') || '[]');
      existingUniversities.push(universityData);
      localStorage.setItem('universities', JSON.stringify(existingUniversities));

      // Save to shared university index
      const sharedIndex = JSON.parse(localStorage.getItem('shared_university_index') || '[]');
      sharedIndex.push({
        id: universityData.id,
        name: universityData.name,
        domain: universityData.domain,
        wallet: universityData.wallet
      });
      localStorage.setItem('shared_university_index', JSON.stringify(sharedIndex));

      setRegisteredUniversity(universityData);
      setSuccess(true);
      setShowSuccessDialog(true);

    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: 'Registration failed. Please try again.' });
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
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            University Registration
          </h1>
          <p className="text-muted-foreground mt-2">
            Register your institution to start issuing blockchain-based academic credentials
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    Registration Successful!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your university has been registered. Redirecting to login...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Form */}
        <Card className="shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Institution Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* University Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="universityName" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    University Name *
                  </Label>
                  <Input
                    id="universityName"
                    type="text"
                    placeholder="University of Colombo"
                    value={formData.universityName}
                    onChange={(e: any) => handleInputChange('universityName', e.target.value)}
                    className={errors.universityName ? 'border-red-500' : ''}
                  />
                  {errors.universityName && (
                    <p className="text-sm text-red-500">{errors.universityName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@colombo.ac.lk"
                    value={formData.email}
                    onChange={(e: any) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Official Domain *
                  </Label>
                  <Input
                    id="domain"
                    type="text"
                    placeholder="colombo.ac.lk"
                    value={formData.domain}
                    onChange={(e: any) => handleInputChange('domain', e.target.value)}
                    className={errors.domain ? 'border-red-500' : ''}
                  />
                  {errors.domain && (
                    <p className="text-sm text-red-500">{errors.domain}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Admin Full Name *
                  </Label>
                  <Input
                    id="adminName"
                    type="text"
                    placeholder="Dr. Ayesha Fernando"
                    value={formData.adminName}
                    onChange={(e: any) => handleInputChange('adminName', e.target.value)}
                    className={errors.adminName ? 'border-red-500' : ''}
                  />
                  {errors.adminName && (
                    <p className="text-sm text-red-500">{errors.adminName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Phone (Optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+94 11 258 1000"
                    value={formData.phone}
                    onChange={(e: any) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Wallet Connection */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Minting Wallet *
                </Label>
                
                {connected && publicKey ? (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Wallet Connected</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {formatWalletAddress(publicKey.toString())}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                      >
                        Change Wallet
                      </Button>
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
                      Connect your Solana wallet to register as a minting authority for your institution.
                    </p>
                    <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
                  </div>
                )}
                
                {errors.wallet && (
                  <p className="text-sm text-red-500">{errors.wallet}</p>
                )}
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Create Admin Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e: any) => handleInputChange('password', e.target.value)}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <PasswordStrengthBar password={formData.password} />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e: any) => handleInputChange('confirmPassword', e.target.value)}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
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
                disabled={loading || success}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Registering University...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Register University
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already registered?{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-primary hover:text-primary/80"
                    onClick={() => router.push('/login')}
                  >
                    Sign in to your account
                  </Button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <SuccessDialog
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        universityData={registeredUniversity}
        onRedirect={() => {
          setShowSuccessDialog(false);
          router.push('/login');
        }}
      />
    </div>
  );
} 