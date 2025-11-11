'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PasswordStrengthBar from '@/components/admin/password-strength-bar';
import SuccessDialog from '@/components/admin/success-dialog';
import { 
  Building, 
  Mail, 
  Globe, 
  User, 
  Lock, 
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  MapPin,
  Wallet
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { graphqlClient } from '@/lib/graphql-client';
import { registerUniversityOnChain } from '@/lib/solana/university';
import { useToast } from '@/hooks/useToast';

const UNIVERSITY_NAME_MIN = 3;
const UNIVERSITY_NAME_MAX = 64;
const UNIVERSITY_URI_MAX = 60;

export default function UniversityRegistrationPage(): React.JSX.Element {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    universityName: '',
    email: '',
    domain: '',
    country: '',
    logoUrl: '',
    websiteUrl: '',
    adminName: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [signingTransaction, setSigningTransaction] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [registeredUniversity, setRegisteredUniversity] = useState<any>(null);

  // Validate form fields
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // University Name validation
    if (!formData.universityName.trim()) {
      newErrors.universityName = 'University name is required';
    } else if (formData.universityName.trim().length < UNIVERSITY_NAME_MIN) {
      newErrors.universityName = `University name must be at least ${UNIVERSITY_NAME_MIN} characters`;
    } else if (formData.universityName.trim().length > UNIVERSITY_NAME_MAX) {
      newErrors.universityName = `University name must be ${UNIVERSITY_NAME_MAX} characters or fewer`;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Domain validation
    if (!formData.domain.trim()) {
      newErrors.domain = 'University domain is required';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      newErrors.domain = 'Please enter a valid domain (e.g., university.edu)';
    }

    // Country validation
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
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
      newErrors.confirmPassword = 'Please confirm the password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Wallet validation
    if (!connected || !publicKey) {
      newErrors.wallet = 'Wallet connection is required';
    }

    // Website URL validation (optional)
    if (formData.websiteUrl) {
      if (!/^https?:\/\/.+/.test(formData.websiteUrl)) {
        newErrors.websiteUrl = 'Please enter a valid URL (e.g., https://university.edu)';
      } else if (formData.websiteUrl.length > UNIVERSITY_URI_MAX) {
        newErrors.websiteUrl = `Website URL must be ${UNIVERSITY_URI_MAX} characters or fewer to fit on-chain metadata`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      if (!publicKey || !connection) {
        setErrors({ submit: 'Please connect your wallet first' });
        return;
      }

      setSigningTransaction(true);

      // Step 1: Invoke Solana program from the client
      const { signature, universityPda, confirmationSource } = await registerUniversityOnChain({
        wallet,
        connection,
        name: formData.universityName.trim(),
        metadataUri: formData.websiteUrl || null,
      });

      const shortSig = `${signature.slice(0, 4)}...${signature.slice(-4)}`;

      if (confirmationSource !== 'helius') {
        const method =
          confirmationSource === 'rpc'
            ? 'RPC confirmation'
            : confirmationSource === 'rpc-status'
              ? 'signature status fallback'
              : 'wallet status fallback';
        toast.warning({
          title: 'Confirmed without Helius realtime channel',
          description: `The transaction was finalized via ${method}.`,
        });
      } else {
        toast.success({
          title: 'On-chain transaction confirmed',
          description: `Signature ${shortSig} was finalized via Helius.`,
        });
      }

      // Step 2: Persist to backend after on-chain success
      const response = await graphqlClient.registerUniversity({
        name: formData.universityName,
        domain: formData.domain,
        country: formData.country,
        logoUrl: formData.logoUrl || undefined,
        websiteUrl: formData.websiteUrl || undefined,
        walletAddress: publicKey.toString(),
        adminEmail: formData.email,
        adminPassword: formData.password,
        adminFullName: formData.adminName,
        registrationSignature: signature,
        universityPda,
      });

      if (response.errors) {
        throw new Error(response.errors[0]?.message || 'Registration failed. Please try again.');
      }

      const university = response.data?.registerUniversity;

      if (!university) {
        throw new Error('Registration failed. Please try again.');
      }

      setRegisteredUniversity(university);
      setSuccess(true);
      setShowSuccessDialog(true);
      toast.success({
        title: 'University registration submitted',
        description: `Application saved. Transaction ${shortSig} recorded.`,
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error({
        title: 'University registration failed',
        description: error?.message || 'An unexpected error occurred.',
      });
      setErrors({ 
        submit: error.message || 'An error occurred during registration. Please try again.' 
      });
    } finally {
      setLoading(false);
      setSigningTransaction(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Register Your University</h1>
        <p className="text-muted-foreground">
          Register your university to issue blockchain-verified credentials. Your application will be reviewed by our team.
        </p>
      </div>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle>University Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* University Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building className="h-5 w-5" />
                University Details
              </h3>

              {/* University Name */}
              <div className="space-y-2">
                <Label htmlFor="universityName">University Name *</Label>
                <Input
                  id="universityName"
                  placeholder="e.g., University of Example"
                  value={formData.universityName}
                  onChange={(e) => handleInputChange('universityName', e.target.value)}
                  className={errors.universityName ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.universityName && (
                  <p className="text-sm text-red-500">{errors.universityName}</p>
                )}
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <Label htmlFor="domain">University Domain *</Label>
                <Input
                  id="domain"
                  placeholder="e.g., example.edu"
                  value={formData.domain}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  className={errors.domain ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.domain && (
                  <p className="text-sm text-red-500">{errors.domain}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  This will be used as the unique identifier
                </p>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  placeholder="e.g., United States"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className={errors.country ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.country && (
                  <p className="text-sm text-red-500">{errors.country}</p>
                )}
              </div>

              {/* Website URL */}
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  placeholder="https://www.example.edu"
                  value={formData.websiteUrl}
                  onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                  className={errors.websiteUrl ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.websiteUrl && (
                  <p className="text-sm text-red-500">{errors.websiteUrl}</p>
                )}
              </div>

              {/* Logo URL */}
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://www.example.edu/logo.png"
                  value={formData.logoUrl}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Wallet Connection Section */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                University Wallet
              </h3>

              <div className="space-y-3">
                <Label>Connect Wallet *</Label>
                <p className="text-sm text-muted-foreground">
                  Connect your university's Solana wallet. This wallet will be used for all blockchain operations.
                  <strong className="block mt-1 text-orange-600 dark:text-orange-400">
                    ⚠️ Only the public key is stored. Your private keys remain secure in your wallet.
                  </strong>
                </p>
                
                {connected && publicKey ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Wallet Connected
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 font-mono mt-1 break-all">
                          {publicKey.toString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
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
                      Connect your Phantom or Solflare wallet to continue registration.
                    </p>
                    <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
                  </div>
                )}

                {errors.wallet && (
                  <p className="text-sm text-red-500">{errors.wallet}</p>
                )}
              </div>
            </div>

            {/* Admin Details Section */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Admin Account Details
              </h3>

              {/* Admin Name */}
              <div className="space-y-2">
                <Label htmlFor="adminName">Admin Full Name *</Label>
                <Input
                  id="adminName"
                  placeholder="e.g., John Doe"
                  value={formData.adminName}
                  onChange={(e) => handleInputChange('adminName', e.target.value)}
                  className={errors.adminName ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.adminName && (
                  <p className="text-sm text-red-500">{errors.adminName}</p>
                )}
              </div>

              {/* Admin Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.edu"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter secure password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={errors.password ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {formData.password && <PasswordStrengthBar password={formData.password} />}
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                  disabled={loading}
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

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || signingTransaction}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting Application...
                  </div>
                ) : signingTransaction ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sign Transaction in Wallet...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Submit Application
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      {success && registeredUniversity && (
        <SuccessDialog
          isOpen={showSuccessDialog}
          onClose={() => {
            setShowSuccessDialog(false);
            router.push('/');
          }}
          university={registeredUniversity}
        />
      )}
    </div>
  );
}
