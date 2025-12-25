'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings, User, ArrowLeft } from 'lucide-react';
import { graphqlClient } from '@/lib/graphql-client';
import TwoFactorSettings from '@/components/settings/TwoFactorSettings';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<any>(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await graphqlClient.me();

      if (response.errors?.length) {
        throw new Error(response.errors[0]?.message ?? 'Failed to load admin profile');
      }

      if (response.data?.me) {
        setAdmin(response.data.me);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load admin profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleTotpStatusChange = useCallback(async () => {
    // Refresh the admin data to get updated TOTP status
    try {
      const response = await graphqlClient.me();
      if (response.data?.me) {
        setAdmin(response.data.me);
      }
    } catch (err) {
      console.error('Failed to refresh admin data:', err);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push('/admin/dashboard')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Admin Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Username</label>
                <p className="text-lg">{admin?.username || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg">{admin?.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-lg">{admin?.fullName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p className="text-lg">
                  {admin?.isSuperAdmin ? 'Super Administrator' : 'Administrator'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <TwoFactorSettings
          totpEnabled={admin?.totpEnabled ?? false}
          onStatusChange={handleTotpStatusChange}
        />
      </div>
    </div>
  );
}
