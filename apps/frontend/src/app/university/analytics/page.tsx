'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { graphqlClient } from '@/lib/graphql-client';
import {
  Award,
  Users,
  Wallet,
  TrendingUp,
  BarChart3,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Shield,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalCertificates: number;
    mintedCertificates: number;
    pendingCertificates: number;
    revokedCertificates: number;
    totalStudents: number;
    activeStudents: number;
    studentsWithWallet: number;
    studentsWithoutWallet: number;
    totalVerifications: number;
    successfulVerifications: number;
    failedVerifications: number;
    totalCourses: number;
  };
  blockchainMetrics: {
    totalMintTransactions: number;
    successfulMints: number;
    failedMints: number;
    treeAddress: string | null;
    collectionAddress: string | null;
    successRate: number;
    recentMints: Array<{
      id: string;
      signature: string | null;
      studentName: string;
      badgeTitle: string;
      timestamp: string;
      status: string;
    }>;
  };
  trends: {
    certificatesPerDay: Array<{ date: string; count: number }>;
    verificationsPerDay: Array<{ date: string; count: number }>;
    studentsPerMonth: Array<{ month: string; count: number }>;
  };
  topPrograms: Array<{
    program: string;
    department: string | null;
    studentCount: number;
    certificateCount: number;
  }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  const loadAnalytics = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await graphqlClient.getUniversityAnalytics(days);
      if (response.data?.universityAnalytics) {
        setAnalytics(response.data.universityAnalytics);
      }
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const formatNumber = (num: number) => num.toLocaleString();

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  };

  const truncateAddress = (address: string | null) => {
    if (!address) return 'Not set';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getMaxCount = (data: Array<{ count: number }>) => {
    return Math.max(...data.map((d) => d.count), 1);
  };

  const getTotalCount = (data: Array<{ count: number }>) => {
    return data.reduce((sum, d) => sum + d.count, 0);
  };

  const getDaysWithData = (data: Array<{ count: number }>) => {
    return data.filter((d) => d.count > 0).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load analytics data.</p>
          <Button onClick={() => loadAnalytics()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { overview, blockchainMetrics, trends, topPrograms } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your certificate issuance and blockchain activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
            <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatNumber(overview.totalCertificates)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default" className="text-xs bg-green-500">
                {formatNumber(overview.mintedCertificates)} minted
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {formatNumber(overview.pendingCertificates)} pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatNumber(overview.totalStudents)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600 dark:text-green-400 font-medium">
                {formatNumber(overview.activeStudents)}
              </span>{' '}
              active students
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Connections</CardTitle>
            <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatNumber(overview.studentsWithWallet)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {calculatePercentage(overview.studentsWithWallet, overview.totalStudents)}% of
              students connected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verifications</CardTitle>
            <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatNumber(overview.totalVerifications)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-green-600">
                {formatNumber(overview.successfulVerifications)} valid
              </span>
              <span className="text-xs text-red-600">
                {formatNumber(overview.failedVerifications)} failed
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Certificate Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certificate Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Minted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {formatNumber(overview.mintedCertificates)}
                        </span>
                        <Badge variant="default" className="text-xs bg-green-500">
                          {calculatePercentage(
                            overview.mintedCertificates,
                            overview.totalCertificates
                          )}
                          %
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${calculatePercentage(overview.mintedCertificates, overview.totalCertificates)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span>Pending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {formatNumber(overview.pendingCertificates)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {calculatePercentage(
                            overview.pendingCertificates,
                            overview.totalCertificates
                          )}
                          %
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${calculatePercentage(overview.pendingCertificates, overview.totalCertificates)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {overview.revokedCertificates > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span>Revoked</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {formatNumber(overview.revokedCertificates)}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            {calculatePercentage(
                              overview.revokedCertificates,
                              overview.totalCertificates
                            )}
                            %
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${calculatePercentage(overview.revokedCertificates, overview.totalCertificates)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Student Wallet Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Student Wallet Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatNumber(overview.studentsWithWallet)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Connected</div>
                    <Badge variant="default" className="mt-2 bg-green-500">
                      {calculatePercentage(overview.studentsWithWallet, overview.totalStudents)}%
                    </Badge>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {formatNumber(overview.studentsWithoutWallet)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Not Connected</div>
                    <Badge variant="secondary" className="mt-2">
                      {calculatePercentage(overview.studentsWithoutWallet, overview.totalStudents)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Programs */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Top Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPrograms.length > 0 ? (
                  <div className="space-y-4">
                    {topPrograms.slice(0, 5).map((program, index) => (
                      <div key={program.program} className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{program.program}</div>
                          {program.department && (
                            <div className="text-xs text-muted-foreground">{program.department}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium">{formatNumber(program.studentCount)}</div>
                            <div className="text-xs text-muted-foreground">Students</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">
                              {formatNumber(program.certificateCount)}
                            </div>
                            <div className="text-xs text-muted-foreground">Certificates</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No program data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Blockchain Tab */}
        <TabsContent value="blockchain" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Mint Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(blockchainMetrics.totalMintTransactions)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default" className="text-xs bg-green-500">
                    {formatNumber(blockchainMetrics.successfulMints)} successful
                  </Badge>
                  {blockchainMetrics.failedMints > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {formatNumber(blockchainMetrics.failedMints)} failed
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {blockchainMetrics.successRate.toFixed(1)}%
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${blockchainMetrics.successRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Blockchain Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Merkle Tree</span>
                  {blockchainMetrics.treeAddress ? (
                    <a
                      href={`https://explorer.solana.com/address/${blockchainMetrics.treeAddress}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {truncateAddress(blockchainMetrics.treeAddress)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Badge variant="secondary">Not set</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Collection</span>
                  {blockchainMetrics.collectionAddress ? (
                    <a
                      href={`https://explorer.solana.com/address/${blockchainMetrics.collectionAddress}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {truncateAddress(blockchainMetrics.collectionAddress)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Badge variant="secondary">Not set</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Mints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Mint Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockchainMetrics.recentMints.length > 0 ? (
                <div className="space-y-3">
                  {blockchainMetrics.recentMints.map((mint) => (
                    <div
                      key={mint.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${mint.status === 'SUCCESS' ? 'bg-green-500' : mint.status === 'FAILED' ? 'bg-red-500' : 'bg-orange-500'}`}
                        />
                        <div>
                          <div className="font-medium">{mint.badgeTitle}</div>
                          <div className="text-sm text-muted-foreground">{mint.studentName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          {new Date(mint.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {mint.signature && (
                          <a
                            href={`https://explorer.solana.com/tx/${mint.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center justify-end gap-1"
                          >
                            View tx <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No mint activity yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Certificates ({days} days)</p>
                    <p className="text-2xl font-bold">{getTotalCount(trends.certificatesPerDay)}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Activity on {getDaysWithData(trends.certificatesPerDay)} of {days} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Verifications ({days} days)</p>
                    <p className="text-2xl font-bold">{getTotalCount(trends.verificationsPerDay)}</p>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-full">
                    <Shield className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Activity on {getDaysWithData(trends.verificationsPerDay)} of {days} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      New Students ({trends.studentsPerMonth.length} month{trends.studentsPerMonth.length !== 1 ? 's' : ''})
                    </p>
                    <p className="text-2xl font-bold">{getTotalCount(trends.studentsPerMonth)}</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-full">
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Activity in {getDaysWithData(trends.studentsPerMonth)} of {trends.studentsPerMonth.length} month{trends.studentsPerMonth.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Certificates Per Day */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Certificates Issued
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getTotalCount(trends.certificatesPerDay) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-sm">No certificates issued in this period</p>
                  <p className="text-xs mt-1">Certificates will appear here once issued</p>
                </div>
              ) : (
                <>
                  <div className="h-52 flex items-end gap-1 pt-8">
                    {(() => {
                      const daysWithData = getDaysWithData(trends.certificatesPerDay);
                      const maxCount = getMaxCount(trends.certificatesPerDay);
                      const dataToShow = trends.certificatesPerDay.filter((d) => d.count > 0);

                      // Always show only days with data, but adjust bar width based on count
                      const maxBars = days <= 7 ? 7 : days <= 14 ? 10 : 15;
                      const barMaxWidth = daysWithData <= 5 ? 'max-w-20' : daysWithData <= 10 ? 'max-w-16' : 'max-w-12';

                      return dataToShow.slice(-maxBars).map((day) => {
                        const height = (day.count / maxCount) * 100;
                        return (
                          <div
                            key={day.date}
                            className={`flex-1 ${barMaxWidth} flex flex-col items-center justify-end group`}
                          >
                            <div className="text-xs font-medium text-primary mb-1">
                              {day.count}
                            </div>
                            <div className="relative w-full">
                              <div
                                className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all duration-200"
                                style={{ height: `${Math.max(height, 15)}%`, minHeight: '32px' }}
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-2 text-center">
                              {new Date(day.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3 text-center">
                    {getDaysWithData(trends.certificatesPerDay)} day{getDaysWithData(trends.certificatesPerDay) !== 1 ? 's' : ''} with activity in last {days} days
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Verifications Per Day */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getTotalCount(trends.verificationsPerDay) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-sm">No verifications in this period</p>
                  <p className="text-xs mt-1">Verification activity will appear here</p>
                </div>
              ) : (
                <>
                  <div className="h-52 flex items-end gap-1 pt-8">
                    {(() => {
                      const daysWithData = getDaysWithData(trends.verificationsPerDay);
                      const maxCount = getMaxCount(trends.verificationsPerDay);
                      const dataToShow = trends.verificationsPerDay.filter((d) => d.count > 0);

                      // Always show only days with data, but adjust bar width based on count
                      const maxBars = days <= 7 ? 7 : days <= 14 ? 10 : 15;
                      const barMaxWidth = daysWithData <= 5 ? 'max-w-20' : daysWithData <= 10 ? 'max-w-16' : 'max-w-12';

                      return dataToShow.slice(-maxBars).map((day) => {
                        const height = (day.count / maxCount) * 100;
                        return (
                          <div
                            key={day.date}
                            className={`flex-1 ${barMaxWidth} flex flex-col items-center justify-end group`}
                          >
                            <div className="text-xs font-medium text-orange-500 mb-1">
                              {day.count}
                            </div>
                            <div className="relative w-full">
                              <div
                                className="w-full bg-orange-500/80 hover:bg-orange-500 rounded-t transition-all duration-200"
                                style={{ height: `${Math.max(height, 15)}%`, minHeight: '32px' }}
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-2 text-center">
                              {new Date(day.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3 text-center">
                    {getDaysWithData(trends.verificationsPerDay)} day{getDaysWithData(trends.verificationsPerDay) !== 1 ? 's' : ''} with activity in last {days} days
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Students Per Month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                New Students (Last {trends.studentsPerMonth.length} Month{trends.studentsPerMonth.length !== 1 ? 's' : ''})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getTotalCount(trends.studentsPerMonth) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-sm">No new students in this period</p>
                  <p className="text-xs mt-1">Student registrations will appear here</p>
                </div>
              ) : (
                <>
                  <div className="h-52 flex items-end gap-2 pt-8">
                    {(() => {
                      const monthsWithData = getDaysWithData(trends.studentsPerMonth);
                      const maxCount = getMaxCount(trends.studentsPerMonth);
                      const dataToShow = trends.studentsPerMonth.filter((m) => m.count > 0);

                      const barMaxWidth = monthsWithData <= 4 ? 'max-w-28' : monthsWithData <= 8 ? 'max-w-20' : 'max-w-16';

                      return dataToShow.map((month) => {
                        const height = (month.count / maxCount) * 100;
                        return (
                          <div
                            key={month.month}
                            className={`flex-1 ${barMaxWidth} flex flex-col items-center justify-end group`}
                          >
                            <div className="text-xs font-medium text-green-500 mb-1">
                              {month.count}
                            </div>
                            <div className="relative w-full">
                              <div
                                className="w-full bg-green-500/80 hover:bg-green-500 rounded-t transition-all duration-200"
                                style={{ height: `${Math.max(height, 15)}%`, minHeight: '32px' }}
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-2 text-center font-medium">
                              {month.month}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3 text-center">
                    {getDaysWithData(trends.studentsPerMonth)} of {trends.studentsPerMonth.length} month{trends.studentsPerMonth.length !== 1 ? 's' : ''} with registrations
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
