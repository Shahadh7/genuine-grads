'use client';
import React from "react";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { graphqlClient } from '@/lib/graphql-client';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import {
  Plus,
  Upload,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Award,
  Calendar,
  AlertTriangle,
  UserPlus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StudentDetailsDialog } from '@/components/university/student-details-dialog';

interface Props {
  // Add props here
}

export default function StudentsPage(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const { loading: guardLoading } = useRoleGuard(['university_admin']);
  const toast = useToast();

  // Load students on component mount
  useEffect(() => {
    if (guardLoading) return;

    const loadStudents = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await graphqlClient.getStudents({
          limit: 100,
        });

        if (response.errors?.length) {
          throw new Error(response.errors[0].message);
        }

        if (response.data?.students) {
          setStudents(response.data.students);
        }
      } catch (error) {
        console.error('Failed to load students:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load students. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };
    
    loadStudents();
  }, [guardLoading]);

  const filteredStudents = students.filter(student => {
    const term = searchTerm.toLowerCase();
    return (
      (student.fullName || '').toLowerCase().includes(term) ||
      (student.studentNumber || '').toLowerCase().includes(term) ||
      (student.email || '').toLowerCase().includes(term)
    );
  });

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;

    try {
      setDeleting(true);
      const response = await graphqlClient.deleteStudent(studentToDelete.id);

      if (response.errors?.length) {
        throw new Error(response.errors[0].message);
      }

      // Remove student from local state
      setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));

      toast.success({
        title: 'Student deleted',
        description: `${studentToDelete.fullName} has been removed.`,
      });
    } catch (error) {
      console.error('Failed to delete student:', error);
      toast.error({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete student.',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatWallet = (address?: string | null) => {
    if (!address) return 'Not connected';
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}…${address.slice(-4)}`;
  };

  const columns = [
    {
      key: 'fullName',
      header: 'Name',
      render: (student) => (
        <div>
          <div className="font-medium">{student.fullName || '—'}</div>
          <div className="text-xs text-muted-foreground">
            {student.studentNumber || 'No student number'}
          </div>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (student) => student.email || '—'
    },
    {
      key: 'program',
      header: 'Program / Department',
      render: (student) => (
        <div className="max-w-[220px] truncate" title={student.program || student.department || '—'}>
          {student.program || student.department || '—'}
        </div>
      )
    },
    {
      key: 'enrollmentYear',
      header: 'Enrollment',
      render: (student) => student.enrollmentYear || '—'
    },
    {
      key: 'walletAddress',
      header: 'Wallet',
      render: (student) => (
        <span className="font-mono text-sm">{formatWallet(student.walletAddress)}</span>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (student) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{formatDate(student.createdAt)}</span>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (student) => (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="flex items-center gap-2"
              onSelect={(e) => {
                e.preventDefault();
                setSelectedStudent(student);
                setTimeout(() => setDetailsDialogOpen(true), 0);
              }}
            >
              <Eye className="h-4 w-4" />
              <span>View Details</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <span>Edit Student</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span>Issue Certificate</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setStudentToDelete(student);
                setTimeout(() => setDeleteDialogOpen(true), 0);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Student</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  if (guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage registered students and their information.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/university/students/add">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </Link>
          <Link href="/university/students/enroll">
            <Button variant="outline" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Enroll in Course
            </Button>
          </Link>
          <Link href="/university/students/bulk-upload">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, student ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full rounded-md border border-input bg-background py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <DataTable
                data={filteredStudents}
                columns={columns}
                itemsPerPage={10}
                emptyMessage={
                  searchTerm 
                    ? 'No students found matching your search.' 
                    : 'No students registered yet.'
                }
                showPagination={true}
                showItemsPerPage={true}
              />

              {!loading && filteredStudents.length === 0 && !searchTerm && (
                <div className="text-center py-8">
                  <Link href="/university/students/add">
                    <Button>Add Your First Student</Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteDialogOpen(open);
            if (!open) {
              setStudentToDelete(null);
            }
          }
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => deleting && e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{studentToDelete?.fullName}</strong>?
              This will remove all their enrollments and achievements. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => {
                setDeleteDialogOpen(false);
                setStudentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              variant="destructive"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Details Dialog */}
      <StudentDetailsDialog
        student={selectedStudent}
        open={detailsDialogOpen}
        onOpenChange={(open) => {
          setDetailsDialogOpen(open);
          if (!open) {
            setSelectedStudent(null);
          }
        }}
      />
    </div>
  );
} 