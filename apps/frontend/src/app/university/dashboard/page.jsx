'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSession } from '@/lib/session';
import { analyticsAPI } from '@/lib/api';
import { 
  GraduationCap, 
  Building, 
  Users, 
  Award, 
  Plus, 
  FileText, 
  CheckCircle,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function UniversityDashboard() {
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentCertificates, setRecentCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const currentSession = getSession();
      if (!currentSession || currentSession.role !== 'university') {
        return;
      }
      setSession(currentSession);
      
      try {
        const statsResult = await analyticsAPI.getDashboardStats();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
        
        // Load recent certificates
        const recentCerts = await analyticsAPI.getRecentCertificates();
        if (recentCerts.success) {
          setRecentCertificates(recentCerts.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (!session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load dashboard data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {session.nic}!</h1>
        <p className="text-muted-foreground">Manage student credentials and certificate issuance.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates Issued</CardTitle>
            <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalCertificates.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Certificates</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.activeCertificates.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">99.9%</span> active rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revoked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalRevoked}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600 dark:text-red-400">0.1%</span> revocation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/university/certificates/issue">
          <Button variant="outline" className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
            <Plus className="h-6 w-6" />
            <span>Issue Certificate</span>
          </Button>
        </Link>
        <Link href="/university/students">
          <Button variant="outline" className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
            <Users className="h-6 w-6" />
            <span>Manage Students</span>
          </Button>
        </Link>
        <Link href="/university/certificates">
          <Button variant="outline" className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
            <FileText className="h-6 w-6" />
            <span>View Certificates</span>
          </Button>
        </Link>
        <Link href="/university/analytics">
          <Button variant="outline" className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors">
            <TrendingUp className="h-6 w-6" />
            <span>Analytics</span>
          </Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Certificate Issuance</h2>
          <Link href="/university/certificates">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentCertificates.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${cert.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      <CheckCircle className={`h-4 w-4 ${cert.status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{cert.studentName}</p>
                      <p className="text-sm text-muted-foreground">{cert.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={cert.status === 'Active' ? 'default' : 'destructive'} className="mb-1">
                      {cert.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{cert.issueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 