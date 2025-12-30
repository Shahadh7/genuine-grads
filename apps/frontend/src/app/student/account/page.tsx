'use client';
import React from "react"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Wallet,
  Mail,
  GraduationCap,
  Copy,
  Loader2,
  AlertCircle,
  Hash,
  BookOpen,
  Calendar,
  Check
} from 'lucide-react';
import { getSession } from '@/lib/session';
import { graphqlClient } from '@/lib/graphql-client';

interface Course {
  id: string;
  name: string;
  code: string;
  department?: string;
}

interface Enrollment {
  id: string;
  gpa?: number;
  grade?: string;
  batchYear: number;
  course: Course;
}

interface StudentData {
  id: string;
  fullName: string;
  email: string;
  studentNumber: string;
  walletAddress?: string;
  program?: string;
  department?: string;
  enrollmentYear?: number;
  graduationYear?: number;
  profilePicUrl?: string;
  isActive?: boolean;
  enrollments?: Enrollment[];
}

export default function AccountPage(): React.JSX.Element {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession || currentSession.role !== 'student') {
      router.push('/login');
      return;
    }
    setSession(currentSession);
    loadStudentData();
  }, [router]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await graphqlClient.meStudent();

      if (response.errors) {
        throw new Error(response.errors[0]?.message || 'Failed to load student data');
      }

      if (response.data?.meStudent) {
        setStudentData(response.data.meStudent);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyWalletAddress = () => {
    if (studentData?.walletAddress) {
      navigator.clipboard.writeText(studentData.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Loading state
  if (loading || !session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <CardTitle className="text-xl">Error Loading Account</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button onClick={loadStudentData} size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = studentData?.fullName || 'Student';
  const displayEmail = studentData?.email || 'No email';
  const studentNumber = studentData?.studentNumber || 'N/A';
  const walletAddress = studentData?.walletAddress;
  const enrollments = studentData?.enrollments || [];

  // Format wallet address for display
  const formatWallet = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          View your profile and academic information
        </p>
      </div>

      {/* Profile Card - Full Width Hero Style */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-background shadow-lg">
              <AvatarImage src={studentData?.profilePicUrl || ''} />
              <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-primary text-primary-foreground">
                {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            {/* Name and Status */}
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">{displayName}</h2>
              <p className="text-muted-foreground text-sm mt-1">Student</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <Badge variant={studentData?.isActive !== false ? "default" : "secondary"}>
                  {studentData?.isActive !== false ? 'Active' : 'Inactive'}
                </Badge>
                {studentData?.enrollmentYear && (
                  <Badge variant="outline">
                    Class of {studentData.graduationYear || studentData.enrollmentYear}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info Grid */}
        <CardContent className="p-6 sm:p-8 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-md bg-background">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-sm truncate">{displayEmail}</p>
              </div>
            </div>

            {/* Student Number */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-md bg-background">
                <Hash className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Student Number</p>
                <p className="font-medium text-sm">{studentNumber}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout for Wallet and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="p-1.5 rounded-md bg-green-500/10">
                <Wallet className="h-4 w-4 text-green-600" />
              </div>
              Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {walletAddress ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs sm:text-sm bg-muted px-3 py-2.5 rounded-lg font-mono truncate border">
                    <span className="hidden sm:inline">{walletAddress}</span>
                    <span className="sm:hidden">{formatWallet(walletAddress)}</span>
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyWalletAddress}
                    className="shrink-0 h-10 w-10 p-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your Solana wallet for receiving certificates
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <Wallet className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No wallet connected</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="p-1.5 rounded-md bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{enrollments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Courses</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl sm:text-3xl font-bold text-primary">
                  {studentData?.program ? '1' : '0'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Program</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Courses Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <GraduationCap className="h-4 w-4 text-blue-600" />
            </div>
            Enrolled Courses
            {enrollments.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {enrollments.length} {enrollments.length === 1 ? 'course' : 'courses'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length > 0 ? (
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-muted shrink-0">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{enrollment.course.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {enrollment.course.code}
                        </span>
                        {enrollment.course.department && (
                          <span className="text-xs text-muted-foreground">
                            {enrollment.course.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 ml-11 sm:ml-0">
                    {enrollment.batchYear && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Calendar className="h-3 w-3" />
                        {enrollment.batchYear}
                      </Badge>
                    )}
                    {enrollment.grade && (
                      <Badge variant="secondary" className="text-xs">
                        Grade: {enrollment.grade}
                      </Badge>
                    )}
                    {enrollment.gpa !== undefined && enrollment.gpa !== null && (
                      <Badge className="text-xs bg-green-500/10 text-green-700 hover:bg-green-500/20">
                        GPA: {enrollment.gpa.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No courses enrolled yet</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Your enrolled courses will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Program Info (if available) */}
      {(studentData?.program || studentData?.department) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="p-1.5 rounded-md bg-purple-500/10">
                <GraduationCap className="h-4 w-4 text-purple-600" />
              </div>
              Program Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {studentData?.program && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Program</p>
                  <p className="font-medium text-sm">{studentData.program}</p>
                </div>
              )}
              {studentData?.department && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Department</p>
                  <p className="font-medium text-sm">{studentData.department}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
