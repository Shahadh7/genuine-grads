'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { graphqlClient } from '@/lib/graphql-client';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Loader2, Search, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  fullName: string;
  email: string;
  studentNumber: string;
  program?: string;
  department?: string;
  enrollments?: Array<{
    id: string;
    course: {
      name: string;
      code: string;
    };
    batchYear: number;
  }>;
}

export default function EnrollStudentPage() {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    courseDescription: '',
    courseCredits: '',
    courseDepartment: '',
    degreeType: 'Bachelor',
    batchYear: new Date().getFullYear(),
    gpa: '',
    grade: '',
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setSearching(true);
    try {
      const response = await graphqlClient.getStudents();
      if (response.data?.students) {
        setStudents(response.data.students as Student[]);
      }
    } catch (error: any) {
      toast.error({
        title: 'Error',
        description: 'Failed to load students. Please try again.',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      toast.error({
        title: 'No student selected',
        description: 'Please select a student to enroll in a course.',
      });
      return;
    }

    if (!formData.courseCode || !formData.courseName || !formData.courseDepartment) {
      toast.error({
        title: 'Missing required fields',
        description: 'Please fill in course code, name, and department.',
      });
      return;
    }

    setLoading(true);

    try {
      const input = {
        studentId: selectedStudent.id,
        course: {
          code: formData.courseCode,
          name: formData.courseName,
          description: formData.courseDescription || undefined,
          credits: formData.courseCredits ? parseInt(formData.courseCredits) : undefined,
          department: formData.courseDepartment,
          degreeType: formData.degreeType,
        },
        batchYear: formData.batchYear,
        gpa: formData.gpa ? parseFloat(formData.gpa) : undefined,
        grade: formData.grade || undefined,
      };

      const response = await graphqlClient.enrollStudentInCourse(input);

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }

      toast.success({
        title: 'Enrollment successful',
        description: `${selectedStudent.fullName} has been enrolled in ${formData.courseName}.`,
      });

      // Reset form
      setSelectedStudent(null);
      setFormData({
        courseCode: '',
        courseName: '',
        courseDescription: '',
        courseCredits: '',
        courseDepartment: '',
        degreeType: 'Bachelor',
        batchYear: new Date().getFullYear(),
        gpa: '',
        grade: '',
      });

      // Optionally navigate back to students list
      setTimeout(() => {
        router.push('/university/students');
      }, 1500);
    } catch (error: any) {
      toast.error({
        title: 'Enrollment failed',
        description: error?.message || 'Failed to enroll student. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase();
    return (
      student.fullName.toLowerCase().includes(search) ||
      student.email.toLowerCase().includes(search) ||
      student.studentNumber.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/university/students">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Enroll Student in Course</h1>
          <p className="text-muted-foreground">
            Add additional course enrollments for existing students
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Student</CardTitle>
            <CardDescription>Choose a student to enroll in a new course</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or student number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No students found
                  </p>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedStudent?.id === student.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="font-medium">{student.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.studentNumber} • {student.email}
                      </div>
                      {student.program && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {student.program}
                          {student.department && ` - ${student.department}`}
                        </div>
                      )}
                      {student.enrollments && student.enrollments.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Current enrollments: {student.enrollments.length}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Enrollment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>
              {selectedStudent
                ? `Enrolling ${selectedStudent.fullName} in a new course`
                : 'Select a student to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Course Information */}
              <div className="space-y-2">
                <Label htmlFor="courseCode">
                  Course Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="courseCode"
                  value={formData.courseCode}
                  onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                  placeholder="e.g., CS201"
                  disabled={!selectedStudent || loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseName">
                  Course Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="courseName"
                  value={formData.courseName}
                  onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                  placeholder="e.g., Data Structures"
                  disabled={!selectedStudent || loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseDepartment">
                  Department <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="courseDepartment"
                  value={formData.courseDepartment}
                  onChange={(e) => setFormData({ ...formData, courseDepartment: e.target.value })}
                  placeholder="e.g., Computer Science"
                  disabled={!selectedStudent || loading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="degreeType">Degree Type</Label>
                  <Select
                    value={formData.degreeType}
                    onValueChange={(value) => setFormData({ ...formData, degreeType: value })}
                    disabled={!selectedStudent || loading}
                  >
                    <SelectTrigger id="degreeType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelor">Bachelor</SelectItem>
                      <SelectItem value="Master">Master</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                      <SelectItem value="Certificate">Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="courseCredits">Credits</Label>
                  <Input
                    id="courseCredits"
                    type="number"
                    value={formData.courseCredits}
                    onChange={(e) => setFormData({ ...formData, courseCredits: e.target.value })}
                    placeholder="e.g., 3"
                    disabled={!selectedStudent || loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseDescription">Course Description</Label>
                <Input
                  id="courseDescription"
                  value={formData.courseDescription}
                  onChange={(e) => setFormData({ ...formData, courseDescription: e.target.value })}
                  placeholder="Optional description"
                  disabled={!selectedStudent || loading}
                />
              </div>

              {/* Enrollment Details */}
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-4">Enrollment Details</h3>

                <div className="space-y-2">
                  <Label htmlFor="batchYear">Batch Year</Label>
                  <Input
                    id="batchYear"
                    type="number"
                    value={formData.batchYear}
                    onChange={(e) => setFormData({ ...formData, batchYear: parseInt(e.target.value) })}
                    disabled={!selectedStudent || loading}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="gpa">GPA</Label>
                    <Input
                      id="gpa"
                      type="number"
                      step="0.01"
                      value={formData.gpa}
                      onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                      placeholder="e.g., 3.75"
                      disabled={!selectedStudent || loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade</Label>
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="e.g., A"
                      disabled={!selectedStudent || loading}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={!selectedStudent || loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Enroll Student in Course
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
