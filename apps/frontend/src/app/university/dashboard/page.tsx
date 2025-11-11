'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { graphqlClient } from '@/lib/graphql-client';
import { 
  GraduationCap, 
  Users, 
  Award, 
  Plus, 
  FileText, 
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Clock
} from 'lucide-react';

export default function UniversityDashboard(): React.JSX.Element {
  const router = useRouter();
  const { session, loading: guardLoading } = useRoleGuard(['university_admin']);
  const [university, setUniversity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (guardLoading || !session) return;

      try {
        const response = await graphqlClient.getMyUniversity();

        if (response.errors) {
          setError(response.errors[0]?.message || 'Failed to load dashboard data');
          return;
        }

        if (response.data?.myUniversity) {
          setUniversity(response.data.myUniversity);
        } else {
          setError('University data not found');
        }
      } catch (error: any) {
        console.error('Failed to load dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [router, guardLoading, session]);

  if (guardLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No university data available.</p>
        </div>
      </div>
    );
  }

  const stats = university.stats || {
    totalStudents: 0,
    activeStudents: 0,
    totalCertificates: 0,
    mintedCount: 0,
    pendingCount: 0,
    revokedCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome, {session?.fullName || session?.email}!
            </h1>
            <p className="text-muted-foreground">
              {university.name} - Dashboard
            </p>
          </div>
          {university.status && (
            <Badge 
              variant={university.status === 'APPROVED' ? 'default' : 
                       university.status === 'PENDING_APPROVAL' ? 'secondary' : 
                       'destructive'}
            >
              {university.status.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalStudents.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.activeStudents.toLocaleString()} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates Minted</CardTitle>
            <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.mintedCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalCertificates.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Certificates</CardTitle>
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.pendingCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Waiting to be minted
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revoked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.revokedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCertificates > 0 
                ? ((stats.revokedCount / stats.totalCertificates) * 100).toFixed(1) 
                : '0'}% revocation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/university/certificates/issue">
          <Button 
            variant="outline" 
            className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Plus className="h-6 w-6" />
            <span>Issue Certificate</span>
          </Button>
        </Link>
        
        <Link href="/university/students">
          <Button 
            variant="outline" 
            className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Users className="h-6 w-6" />
            <span>Manage Students</span>
          </Button>
        </Link>
        
        <Link href="/university/certificates">
          <Button 
            variant="outline" 
            className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <FileText className="h-6 w-6" />
            <span>View Certificates</span>
          </Button>
        </Link>
        
        <Link href="/university/analytics">
          <Button 
            variant="outline" 
            className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <TrendingUp className="h-6 w-6" />
            <span>Analytics</span>
          </Button>
        </Link>
      </div>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/university/certificates">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.totalCertificates === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No certificates issued yet
              </p>
              <Link href="/university/certificates/issue">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Issue First Certificate
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              View your certificates in the Certificates section
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
