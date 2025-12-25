'use client';
import React from "react";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { graphqlClient } from '@/lib/graphql-client';
import TwoFactorSettings from '@/components/settings/TwoFactorSettings';
import {
  Settings,
  Building,
  Wallet,
  Save,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function SettingsPage(): React.JSX.Element {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    websiteUrl: '',
    logoUrl: '',
  });
  const [originalProfile, setOriginalProfile] = useState<any | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalCertificates: 0,
    mintedCount: 0,
    pendingCount: 0,
    revokedCount: 0,
  });
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totpEnabled, setTotpEnabled] = useState<boolean>(false);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setError(null);

    try {
      // Load university profile and admin info in parallel
      const [universityResponse, meResponse] = await Promise.all([
        graphqlClient.getMyUniversity(),
        graphqlClient.me(),
      ]);

      if (universityResponse.errors?.length) {
        throw new Error(universityResponse.errors[0]?.message ?? 'Failed to load university profile');
      }

      const university = universityResponse.data?.myUniversity;
      if (university) {
        setOriginalProfile(university);
        setFormData({
          name: university.name ?? '',
          websiteUrl: university.websiteUrl ?? '',
          logoUrl: university.logoUrl ?? '',
        });
        setStats({
          totalStudents: university.stats?.totalStudents ?? 0,
          activeStudents: university.stats?.activeStudents ?? 0,
          totalCertificates: university.stats?.totalCertificates ?? 0,
          mintedCount: university.stats?.mintedCount ?? 0,
          pendingCount: university.stats?.pendingCount ?? 0,
          revokedCount: university.stats?.revokedCount ?? 0,
        });
      }

      // Get TOTP status from admin info
      if (meResponse.data?.me) {
        setTotpEnabled(meResponse.data.me.totpEnabled ?? false);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load university profile');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleTotpStatusChange = useCallback(async () => {
    // Refresh the admin data to get updated TOTP status
    try {
      const response = await graphqlClient.me();
      if (response.data?.me) {
        setTotpEnabled(response.data.me.totpEnabled ?? false);
      }
    } catch (err) {
      console.error('Failed to refresh TOTP status:', err);
    }
  }, []);

  const handleInputChange = (field: 'name' | 'websiteUrl' | 'logoUrl', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!originalProfile) return;

    const payload: { name?: string; websiteUrl?: string; logoUrl?: string } = {};
    const trimmedName = formData.name.trim();
    const trimmedWebsite = formData.websiteUrl.trim();
    const trimmedLogo = formData.logoUrl.trim();

    if (trimmedName && trimmedName !== originalProfile.name) {
      payload.name = trimmedName;
    }
    if (trimmedWebsite !== (originalProfile.websiteUrl ?? '')) {
      payload.websiteUrl = trimmedWebsite || '';
    }
    if (trimmedLogo !== (originalProfile.logoUrl ?? '')) {
      payload.logoUrl = trimmedLogo || '';
    }

    if (Object.keys(payload).length === 0) {
      toast.info({
        title: 'No changes detected',
        description: 'Update a field before saving.',
      });
      return;
    }

    try {
      setSaving(true);
      const response = await graphqlClient.updateUniversityProfile(payload);

      if (response.errors?.length) {
        throw new Error(response.errors[0]?.message ?? 'Failed to update university profile');
      }

      const updated = response.data?.updateUniversityProfile;
      if (updated) {
        setOriginalProfile(prev => (prev ? { ...prev, ...updated } : updated));
        setFormData({
          name: updated.name ?? trimmedName,
          websiteUrl: updated.websiteUrl ?? '',
          logoUrl: updated.logoUrl ?? '',
        });
      }

      toast.success({
        title: 'Profile updated',
        description: 'Your university settings have been saved successfully.',
      });
    } catch (err: any) {
      toast.error({
        title: 'Failed to update profile',
        description: err?.message ?? 'Please try again later.',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatWalletAddress = (address?: string | null) => {
    if (!address) return 'Not Connected';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const walletAddress = originalProfile?.walletAddress ?? '';
  const walletConnected = Boolean(walletAddress);
  const domain = originalProfile?.domain ?? '';
  const status = originalProfile?.status ?? '';

  if (loadingProfile) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading university settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 space-y-4 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold mb-2">Unable to load settings</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!originalProfile) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your university profile and wallet connection.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* University Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              University Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">University Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: any) => handleInputChange('name', e.target.value)}
                placeholder="Enter university name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                value={formData.websiteUrl}
                onChange={(e: any) => handleInputChange('websiteUrl', e.target.value)}
                placeholder="https://example.edu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e: any) => handleInputChange('logoUrl', e.target.value)}
                placeholder="https://cdn.example.edu/logo.png"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Verified Domain</Label>
                <div className="p-3 rounded-md border bg-muted/40 text-sm font-mono">
                  {domain || 'Not set'}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <div className="p-3 rounded-md border bg-muted/40 text-sm">
                  <span className="font-semibold">{status || 'UNKNOWN'}</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="w-full flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Wallet Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {walletConnected ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  )}
                  <div>
                    <div className="font-medium">
                      {walletConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {formatWalletAddress(walletAddress)}
                    </div>
                  </div>
                </div>
                <Badge variant={walletConnected ? "default" : "secondary"}>
                  {walletConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              <Button 
                variant="outline"
                className="w-full flex items-center gap-2"
                disabled
              >
                <Wallet className="h-4 w-4" />
                Manage Wallet (Coming Soon)
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Wallet connections are configured during on-chain onboarding. Contact support to rotate keys.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                About Wallet Connection
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your connected wallet is used to mint and manage NFT certificates.
                Make sure to use a secure wallet with sufficient SOL for transaction fees.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security - Two-Factor Authentication */}
      <TwoFactorSettings
        totpEnabled={totpEnabled}
        onStatusChange={handleTotpStatusChange}
      />

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            University Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalStudents.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.totalCertificates.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Certificates Issued</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.activeStudents.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Active Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.revokedCount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Revoked Certificates</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">Delete University Account</h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Permanently delete your university account and all associated data.
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 