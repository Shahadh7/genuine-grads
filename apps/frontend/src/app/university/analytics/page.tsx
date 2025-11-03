'use client';
import React from "react";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analyticsAPI } from '@/lib/api';
import { 
  TrendingUp, 
  Award, 
  Users, 
  Wallet,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface Props {
  // Add props here
}

export default function AnalyticsPage(): React.JSX.Element {
  const [stats, setStats] = useState<any>(null);
  const [mintLogs, setMintLogs] = useState<any>([]);
  const [loading, setLoading] = useState<any>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsResult, logsResult] = await Promise.all([
          analyticsAPI.getDashboardStats(),
          analyticsAPI.getMintLogs()
        ]);
        
        if (statsResult.success) {
          setStats(statsResult.data);
        }
        
        if (logsResult.success) {
          setMintLogs(logsResult.data);
        }
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const calculatePercentage = (value, total) => {
    return ((value / total) * 100).toFixed(1);
  };

  if (loading) {
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
          <p className="text-muted-foreground">Failed to load analytics data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Comprehensive insights into your certificate issuance and student data.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
            <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatNumber(stats.totalCertificates)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatNumber(stats.totalStudents)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallets Connected</CardTitle>
            <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatNumber(stats.walletConnected)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(stats.walletConnected, stats.totalStudents)}% of total students
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Certificates</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatNumber(stats.activeCertificates)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">+15%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Mint Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Mint Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mintLogs.slice(0, 5).map((log: any, index: any) => {
                const date = new Date(log.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                });
                
                return (
                  <div key={log.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{date}</span>
                      <span className="text-muted-foreground">Certificate #{log.certificateId}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                );
              })}
              {mintLogs.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No mint activity yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Certificate Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Certificate Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Active Certificates</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{stats.activeCertificates} certificates</span>
                    <Badge variant="default" className="text-xs">
                      {calculatePercentage(stats.activeCertificates, stats.totalCertificates)}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculatePercentage(stats.activeCertificates, stats.totalCertificates)}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Pending Certificates</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{stats.totalCertificates - stats.activeCertificates} certificates</span>
                    <Badge variant="secondary" className="text-xs">
                      {calculatePercentage(stats.totalCertificates - stats.activeCertificates, stats.totalCertificates)}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculatePercentage(stats.totalCertificates - stats.activeCertificates, stats.totalCertificates)}%` }}
                  />
                </div>
              </div>
              
              {stats.revokedCertificates > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Revoked Certificates</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{stats.revokedCertificates} certificates</span>
                      <Badge variant="destructive" className="text-xs">
                        {calculatePercentage(stats.revokedCertificates, stats.totalCertificates)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculatePercentage(stats.revokedCertificates, stats.totalCertificates)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {formatNumber(stats.walletConnected)}
              </div>
              <div className="text-sm text-muted-foreground">Connected Wallets</div>
              <Badge variant="default" className="mt-2">
                {calculatePercentage(stats.walletConnected, stats.totalStudents)}%
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                {formatNumber(stats.walletUnconnected)}
              </div>
              <div className="text-sm text-muted-foreground">Unconnected Wallets</div>
              <Badge variant="secondary" className="mt-2">
                {calculatePercentage(stats.walletUnconnected, stats.totalStudents)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 