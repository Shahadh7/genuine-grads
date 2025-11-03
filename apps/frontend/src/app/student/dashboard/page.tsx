'use client';
import React from "react"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  GraduationCap, 
  Wallet, 
  User, 
  LogOut, 
  Award, 
  Trophy,
  QrCode,
  Download,
  Share2,
  Eye,
  Copy,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Star,
  Crown,
  Target,
  FileText,
  Shield,
  Globe
} from 'lucide-react';
import { getSession, clearSession } from '@/lib/session';
import QRCode from 'react-qr-code';
import QRCodeDialog from '@/components/student/qr-code-dialog';
import DashboardMetrics from '@/components/student/dashboard-metrics';
import { 
  mockStudentData, 
  mockCertificates, 
  mockAchievements, 
  mockVerificationLogs,
  mockDashboardMetrics
} from '@/lib/mock-student-data';

interface Props {
  // Add props here
}

export default function StudentDashboard(): React.JSX.Element {
  const [session, setSession] = useState<any>(null);
  const [walletConnected, setWalletConnected] = useState<any>(false);
  const [showQR, setShowQR] = useState<any>(false);
  const router = useRouter();

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession || currentSession.role !== 'student') {
      router.push('/login');
      return;
    }
    setSession(currentSession);
    setWalletConnected(!!currentSession.wallet);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const shareCertificate = (assetId) => {
    const url = "https://genuinegrads.xyz/verify?asset=" + assetId;
    copyToClipboard(url);
  };

  const claimAchievement = (achievementId) => {
    console.log("Claiming achievement: " + achievementId);
  };

  const copyProof = (proofId) => {
    copyToClipboard(proofId);
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
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={mockStudentData.avatar} />
            <AvatarFallback className="text-lg">
              {mockStudentData.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome back, {mockStudentData.name}!</h2>
            <p className="text-muted-foreground">Manage your academic credentials and achievements.</p>
          </div>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <DashboardMetrics metrics={mockDashboardMetrics} />

      {/* Dashboard Overview Content */}
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Certificates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Recent Certificates</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockCertificates.slice(0, 3).map((cert: any) => (
                <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{cert.title}</p>
                    <p className="text-sm text-muted-foreground">{cert.university}</p>
                  </div>
                  <Badge variant={cert.status === 'valid' ? 'default' : 'destructive'}>
                    {cert.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Recent Achievements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockAchievements.slice(0, 3).map((achievement: any) => (
                <div key={achievement.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <achievement.icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{achievement.title}</p>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                  <Badge variant={achievement.status === 'claimed' ? 'default' : 'secondary'}>
                    {achievement.status}
                  </Badge>
                </div>
              ))}
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
          value={"https://genuinegrads.xyz/verify?wallet=" + mockStudentData.wallet}
          description="Share this QR code to allow others to verify your academic credentials"
        />
      )}
    </div>
  );
} 