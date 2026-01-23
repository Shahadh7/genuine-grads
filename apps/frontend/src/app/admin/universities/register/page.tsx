'use client';

import React, { useState } from 'react';
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
  User,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Wallet
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { graphqlClient } from '@/lib/graphql-client';
import { registerUniversityOnChain } from '@/lib/solana/university';
import { useToast } from '@/hooks/useToast';
import { useYupValidation } from '@/lib/validation/hooks';
import { universityRegistrationSchema, UniversityRegistrationFormData } from '@/lib/validation/schemas/university';

export default function UniversityRegistrationPage(): React.JSX.Element {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const toast = useToast();

  const {
    formData,
    errors,
    setErrors,
    handleInputChange,
    validateForm: validateYupForm,
  } = useYupValidation<UniversityRegistrationFormData>({
    schema: universityRegistrationSchema,
    initialValues: {
      universityName: '',
      email: '',
      domain: '',
      country: '',
      logoUrl: '',
      websiteUrl: '',
      adminName: '',
      password: '',
      confirmPassword: ''
    },
    clearErrorOnChange: true,
  });

  const [loading, setLoading] = useState(false);
  const [signingTransaction, setSigningTransaction] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [registeredUniversity, setRegisteredUniversity] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Validate form fields (Yup + wallet check)
  const validateForm = async () => {
    const isYupValid = await validateYupForm();

    // Also validate wallet connection (not part of Yup schema)
    if (!connected || !publicKey) {
      setErrors(prev => ({ ...prev, wallet: 'Wallet connection is required' }));
      return false;
    }

    return isYupValid;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        logoUrl: 'Only image files (JPEG, PNG, GIF, WEBP) are allowed'
      }));
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        logoUrl: 'File size must be less than 5MB'
      }));
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    // Clear previous errors
    if (errors.logoUrl) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.logoUrl;
        return newErrors;
      });
    }

    // Set file and create preview
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogoToIPFS = async (file: File): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append('logo', file);

    // Derive backend URL from GraphQL URL
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
    const backendUrl = graphqlUrl.replace('/graphql', '');
    const response = await fetch(`${backendUrl}/api/upload/logo`, {
      method: 'POST',
      body: uploadFormData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload logo');
    }

    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      if (!publicKey || !connection) {
        setErrors({ submit: 'Please connect your wallet first' });
        return;
      }

      // Step 1: Upload logo to IPFS if a file was selected
      let logoUrl = formData.logoUrl;
      if (logoFile) {
        try {
          setUploadingLogo(true);
          toast.success({
            title: 'Uploading logo',
            description: 'Uploading your logo to IPFS...',
          });
          logoUrl = await uploadLogoToIPFS(logoFile);
          setUploadingLogo(false);
          toast.success({
            title: 'Logo uploaded',
            description: 'Your logo has been uploaded to IPFS successfully',
          });
        } catch (error: any) {
          setUploadingLogo(false);
          setErrors({
            logoUrl: error.message || 'Failed to upload logo. Please try again.'
          });
          toast.error({
            title: 'Logo upload failed',
            description: error.message || 'Failed to upload logo',
          });
          return;
        }
      }

      setSigningTransaction(true);

      // Step 2: Invoke Solana program from the client
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

      // Step 3: Persist to backend after on-chain success
      const response = await graphqlClient.registerUniversity({
        name: formData.universityName,
        domain: formData.domain,
        country: formData.country,
        logoUrl: logoUrl || undefined,
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

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label htmlFor="logoFile">University Logo</Label>
                <Input
                  id="logoFile"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleLogoChange}
                  disabled={loading}
                  className={errors.logoUrl ? 'border-red-500' : ''}
                />
                {logoFile && logoPreview && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-16 w-16 object-contain rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{logoFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(logoFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                )}
                {errors.logoUrl && (
                  <p className="text-sm text-red-500">{errors.logoUrl}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select your university logo (JPEG, PNG, GIF, WEBP - Max 5MB). It will be uploaded to IPFS when you submit.
                </p>
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
                disabled={loading || signingTransaction || uploadingLogo}
                className="flex-1"
              >
                {uploadingLogo ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading Logo to IPFS...
                  </div>
                ) : loading ? (
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
