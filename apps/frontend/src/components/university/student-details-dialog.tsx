'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  Wallet,
  Award,
  BookOpen,
  Hash,
  Building,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

interface Achievement {
  id: string;
  notes?: string;
  awardedAt?: string;
  achievement?: {
    id: string;
    title: string;
    description?: string;
    category?: string;
  };
}

interface Enrollment {
  id: string;
  batchYear: number;
  gpa?: number;
  grade?: string;
  course: {
    id: string;
    code: string;
    name: string;
    credits: number;
    department?: string;
    level?: string;
  };
}

interface Student {
  id: string;
  fullName?: string;
  email?: string;
  studentNumber?: string;
  walletAddress?: string;
  program?: string;
  department?: string;
  enrollmentYear?: number;
  graduationYear?: number;
  isActive?: boolean;
  createdAt?: string;
  achievements?: Achievement[];
  enrollments?: Enrollment[];
}

interface StudentDetailsDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentDetailsDialog({
  student,
  open,
  onOpenChange,
}: StudentDetailsDialogProps) {
  const toast = useToast();

  if (!student) return null;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatWallet = (address?: string | null) => {
    if (!address) return null;
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}…${address.slice(-6)}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success({
      title: 'Copied!',
      description: `${label} copied to clipboard.`,
    });
  };

  const openExplorer = (address: string) => {
    window.open(`https://explorer.solana.com/address/${address}?cluster=devnet`, '_blank');
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'academic':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'extracurricular':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'leadership':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'research':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'community':
        return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-xl">{student.fullName || 'Unknown Student'}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={
                    student.isActive !== false
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : 'bg-red-500/10 text-red-600 border-red-500/20'
                  }
                >
                  {student.isActive !== false ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
                {student.studentNumber && (
                  <span className="text-sm text-muted-foreground">
                    #{student.studentNumber}
                  </span>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Enrollments
              {student.enrollments && student.enrollments.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {student.enrollments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
              {student.achievements && student.achievements.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {student.achievements.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Contact Information
              </h4>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{student.email || '—'}</p>
                  </div>
                  {student.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(student.email!, 'Email')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Student Number</p>
                    <p className="font-medium">{student.studentNumber || '—'}</p>
                  </div>
                  {student.studentNumber && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(student.studentNumber!, 'Student Number')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Academic Information
              </h4>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Primary Program</p>
                    <p className="font-medium">{student.program || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Primary Department</p>
                    <p className="font-medium">{student.department || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Enrollment Year</p>
                      <p className="font-medium">{student.enrollmentYear || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Graduation Year</p>
                      <p className="font-medium">{student.graduationYear || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Blockchain
              </h4>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Wallet Address</p>
                  {student.walletAddress ? (
                    <p className="font-mono text-sm font-medium truncate">
                      {formatWallet(student.walletAddress)}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">Not connected</p>
                  )}
                </div>
                {student.walletAddress && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(student.walletAddress!, 'Wallet Address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openExplorer(student.walletAddress!)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Registration Date */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Registration
              </h4>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Registered On</p>
                  <p className="font-medium">{formatDate(student.createdAt)}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="enrollments" className="mt-4">
            {student.enrollments && student.enrollments.length > 0 ? (
              <div className="space-y-3">
                {student.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-medium">
                            {enrollment.course.code} - {enrollment.course.name}
                          </h5>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                            {enrollment.course.credits} Credits
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm">
                          {enrollment.course.department && (
                            <div className="flex items-center gap-1.5">
                              <Building className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Department:</span>
                              <span className="font-medium">{enrollment.course.department}</span>
                            </div>
                          )}
                          {enrollment.course.level && (
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Level:</span>
                              <span className="font-medium">{enrollment.course.level}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Batch Year:</span>
                            <span className="font-medium">{enrollment.batchYear}</span>
                          </div>
                          {enrollment.gpa !== null && enrollment.gpa !== undefined && (
                            <div className="flex items-center gap-1.5">
                              <Award className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">GPA:</span>
                              <span className="font-medium">{enrollment.gpa.toFixed(2)}</span>
                            </div>
                          )}
                          {enrollment.grade && (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Grade:</span>
                              <Badge
                                variant="outline"
                                className={
                                  ['A', 'A+', 'A-'].includes(enrollment.grade)
                                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                    : ['B', 'B+', 'B-'].includes(enrollment.grade)
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                    : ['C', 'C+', 'C-'].includes(enrollment.grade)
                                    ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                    : 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                                }
                              >
                                {enrollment.grade}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No Enrollments</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This student hasn&apos;t been enrolled in any courses yet.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="mt-4">
            {student.achievements && student.achievements.length > 0 ? (
              <div className="space-y-3">
                {student.achievements.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-medium">
                            {item.achievement?.title || 'Untitled Achievement'}
                          </h5>
                          {item.achievement?.category && (
                            <Badge
                              variant="outline"
                              className={getCategoryColor(item.achievement.category)}
                            >
                              {item.achievement.category}
                            </Badge>
                          )}
                        </div>
                        {item.achievement?.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.achievement.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {item.awardedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Awarded: {formatDate(item.awardedAt)}
                            </span>
                          )}
                          {item.notes && (
                            <span className="italic">Note: {item.notes}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No Achievements Yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This student hasn&apos;t been awarded any achievements.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
