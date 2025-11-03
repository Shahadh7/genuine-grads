'use client';
import React from "react";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mockUniversityProfile } from '@/lib/mock-data-clean';
import { 
  Settings, 
  Building, 
  Mail, 
  Wallet, 
  Upload, 
  Save, 
  LogOut,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface Props {
  // Add props here
}

export default function SettingsPage(): React.JSX.Element {
  const [formData, setFormData] = useState<any>({
    name: mockUniversityProfile.name,
    email: mockUniversityProfile.email,
    description: mockUniversityProfile.description,
    logo: null
  });
  const [loading, setLoading] = useState<any>(false);
  const [walletConnected, setWalletConnected] = useState<any>(true);
  const [walletAddress] = useState<any>(mockUniversityProfile.walletAddress);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        logo: file
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setLoading(false);
    // In a real app, you would show a success message
  };

  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    // In a real app, you would disconnect the wallet
  };

  const formatWalletAddress = (address) => {
    if (!address) return 'Not Connected';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

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
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e: any) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: any) => handleInputChange('description', e.target.value)}
                placeholder="Enter university description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">University Logo</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="logo">
                  <Button variant="outline" as="span" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </Button>
                </label>
                {formData.logo && (
                  <span className="text-sm text-muted-foreground">
                    {formData.logo.name}
                  </span>
                )}
              </div>
            </div>

            <Button 
              onClick={handleSave}
              disabled={loading}
              className="w-full flex items-center gap-2"
            >
              {loading ? (
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

              {walletConnected ? (
                <Button 
                  variant="outline" 
                  onClick={handleDisconnectWallet}
                  className="w-full flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect Wallet
                </Button>
              ) : (
                <Button className="w-full flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </Button>
              )}
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
                {mockUniversityProfile.stats.totalStudents.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {mockUniversityProfile.stats.totalCertificates.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Certificates Issued</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {mockUniversityProfile.stats.activeCertificates.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Active Certificates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {mockUniversityProfile.stats.totalRevoked}
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