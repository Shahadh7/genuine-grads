'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { graphqlClient } from '@/lib/graphql-client';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  FileCheck,
  TrendingUp,
  Loader2,
  Eye,
  Ban,
  Settings,
} from 'lucide-react';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { loading: guardLoading } = useRoleGuard(['super_admin']);
  const [loading, setLoading] = useState(true);
  const [universities, setUniversities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0
  });

  useEffect(() => {
    if (guardLoading) return;
    loadUniversities();
  }, [guardLoading]);

  const loadUniversities = async () => {
    try {
      setLoading(true);
      const response = await graphqlClient.getAllUniversities();
      
      if (response.data?.allUniversities) {
        const unis = response.data.allUniversities;
        setUniversities(unis);
        
        // Calculate stats
        setStats({
          total: unis.length,
          pending: unis.filter((u: any) => u.status === 'PENDING_APPROVAL').length,
          approved: unis.filter((u: any) => u.status === 'APPROVED').length,
          rejected: unis.filter((u: any) => u.status === 'REJECTED').length,
          suspended: unis.filter((u: any) => u.status === 'SUSPENDED').length
        });
      }
    } catch (error) {
      console.error('Failed to load universities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      PENDING_APPROVAL: { variant: 'default', icon: Clock, label: 'Pending' },
      APPROVED: { variant: 'default', icon: CheckCircle, label: 'Approved' },
      REJECTED: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
      SUSPENDED: { variant: 'secondary', icon: Ban, label: 'Suspended' }
    };

    const config = configs[status as keyof typeof configs] || configs.PENDING_APPROVAL;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filterUniversities = (status?: string) => {
    if (!status || status === 'all') return universities;
    return universities.filter(u => u.status === status);
  };

  if (guardLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage university registrations and approvals</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/settings')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Universities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <Clock className="h-4 w-4 text-orange-600 mt-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <XCircle className="h-4 w-4 text-red-600 mt-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suspended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.suspended}</div>
            <Ban className="h-4 w-4 text-gray-600 mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* Universities List with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Universities</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
              <TabsTrigger value="suspended">Suspended ({stats.suspended})</TabsTrigger>
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            </TabsList>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-4">
              <UniversityList
                universities={filterUniversities('PENDING_APPROVAL')}
                onAction={loadUniversities}
                showActions={true}
              />
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-4">
              <UniversityList
                universities={filterUniversities('APPROVED')}
                onAction={loadUniversities}
                showActions={true}
              />
            </TabsContent>

            {/* Rejected Tab */}
            <TabsContent value="rejected" className="space-y-4">
              <UniversityList
                universities={filterUniversities('REJECTED')}
                onAction={loadUniversities}
                showActions={false}
              />
            </TabsContent>

            {/* Suspended Tab */}
            <TabsContent value="suspended" className="space-y-4">
              <UniversityList
                universities={filterUniversities('SUSPENDED')}
                onAction={loadUniversities}
                showActions={true}
              />
            </TabsContent>

            {/* All Tab */}
            <TabsContent value="all" className="space-y-4">
              <UniversityList
                universities={universities}
                onAction={loadUniversities}
                showActions={true}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function UniversityList({ 
  universities, 
  onAction, 
  showActions 
}: { 
  universities: any[]; 
  onAction: () => void;
  showActions: boolean;
}) {
  const router = useRouter();

  if (universities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No universities found in this category</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {universities.map((university) => (
        <Card key={university.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{university.name}</h3>
                  {getStatusBadge(university.status)}
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Domain:</span> {university.domain}
                  </div>
                  <div>
                    <span className="font-medium">Country:</span> {university.country}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Wallet:</span>{' '}
                    <code className="text-xs">{university.walletAddress}</code>
                  </div>
                  <div>
                    <span className="font-medium">Registered:</span>{' '}
                    {new Date(university.createdAt).toLocaleDateString()}
                  </div>
                  {university.approvedAt && (
                    <div>
                      <span className="font-medium">Approved:</span>{' '}
                      {new Date(university.approvedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {showActions && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/universities/${university.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>

                  {university.status === 'PENDING_APPROVAL' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => router.push(`/admin/universities/${university.id}/approve`)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  )}

                  {university.status === 'APPROVED' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => router.push(`/admin/universities/${university.id}/suspend`)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Suspend
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getStatusBadge(status: string) {
  const configs = {
    PENDING_APPROVAL: { variant: 'default', icon: Clock, label: 'Pending', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    APPROVED: { variant: 'default', icon: CheckCircle, label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    REJECTED: { variant: 'destructive', icon: XCircle, label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    SUSPENDED: { variant: 'secondary', icon: Ban, label: 'Suspended', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' }
  };

  const config = configs[status as keyof typeof configs] || configs.PENDING_APPROVAL;
  const Icon = config.icon;

  return (
    <Badge className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

