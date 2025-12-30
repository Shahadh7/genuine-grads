'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  CheckCircle,
  XCircle,
  Globe,
  Monitor,
  Calendar,
  Award,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { graphqlClient } from '@/lib/graphql-client';
import { format } from 'date-fns';

interface VerificationLog {
  id: string;
  verifiedAt: string;
  verificationType: string;
  verificationStatus: string;
  verifierIpAddress: string | null;
  verifierLocation: string | null;
  verifierUserAgent: string | null;
  certificateNumber: string;
  mintAddress: string;
  errorMessage: string | null;
  certificate: {
    id: string;
    certificateNumber: string;
    badgeTitle: string;
    mintAddress: string;
    status: string;
    issuedAt: string;
  };
}

interface Stats {
  total: number;
  successful: number;
  failed: number;
}

const LOGS_PER_PAGE = 10;

export default function VerificationLogPage() {
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, successful: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [logsResponse, statsResponse] = await Promise.all([
        graphqlClient.myVerificationLogs(LOGS_PER_PAGE, 0),
        graphqlClient.myVerificationLogStats(),
      ]);

      if (logsResponse.errors) {
        throw new Error(logsResponse.errors[0]?.message || 'Failed to load verification logs');
      }

      if (statsResponse.errors) {
        throw new Error(statsResponse.errors[0]?.message || 'Failed to load stats');
      }

      const newLogs = logsResponse.data?.myVerificationLogs || [];
      setLogs(newLogs);
      setStats(statsResponse.data?.myVerificationLogStats || { total: 0, successful: 0, failed: 0 });
      setOffset(LOGS_PER_PAGE);
      setHasMore(newLogs.length === LOGS_PER_PAGE);
    } catch (err: any) {
      setError(err.message || 'Failed to load verification logs');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLogs = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);

      const logsResponse = await graphqlClient.myVerificationLogs(LOGS_PER_PAGE, offset);

      if (logsResponse.errors) {
        throw new Error(logsResponse.errors[0]?.message || 'Failed to load more logs');
      }

      const newLogs = logsResponse.data?.myVerificationLogs || [];

      if (newLogs.length === 0) {
        setHasMore(false);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
        setOffset(prev => prev + LOGS_PER_PAGE);
        setHasMore(newLogs.length === LOGS_PER_PAGE);
      }
    } catch (err: any) {
      // Silent fail
    } finally {
      setLoadingMore(false);
    }
  }, [offset, loadingMore, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreLogs();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMoreLogs, hasMore, loadingMore]);

  const getStatusBadge = (status: string) => {
    if (status === 'SUCCESS') {
      return (
        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-red-500/20">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const getVerificationTypeIcon = (type: string) => {
    switch (type) {
      case 'PUBLIC':
        return <Globe className="h-4 w-4 text-primary" />;
      case 'ZKP':
        return <Shield className="h-4 w-4 text-primary" />;
      case 'API':
        return <Monitor className="h-4 w-4 text-primary" />;
      default:
        return <Shield className="h-4 w-4 text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading verification logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
            Verification History
          </h1>
          <p className="text-muted-foreground mt-1">
            Track when and where your certificates have been verified
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Verifications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stats.successful}</p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">Error loading verification logs</p>
                <p className="text-sm text-red-500/80">{error}</p>
              </div>
            </div>
            <Button
              onClick={loadInitialData}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Verification Log Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Verification Events
          </CardTitle>
          <CardDescription>
            Detailed history of all certificate verification attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id} className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Left Side: Certificate Info */}
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Award className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {log.certificate.badgeTitle}
                            </h3>
                            {getStatusBadge(log.verificationStatus)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Certificate #{log.certificateNumber}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(log.verifiedAt), 'PPp')}
                            </div>
                            <div className="flex items-center gap-1">
                              {getVerificationTypeIcon(log.verificationType)}
                              <span>{log.verificationType}</span>
                            </div>
                            {log.verifierIpAddress && (
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                <span>{log.verifierIpAddress}</span>
                              </div>
                            )}
                            {log.verifierLocation && (
                              <div className="flex items-center gap-1">
                                <span>📍 {log.verifierLocation}</span>
                              </div>
                            )}
                          </div>
                          {log.errorMessage && (
                            <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                              <p className="text-xs text-red-600 dark:text-red-400">
                                {log.errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(log.mintAddress);
                          }}
                          className="text-xs"
                        >
                          Copy Asset ID
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Infinite Scroll Observer Target */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading more logs...</span>
                  </div>
                )}
                {!hasMore && logs.length > 0 && (
                  <p className="text-sm text-muted-foreground">No more verification logs</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-muted/30 rounded-full mb-4">
                <Shield className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No verification events yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                When someone verifies your certificates, you'll see the verification logs here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
