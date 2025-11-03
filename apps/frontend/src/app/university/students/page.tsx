'use client';
import React from "react";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-table';
import { studentsAPI } from '@/lib/api';
import { 
  Plus, 
  Upload, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Award,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  // Add props here
}

export default function StudentsPage(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState<any>('');
  const [students, setStudents] = useState<any>([]);
  const [loading, setLoading] = useState<any>(true);

  // Load students on component mount
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const result = await studentsAPI.getAll();
        if (result.success) {
          setStudents(result.data);
        }
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStudents();
  }, []);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.nic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      key: 'name',
      header: 'Name',
      render: (student) => (
        <div>
          <div className="font-medium">{student.name}</div>
          {student.achievements.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {student.achievements[0]}
              {student.achievements.length > 1 && ` +${student.achievements.length - 1} more`}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'nic',
      header: 'NIC',
      render: (student) => (
        <span className="font-mono text-sm">{student.nic}</span>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (student) => student.email
    },
    {
      key: 'program',
      header: 'Program',
      render: (student) => (
        <div className="max-w-[200px] truncate" title={student.program}>
          {student.program}
        </div>
      )
    },
    {
      key: 'dateAdded',
      header: 'Date Added',
      render: (student) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{formatDate(student.dateAdded)}</span>
        </div>
      )
    },
    {
      key: 'certificates',
      header: 'Certificates',
      render: (student) => (
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{student.certificates}</span>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (student) => (
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
              <span>View Certificates</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <span>Edit Student</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span>Issue Certificate</span>
            </DropdownMenuItem>
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
              <Input
                placeholder="Search by name, NIC, or email..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="pl-10"
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
          {loading ? (
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
    </div>
  );
} 