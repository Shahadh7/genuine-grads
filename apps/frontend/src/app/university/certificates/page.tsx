'use client';
import React from "react";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { graphqlClient } from '@/lib/graphql-client';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  XCircle, 
  Calendar,
  Filter,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  // Add props here
}

type CertificateRecord = {
  id: string;
  badgeTitle: string;
  certificateNumber?: string | null;
  status: 'PENDING' | 'MINTED' | 'FAILED';
  issuedAt?: string | null;
  mintAddress?: string | null;
  transactionSignature?: string | null;
  student?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    walletAddress?: string | null;
    studentNumber?: string | null;
    program?: string | null;
    department?: string | null;
  } | null;
};

export default function CertificatesPage(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [programOptions, setProgramOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const certificatesResponse = await graphqlClient.getCertificates();
        const certs = (certificatesResponse.data?.certificates ?? []) as CertificateRecord[];
        setCertificates(certs);

        const programs = Array.from(
          new Set(
            certs
              .map((cert) => cert.student?.program?.trim())
              .filter((program): program is string => !!program)
          )
        ).sort((a, b) => a.localeCompare(b));

        setProgramOptions(programs);
      } catch (error) {
        console.error('Failed to load certificates:', error);
        setError('Unable to load certificates. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Pending';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredCertificates = certificates.filter((cert) => {
    const studentName = cert.student?.fullName ?? '';
    const studentNumber = cert.student?.studentNumber ?? '';
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      !search ||
      studentName.toLowerCase().includes(search) ||
      studentNumber.toLowerCase().includes(search) ||
      (cert.badgeTitle ?? '').toLowerCase().includes(search) ||
      (cert.certificateNumber ?? '').toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'issued' && cert.status === 'MINTED') ||
      (statusFilter === 'pending' && cert.status === 'PENDING') ||
      (statusFilter === 'failed' && cert.status === 'FAILED');

    const matchesProgram =
      programFilter === 'all' ||
      (cert.student?.program?.toLowerCase() ?? '') === programFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesProgram;
  });

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (cert: CertificateRecord) => (
        <div>
          <div className="font-medium">{cert.student?.fullName ?? 'Unknown Student'}</div>
          <div className="text-sm text-muted-foreground">
            ID: {cert.student?.studentNumber ?? cert.student?.id ?? '—'}
          </div>
          {cert.student?.program && (
            <div className="text-xs text-muted-foreground mt-1">
              Program: {cert.student.program}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'certificate',
      header: 'Certificate',
      render: (cert: CertificateRecord) => (
        <div className="max-w-[240px]">
          <div className="font-medium">{cert.badgeTitle}</div>
          {cert.mintAddress && (
            <div className="text-sm text-muted-foreground font-mono">
              {cert.mintAddress.slice(0, 8)}...
            </div>
          )}
        </div>
      )
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      render: (cert: CertificateRecord) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDate(cert.issuedAt ?? null)}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (cert: CertificateRecord) => (
        <Badge
          variant={
            cert.status === 'MINTED'
              ? 'default'
              : cert.status === 'FAILED'
              ? 'destructive'
              : 'secondary'
          }
        >
          {cert.status === 'MINTED' ? 'Issued' : cert.status === 'FAILED' ? 'Failed' : 'Pending'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (cert: CertificateRecord) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>View Details</span>
            </DropdownMenuItem>
            {cert.status === 'MINTED' && (
              <DropdownMenuItem className="flex items-center gap-2 text-destructive focus:text-destructive">
                <XCircle className="h-4 w-4" />
                <span>Revoke Certificate</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Certificates</h1>
          <p className="text-muted-foreground">Manage issued certificates and their status.</p>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <div className="flex gap-2">
          <Link href="/university/certificates/issue">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Issue Certificate
            </Button>
          </Link>
          <Link href="/university/certificates/designer">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Design Templates
            </Button>
          </Link>
          <Link href="/university/certificates/revoke">
            <Button variant="outline" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Revoke Certificate
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search certificates..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programOptions.map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setProgramFilter('all');
              }}
            >
              <Filter className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Certificates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Certificates ({filteredCertificates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <DataTable
                data={filteredCertificates}
                columns={columns}
                itemsPerPage={10}
                emptyMessage={
                  searchTerm || statusFilter !== 'all' || programFilter !== 'all' 
                    ? 'No certificates found matching your filters.' 
                    : 'No certificates available.'
                }
                showPagination={true}
                showItemsPerPage={true}
              />

              {!loading && filteredCertificates.length === 0 && !searchTerm && statusFilter === 'all' && programFilter === 'all' && (
                <div className="text-center py-8">
                  <Link href="/university/certificates/issue">
                    <Button>Issue Certificates</Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 