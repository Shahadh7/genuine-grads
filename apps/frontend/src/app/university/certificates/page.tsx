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
import { certificatesAPI, studentsAPI } from '@/lib/api';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  XCircle, 
  Award,
  Calendar,
  Filter,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  // Add props here
}

export default function CertificatesPage(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState<any>('');
  const [statusFilter, setStatusFilter] = useState<any>('all');
  const [programFilter, setProgramFilter] = useState<any>('all');
  const [certificates, setCertificates] = useState<any>([]);
  const [students, setStudents] = useState<any>([]);
  const [loading, setLoading] = useState<any>(true);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [certificatesResult, studentsResult] = await Promise.all([
          certificatesAPI.getPending(),
          studentsAPI.getAll()
        ]);
        
        if (certificatesResult.success) {
          setCertificates(certificatesResult.data);
        }
        
        if (studentsResult.success) {
          setStudents(studentsResult.data);
        }
      } catch (error) {
        console.error('Failed to load certificates:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  const filteredCertificates = certificates.filter((cert: any) => {
    const studentName = getStudentName(cert.studentId);
    const matchesSearch = 
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.certificateTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'issued' && cert.mintAddress) ||
      (statusFilter === 'pending' && !cert.mintAddress);
    
    const matchesProgram = programFilter === 'all' || cert.certificateTitle.includes(programFilter);
    
    return matchesSearch && matchesStatus && matchesProgram;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Define table columns
  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (cert) => (
        <div>
          <div className="font-medium">{getStudentName(cert.studentId)}</div>
          <div className="text-sm text-muted-foreground">Student ID: {cert.studentId}</div>
        </div>
      )
    },
    {
      key: 'certificate',
      header: 'Certificate',
      render: (cert) => (
        <div className="max-w-[200px]">
          <div className="font-medium">{cert.certificateTitle}</div>
          {cert.mintAddress && (
            <div className="text-sm text-muted-foreground font-mono">
              {cert.mintAddress.slice(0, 8)}...
            </div>
          )}
        </div>
      )
    },
    {
      key: 'gpa',
      header: 'GPA',
      render: (cert) => (
        <Badge variant="secondary" className="font-mono">
          {cert.gpa}
        </Badge>
      )
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      render: (cert) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {cert.timestamp ? formatDate(cert.timestamp) : 'Pending'}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (cert) => (
        <Badge variant={cert.mintAddress ? 'default' : 'secondary'}>
          {cert.mintAddress ? 'Issued' : 'Pending'}
        </Badge>
      )
    },
    {
      key: 'badges',
      header: 'Badges',
      render: (cert) => (
        <div className="flex items-center gap-2">
          {cert.badgeTitles.length > 0 ? (
            <>
              <Award className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">{cert.badgeTitles.length} badge{cert.badgeTitles.length !== 1 ? 's' : ''}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (cert) => (
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
            {cert.mintAddress && (
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
        <div>
          <h1 className="text-3xl font-bold">Certificates</h1>
          <p className="text-muted-foreground">Manage issued certificates and their status.</p>
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
              </SelectContent>
            </Select>

            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                <SelectItem value="Computer Science">Computer Science</SelectItem>
                <SelectItem value="Business Administration">Business Administration</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Arts">Arts</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center gap-2">
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