'use client';
import React from "react";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { graphqlClient } from '@/lib/graphql-client';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { ArrowLeft, Save, UserPlus, GraduationCap, Info, Trophy, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { validateNIC } from '@/lib/validators';

interface AchievementOption {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
}

interface SelectedAchievement {
  id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  notes?: string | null;
  awardedAt?: string | null;
}

export default function AddStudentPage(): React.JSX.Element {
  const router = useRouter();
  const { loading: guardLoading } = useRoleGuard(['university_admin']);
  const toast = useToast();
  const [programs, setPrograms] = useState<string[]>([]);
  const [programsLoading, setProgramsLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    fullName: '',
    studentNumber: '',
    nationalId: '',
    email: '',
    program: '',
    department: '',
    enrollmentYear: new Date().getFullYear().toString(),
    walletAddress: '',
    courseCode: '',
    courseName: '',
    courseDescription: '',
    courseCredits: '',
    degreeType: '',
    enrollmentGpa: '',
    enrollmentGrade: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableAchievements, setAvailableAchievements] = useState<AchievementOption[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState<boolean>(false);
  const [achievementsError, setAchievementsError] = useState<string | null>(null);
  const [achievementSearch, setAchievementSearch] = useState('');
  const [selectedAchievements, setSelectedAchievements] = useState<SelectedAchievement[]>([]);
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    category: '',
  });

  const filteredAchievements = useMemo(() => {
    if (!achievementSearch) {
      return availableAchievements.filter(
        (item) =>
          !selectedAchievements.some(
            (selected) =>
              selected.id === item.id || selected.title.toLowerCase() === item.title.toLowerCase()
          )
      );
    }

    const searchValue = achievementSearch.toLowerCase();

    return availableAchievements.filter((item) => {
      const alreadySelected = selectedAchievements.some(
        (selected) =>
          selected.id === item.id || selected.title.toLowerCase() === item.title.toLowerCase()
      );
      if (alreadySelected) {
        return false;
      }
      return (
        item.title.toLowerCase().includes(searchValue) ||
        (item.description ?? '').toLowerCase().includes(searchValue)
      );
    });
  }, [availableAchievements, achievementSearch, selectedAchievements]);

  useEffect(() => {
    const loadPrograms = async () => {
      type StudentRecord = { program?: string | null };
      try {
        const response = await graphqlClient.getStudents({ limit: 200 });
        const students = (response.data?.students ?? []) as StudentRecord[];
        const uniquePrograms = Array.from(
          new Set(
            students
              .map((student) => student.program?.trim())
              .filter((program): program is string => !!program)
          )
        ).sort((a, b) => a.localeCompare(b));

        setPrograms(uniquePrograms);
      } catch (loadError) {
        console.error('Failed to load available programs:', loadError);
      } finally {
        setProgramsLoading(false);
      }
    };

    const loadAchievements = async () => {
      try {
        setAchievementsLoading(true);
        const response = await graphqlClient.getAchievementCatalog();
        setAvailableAchievements(response.data?.achievementCatalog ?? []);
        setAchievementsError(null);
      } catch (loadError) {
        console.error('Failed to load achievement catalog:', loadError);
        setAchievementsError('Unable to load achievements. You can still create new ones below.');
      } finally {
        setAchievementsLoading(false);
      }
    };

    loadPrograms();
    loadAchievements();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear existing error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    // Real-time NIC validation
    if (field === 'nationalId' && value.trim()) {
      const nicValidation = validateNIC(value.trim());
      if (!nicValidation.isValid) {
        setErrors((prev) => ({
          ...prev,
          nationalId: nicValidation.error || 'Invalid NIC format',
        }));
      }
    }
  };

  const handleAddExistingAchievement = (achievementId: string) => {
    const achievement = availableAchievements.find((item) => item.id === achievementId);
    if (!achievement) {
      return;
    }

    const alreadySelected = selectedAchievements.some(
      (item) => item.id === achievement.id || item.title.toLowerCase() === achievement.title.toLowerCase()
    );

    if (alreadySelected) {
      toast.info(`"${achievement.title}" is already selected.`);
      return;
    }

    setSelectedAchievements((prev) => [
      ...prev,
      {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description ?? undefined,
        category: achievement.category ?? undefined,
      },
    ]);

    toast.success({
      title: 'Achievement added',
      description: `"${achievement.title}" linked to this student.`,
    });
  };

  const handleRemoveAchievement = (identifier: string) => {
    setSelectedAchievements((prev) => {
      const target = prev.find((item) => (item.id ?? item.title.toLowerCase()) === identifier);
      const next = prev.filter((item) => {
        const key = item.id ?? item.title.toLowerCase();
        return key !== identifier;
      });

      if (target) {
        toast.info({
          title: 'Achievement removed',
          description: `"${target.title}" will not be linked to this student.`,
        });
      }

      return next;
    });
  };

  const handleCreateAchievement = () => {
    const title = newAchievement.title.trim();
    if (!title) {
      toast.error({
        title: 'Achievement title required',
        description: 'Provide a title before adding a new achievement.',
      });
      return;
    }

    const duplicate = selectedAchievements.some(
      (item) => item.title.toLowerCase() === title.toLowerCase()
    );

    if (duplicate) {
      toast.warning({
        title: 'Duplicate achievement',
        description: `"${title}" has already been added.`,
      });
      return;
    }

    setSelectedAchievements((prev) => [
      ...prev,
      {
        title,
        description: newAchievement.description.trim() || undefined,
        category: newAchievement.category.trim() || undefined,
      },
    ]);

    setNewAchievement({
      title: '',
      description: '',
      category: '',
    });

    toast.success({
      title: 'New achievement added',
      description: `"${title}" will be created for this student.`,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate NIC before submission
    const nicValidation = validateNIC(formData.nationalId.trim());
    if (!nicValidation.isValid) {
      setErrors((prev) => ({
        ...prev,
        nationalId: nicValidation.error || 'Invalid NIC format',
      }));
      setError('Please fix the validation errors before submitting');
      setLoading(false);
      return;
    }

    try {
      const response = await graphqlClient.registerStudent({
        email: formData.email.trim(),
        fullName: formData.fullName.trim(),
        studentNumber: formData.studentNumber.trim(),
        nationalId: formData.nationalId.trim(),
        walletAddress: formData.walletAddress.trim(),
        program: formData.program.trim(),
        department: formData.department.trim(),
        enrollmentYear: Number(formData.enrollmentYear),
        primaryEnrollment: {
          course: {
            code: formData.courseCode.trim(),
            name: formData.courseName.trim(),
            description: formData.courseDescription.trim() || undefined,
            credits: formData.courseCredits ? Number(formData.courseCredits) : undefined,
            department: formData.department.trim(),
            degreeType: formData.degreeType.trim(),
          },
          batchYear: Number(formData.enrollmentYear),
          gpa: formData.enrollmentGpa ? Number(formData.enrollmentGpa) : undefined,
          grade: formData.enrollmentGrade.trim() || undefined,
        },
        achievements: selectedAchievements.map((achievement) =>
          achievement.id
            ? {
                id: achievement.id,
                notes: achievement.notes ?? undefined,
                awardedAt: achievement.awardedAt ?? undefined,
              }
            : {
                title: achievement.title,
                description: achievement.description ?? undefined,
                category: achievement.category ?? undefined,
                notes: achievement.notes ?? undefined,
                awardedAt: achievement.awardedAt ?? undefined,
              }
        ),
      });

      if (response.errors?.length) {
        throw new Error(response.errors[0].message);
      }

      toast.success({
        title: 'Student registered',
        description: `${formData.fullName.trim()} has been added successfully.`,
      });
      router.push('/university/students');
    } catch (error) {
      console.error('Error creating student:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to register student. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.fullName.trim().length > 0 &&
    formData.studentNumber.trim().length > 0 &&
    formData.nationalId.trim().length > 0 &&
    validateNIC(formData.nationalId.trim()).isValid &&
    !errors.nationalId &&
    formData.email.trim().length > 0 &&
    formData.program.trim().length > 0 &&
    formData.department.trim().length > 0 &&
    formData.enrollmentYear.trim().length > 0 &&
    !Number.isNaN(Number(formData.enrollmentYear)) &&
    formData.courseCode.trim().length > 0 &&
    formData.courseName.trim().length > 0 &&
    formData.degreeType.trim().length > 0 &&
    formData.walletAddress.trim().length > 0;

  if (guardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/university/students">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-muted/50">
              <ArrowLeft className="h-4 w-4" />
              Back to Students
            </Button>
          </Link>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
              <p className="text-muted-foreground text-lg">Register a new student in your institution</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                Student Information
              </CardTitle>
              <p className="text-muted-foreground">Fill in the student's basic information and academic details.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Name and NIC Row */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter student's full name"
                      value={formData.fullName}
                      onChange={(e: any) => handleInputChange('fullName', e.target.value)}
                      className="h-11 bg-background/50 border-muted focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="studentNumber" className="text-sm font-medium">
                      Student Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="studentNumber"
                      placeholder="e.g. STU-2025-001"
                      value={formData.studentNumber}
                      onChange={(e: any) => handleInputChange('studentNumber', e.target.value)}
                      className="h-11 bg-background/50 border-muted focus:border-primary"
                      required
                    />
                  </div>
                </div>

                {/* NIC / National ID */}
                <div className="space-y-3">
                  <Label htmlFor="nationalId" className="text-sm font-medium">
                    National ID / NIC <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nationalId"
                    placeholder="e.g., 852365478V or 200145602345"
                    value={formData.nationalId}
                    onChange={(e: any) => handleInputChange('nationalId', e.target.value)}
                    className={`h-11 bg-background/50 border-muted focus:border-primary ${
                      errors.nationalId ? 'border-destructive focus:border-destructive' : ''
                    }`}
                    required
                  />
                  {errors.nationalId && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {errors.nationalId}
                    </p>
                  )}
                  {!errors.nationalId && formData.nationalId.trim() && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Old format: 9 digits + V/X (e.g., 852365478V) | New format: 12 digits (e.g., 200145602345)
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter student's email address"
                    value={formData.email}
                    onChange={(e: any) => handleInputChange('email', e.target.value)}
                    className="h-11 bg-background/50 border-muted focus:border-primary"
                    required
                  />
                </div>

                {/* Program */}
                <div className="space-y-3">
                  <Label htmlFor="program" className="text-sm font-medium">
                    Program Enrolled <span className="text-destructive">*</span>
                  </Label>
                  {programsLoading ? (
                    <Select value={formData.program}>
                      <SelectTrigger
                        className="h-11 bg-background/50 border-muted focus:border-primary"
                        disabled
                      >
                        <SelectValue placeholder="Loading programs..." />
                      </SelectTrigger>
                    </Select>
                  ) : programs.length > 0 ? (
                    <Select
                      value={formData.program}
                      onValueChange={(value) => handleInputChange('program', value)}
                    >
                      <SelectTrigger className="h-11 bg-background/50 border-muted focus:border-primary">
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program} value={program}>
                            {program}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Input
                        id="program"
                        placeholder="Enter program name"
                        value={formData.program}
                        onChange={(e: any) => handleInputChange('program', e.target.value)}
                        className="h-11 bg-background/50 border-muted focus:border-primary"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        No existing programs found. Enter the program name manually.
                      </p>
                    </>
                  )}
                </div>

            {/* Primary Course Details */}
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <Label htmlFor="courseCode" className="text-sm font-medium">
                    Primary Course Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="courseCode"
                    placeholder="e.g. CSC-401"
                    value={formData.courseCode}
                    onChange={(e: any) => handleInputChange('courseCode', e.target.value)}
                    className="h-11 bg-background/50 border-muted focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="courseName" className="text-sm font-medium">
                    Primary Course Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="courseName"
                    placeholder="e.g. Bachelor of Science in Computer Science"
                    value={formData.courseName}
                    onChange={(e: any) => handleInputChange('courseName', e.target.value)}
                    className="h-11 bg-background/50 border-muted focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="degreeType" className="text-sm font-medium">
                    Degree Type <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="degreeType"
                    placeholder="e.g. Bachelor"
                    value={formData.degreeType}
                    onChange={(e: any) => handleInputChange('degreeType', e.target.value)}
                    className="h-11 bg-background/50 border-muted focus:border-primary"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="courseCredits" className="text-sm font-medium">
                    Course Credits
                  </Label>
                  <Input
                    id="courseCredits"
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    placeholder="e.g. 120"
                    value={formData.courseCredits}
                    onChange={(e: any) => handleInputChange('courseCredits', e.target.value)}
                    className="h-11 bg-background/50 border-muted focus:border-primary"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="courseDescription" className="text-sm font-medium">
                    Course Description
                  </Label>
                  <Input
                    id="courseDescription"
                    placeholder="Brief description (optional)"
                    value={formData.courseDescription}
                    onChange={(e: any) => handleInputChange('courseDescription', e.target.value)}
                    className="h-11 bg-background/50 border-muted focus:border-primary"
                  />
                </div>
              </div>
            </div>

                {/* Department and Enrollment Year */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="department"
                      placeholder="e.g. Faculty of Engineering"
                      value={formData.department}
                      onChange={(e: any) => handleInputChange('department', e.target.value)}
                      className="h-11 bg-background/50 border-muted focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="enrollmentYear" className="text-sm font-medium">
                      Enrollment Year <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="enrollmentYear"
                      type="number"
                      min="1900"
                      max="2100"
                      placeholder="e.g. 2025"
                      value={formData.enrollmentYear}
                      onChange={(e: any) => handleInputChange('enrollmentYear', e.target.value)}
                      className="h-11 bg-background/50 border-muted focus:border-primary"
                      required
                    />
                  </div>
                </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="enrollmentGpa" className="text-sm font-medium">
                  Cumulative GPA
                </Label>
                <Input
                  id="enrollmentGpa"
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  placeholder="e.g. 3.75"
                  value={formData.enrollmentGpa}
                  onChange={(e: any) => handleInputChange('enrollmentGpa', e.target.value)}
                  className="h-11 bg-background/50 border-muted focus:border-primary"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="enrollmentGrade" className="text-sm font-medium">
                  Final Grade
                </Label>
                <Input
                  id="enrollmentGrade"
                  placeholder="e.g. First Class"
                  value={formData.enrollmentGrade}
                  onChange={(e: any) => handleInputChange('enrollmentGrade', e.target.value)}
                  className="h-11 bg-background/50 border-muted focus:border-primary"
                />
              </div>
            </div>

                {/* Wallet Address */}
                <div className="space-y-3">
                  <Label htmlFor="walletAddress" className="text-sm font-medium">
                    Wallet Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="walletAddress"
                    placeholder="Enter student's Solana wallet address"
                    value={formData.walletAddress}
                    onChange={(e: any) => handleInputChange('walletAddress', e.target.value)}
                    className="h-11 bg-background/50 border-muted focus:border-primary font-mono text-sm"
                    required
                  />
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Info className="h-3 w-3" />
                    Student must have a connected Solana wallet to be registered
                  </p>
                </div>

              {/* Achievements */}
              <div className="space-y-4 border rounded-lg p-4 bg-background/40">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">Student Achievements</h3>
                    <p className="text-xs text-muted-foreground">
                      Select existing achievements or add new highlights for this student.
                    </p>
                  </div>
                </div>

                {achievementsError && (
                  <Alert variant="destructive">
                    <AlertDescription>{achievementsError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Label htmlFor="achievement-search" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Search existing achievements
                  </Label>
                  <Input
                    id="achievement-search"
                    placeholder="Search by title or keyword"
                    value={achievementSearch}
                    onChange={(event) => setAchievementSearch(event.target.value)}
                    className="h-10 bg-background/60 border-muted focus:border-primary"
                  />
                  <div className="flex flex-wrap gap-2">
                    {achievementsLoading ? (
                      <p className="text-xs text-muted-foreground">Loading achievements…</p>
                    ) : filteredAchievements.slice(0, 8).map((achievement) => (
                      <Button
                        key={achievement.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => handleAddExistingAchievement(achievement.id)}
                      >
                        <Trophy className="h-3 w-3 mr-1" />
                        {achievement.title}
                      </Button>
                    ))}
                    {!achievementsLoading && filteredAchievements.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No achievements match your search. Create a new one below.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Selected achievements
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedAchievements.length > 0 ? (
                      selectedAchievements.map((achievement) => {
                        const identifier = achievement.id ?? achievement.title.toLowerCase();
                        return (
                          <div
                            key={identifier}
                            className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium"
                          >
                            <span>{achievement.title}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAchievement(identifier)}
                              className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                              aria-label={`Remove ${achievement.title}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground">No achievements selected yet.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Add a new achievement
                  </Label>
                  <div className="grid gap-3">
                    <Input
                      placeholder="Achievement title (required)"
                      value={newAchievement.title}
                      onChange={(event) =>
                        setNewAchievement((prev) => ({ ...prev, title: event.target.value }))
                      }
                      className="h-10 bg-background/60 border-muted focus:border-primary"
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={newAchievement.description}
                      onChange={(event) =>
                        setNewAchievement((prev) => ({ ...prev, description: event.target.value }))
                      }
                      className="bg-background/60 border-muted focus:border-primary"
                      rows={3}
                    />
                    <Input
                      placeholder="Category (optional)"
                      value={newAchievement.category}
                      onChange={(event) =>
                        setNewAchievement((prev) => ({ ...prev, category: event.target.value }))
                      }
                      className="h-10 bg-background/60 border-muted focus:border-primary"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full md:w-auto bg-primary/10 text-primary hover:bg-primary/20"
                      onClick={handleCreateAchievement}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Achievement
                    </Button>
                  </div>
                </div>
              </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t">
                  <Link href="/university/students" className="flex-1">
                    <Button type="button" variant="outline" className="w-full h-11">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={!isFormValid || loading}
                    className="flex-1 h-11 bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Registering Student...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Register Student
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Quick Info Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-primary" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    After registration, students will need to connect their Solana wallet to receive certificates.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    You can also use the bulk upload feature to register multiple students at once.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    All required fields are marked with an asterisk (*).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500/5 to-green-600/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Students</span>
                <Badge variant="secondary">1,247</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month</span>
                <Badge variant="default">+12</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Programs</span>
                <Badge variant="outline">8</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 