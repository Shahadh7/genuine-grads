'use client';
import React from "react"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Settings,
  Shield,
  Download,
  Wallet,
  Mail,
  Building2,
  Copy,
  QrCode,
  LogOut
} from 'lucide-react';
import { getSession, clearSession } from '@/lib/session';
import QRCodeDialog from '@/components/student/qr-code-dialog';
import { mockStudentData } from '@/lib/mock-student-data';

interface Props {
  // Add props here
}

export default function AccountPage(): React.JSX.Element {
  const [session, setSession] = useState<any>(null);
  const [showQR, setShowQR] = useState<any>(false);
  const [profileData] = useState<any>(mockStudentData);
  const router = useRouter();

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession || currentSession.role !== 'student') {
      router.push('/login');
      return;
    }
    setSession(currentSession);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyWalletAddress = (text: string) => {
    copyToClipboard(text);
  };



  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Account</h1>
        <p className="text-muted-foreground">Wallet and account settings</p>
      </div>

      {/* Account Information Grid */}
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
        {/* Profile Section - Spans 4 columns */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <span>Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                  <AvatarImage src={profileData.avatar} />
                  <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                    {profileData.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{profileData.name}</h3>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <Badge variant="secondary" className="mt-1">Active</Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profileData.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">NIC Number</p>
                    <p className="font-medium">{profileData.nic}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Section - Spans 4 columns */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-green-500" />
                </div>
                <span>Wallet</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Wallet Address</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <code className="text-sm bg-muted/50 px-3 py-2 rounded-lg flex-1 font-mono border">
                    {profileData.wallet}
                  </code>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => copyWalletAddress(profileData.wallet)}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  size="sm" 
                  className="flex-1 bg-primary hover:bg-primary/90" 
                  onClick={() => setShowQR(true)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Universities Section - Spans 4 columns */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <span>Universities</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {profileData.universities.map((university: any, index: any) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-sm">
                      {university}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Actions Section - Spans full width below */}
        <div className="lg:col-span-12">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Settings className="h-5 w-5 text-orange-500" />
                </div>
                <span>Account Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-12 justify-start">
                  <Download className="h-4 w-4 mr-3" />
                  Export All Data
                </Button>
                <Button variant="outline" className="h-12 justify-start">
                  <Shield className="h-4 w-4 mr-3" />
                  Change Password
                </Button>
                <Button variant="outline" className="h-12 justify-start">
                  <Settings className="h-4 w-4 mr-3" />
                  Advanced Settings
                </Button>
                <Button 
                  variant="destructive" 
                  className="h-12 justify-start" 
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <QRCodeDialog
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          title="Identity QR Code"
          value={"https://genuinegrads.xyz/verify?wallet=" + profileData.wallet}
          description="Share this QR code to allow others to verify your academic credentials"
        />
      )}
    </div>
  );
} 