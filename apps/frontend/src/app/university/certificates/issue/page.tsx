'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { graphqlClient } from '@/lib/graphql-client';
import { useToast } from '@/hooks/useToast';
import { getSession } from '@/lib/session';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SkipForward,
} from 'lucide-react';

type TemplateFieldMap = Record<string, string>;

const STUDENT_PAGE_SIZE = 25;

type HydrationOptions = {
  template?: any;
  degreeType?: string;
  badgeTitle?: string;
};

function parseTemplateFields(templateFields: unknown): TemplateFieldMap {
  if (!templateFields) {
    return {};
  }

  if (typeof templateFields === 'string') {
    try {
      return JSON.parse(templateFields);
    } catch (error) {
      console.error('Failed to parse template fields JSON:', error);
      return {};
    }
  }

  return templateFields as TemplateFieldMap;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function castMetadataValue(value: string, expectedType: string | undefined) {
  if (!expectedType || expectedType === 'string' || expectedType === 'any') {
    return value;
  }
  if (expectedType === 'number') {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  }
  if (expectedType === 'boolean') {
    return value === 'true';
  }
  return value;
}

function hydrateTemplateMetadata(
  student: any,
  templateFieldMap: TemplateFieldMap,
  options: HydrationOptions = {}
): Record<string, string> {
  const enrollment = student?.enrollments?.[0] ?? null;
  const course = enrollment?.course ?? null;
  const session = getSession();

  const resolvedDegreeType = options.degreeType ?? options.template?.degreeType ?? '';
  const resolvedBadgeTitle = options.badgeTitle ?? course?.name ?? options.template?.name ?? '';
  const universityName = session?.university?.name ?? 'University';

  const derived: Record<string, string> = {};

  // Get current date for graduation/issue date
  const currentDate = new Date().toISOString().split('T')[0];

  Object.keys(templateFieldMap).forEach((field) => {
    const key = field.toLowerCase().replace(/[_\s-]/g, ''); // Normalize field names
    let value: unknown = '';

    switch (key) {
      // Student name variations
      case 'studentname':
      case 'student':
      case 'name':
      case 'fullname':
        value = student?.fullName ?? '';
        break;
      
      // Email variations
      case 'email':
      case 'studentemail':
        value = student?.email ?? '';
        break;
      
      // Program variations
      case 'program':
      case 'degree':
      case 'degreetype':
      case 'degreeprogram':
        value = student?.program ?? resolvedDegreeType;
        break;
      
      // Department variations
      case 'department':
      case 'studentdepartment':
        value = student?.department ?? '';
        break;
      
      // Enrollment year variations
      case 'enrollmentyear':
      case 'batchyear':
      case 'admissionyear':
      case 'year':
        value = enrollment?.batchYear ?? student?.enrollmentYear ?? '';
        break;
      
      // Semester variations
      case 'semester':
      case 'enrollmentsemester':
      case 'currentsemester':
        value = enrollment?.semester ?? '';
        break;
      
      // GPA variations
      case 'gpa':
      case 'grade':
      case 'cgpa':
      case 'gradepoint':
        value = enrollment?.gpa ?? enrollment?.grade ?? '';
        break;
      
      // Course name variations
      case 'coursename':
      case 'course':
      case 'coursework':
      case 'subject':
      case 'major':
        value = course?.name ?? '';
        break;
      
      // Course code variations
      case 'coursecode':
      case 'code':
      case 'subjectcode':
        value = course?.code ?? '';
        break;
      
      // Course description variations
      case 'coursedescription':
      case 'description':
      case 'coursedetails':
        value = course?.description ?? '';
        break;
      
      // Course department variations
      case 'coursedepartment':
      case 'academicdepartment':
        value = course?.department ?? student?.department ?? '';
        break;
      
      // Certificate title variations
      case 'certificatetitle':
      case 'title':
      case 'certificatename':
      case 'badgetitle':
      case 'badge':
        value = resolvedBadgeTitle;
        break;
      
      // University name variations
      case 'universityname':
      case 'university':
      case 'institution':
      case 'college':
      case 'school':
        value = universityName;
        break;
      
      // Date variations
      case 'graduationdate':
      case 'issuedate':
      case 'completiondate':
      case 'date':
      case 'certificatedate':
        value = currentDate;
        break;
      
      // Wallet address variations
      case 'walletaddress':
      case 'wallet':
      case 'address':
      case 'publickey':
        value = student?.walletAddress ?? '';
        break;
      
      // Student ID variations
      case 'studentid':
      case 'studentnumber':
      case 'id':
      case 'rollnumber':
      case 'registrationnumber':
        value = student?.studentNumber ?? student?.id ?? '';
        break;
      
      // Achievement variations
      case 'achievements':
      case 'honors':
      case 'awards':
        value = student?.achievements?.map((a: any) => a.achievement?.title || a.title).join(', ') ?? '';
        break;
      
      // Default case - try to match any remaining fields
      default:
        // Try to find a close match in student data
        const studentFields = [
          { key: 'fullName', aliases: ['name', 'student', 'fullname'] },
          { key: 'email', aliases: ['email', 'emailaddress'] },
          { key: 'program', aliases: ['program', 'degree', 'major'] },
          { key: 'department', aliases: ['department', 'faculty'] },
          { key: 'studentNumber', aliases: ['studentid', 'id', 'number'] },
          { key: 'walletAddress', aliases: ['wallet', 'address'] }
        ];
        
        const enrollmentFields = [
          { key: 'gpa', aliases: ['gpa', 'grade', 'cgpa'] },
          { key: 'semester', aliases: ['semester', 'term'] },
          { key: 'batchYear', aliases: ['year', 'batch', 'batchyear'] }
        ];
        
        const courseFields = [
          { key: 'name', aliases: ['course', 'coursename', 'subject'] },
          { key: 'code', aliases: ['code', 'coursecode'] },
          { key: 'description', aliases: ['description', 'details'] }
        ];
        
        // Check student fields
        for (const fieldDef of studentFields) {
          if (fieldDef.aliases.some(alias => key.includes(alias) || alias.includes(key))) {
            value = student?.[fieldDef.key] ?? '';
            break;
          }
        }
        
        // Check enrollment fields if no student field matched
        if (!value && enrollment) {
          for (const fieldDef of enrollmentFields) {
            if (fieldDef.aliases.some(alias => key.includes(alias) || alias.includes(key))) {
              value = enrollment[fieldDef.key] ?? '';
              break;
            }
          }
        }
        
        // Check course fields if no enrollment field matched
        if (!value && course) {
          for (const fieldDef of courseFields) {
            if (fieldDef.aliases.some(alias => key.includes(alias) || alias.includes(key))) {
              value = course[fieldDef.key] ?? '';
              break;
            }
          }
        }
        
        // If still no match, leave empty
        if (!value) {
          value = '';
        }
    }

    derived[field] = stringifyValue(value);
  });

  return derived;
}

export default function IssueCertificatePage(): React.JSX.Element {
  const toast = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [metadataForm, setMetadataForm] = useState<Record<string, string>>({});
  const [badgeTitle, setBadgeTitle] = useState<string>('');
  const [degreeType, setDegreeType] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [fetching, setFetching] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeStudent = students[currentIndex] ?? null;
  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );
  const templateFields = useMemo(
    () => parseTemplateFields(activeTemplate?.templateFields),
    [activeTemplate]
  );

  const initializeForm = useCallback(
    (student: any, template: any) => {
      if (!student || !template) {
        setMetadataForm({});
        return;
      }

      const fields = parseTemplateFields(template.templateFields);
      const enrollment = student?.enrollments?.[0] ?? null;
      const defaultBadgeTitle = enrollment?.course?.name ?? template.name ?? '';
      const defaultDegreeType = template.degreeType ?? '';

      setBadgeTitle(defaultBadgeTitle);
      setDegreeType(defaultDegreeType);
      setMetadataForm(
        hydrateTemplateMetadata(student, fields, {
          template,
          degreeType: defaultDegreeType,
          badgeTitle: defaultBadgeTitle,
        })
      );
    },
    []
  );

  const loadData = useCallback(async () => {
    setFetching(true);
    setError(null);
    setStatusMessage(null);

    try {
      const [studentsRes, templatesRes] = await Promise.all([
        graphqlClient.getStudentsWithoutCertificates({ limit: STUDENT_PAGE_SIZE }),
        graphqlClient.getCertificateTemplates(),
      ]);

      const fetchedStudents = studentsRes.data?.studentsWithoutCertificates ?? [];
      const fetchedTemplates =
        (templatesRes.data?.certificateTemplates ?? []).filter((template: any) => template.isActive) ?? [];

      setStudents(fetchedStudents);
      setTemplates(fetchedTemplates);

      if (fetchedTemplates.length > 0) {
        const defaultTemplateId = fetchedTemplates[0].id;
        setSelectedTemplateId(defaultTemplateId);

        if (fetchedStudents.length > 0) {
          initializeForm(fetchedStudents[0], fetchedTemplates[0]);
        } else {
          setMetadataForm({});
        }
      } else {
        setSelectedTemplateId(null);
        setMetadataForm({});
      }

      setCurrentIndex(0);
    } catch (loadError: any) {
      console.error('Failed to load certificate issuance data', loadError);
      setError(
        loadError?.message ||
        'Unable to load eligible students or templates. Please verify your network connection and try again.'
      );
    } finally {
      setFetching(false);
    }
  }, [initializeForm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeStudent && activeTemplate) {
      initializeForm(activeStudent, activeTemplate);
    }
  }, [activeStudent, activeTemplate, initializeForm]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (template && activeStudent) {
      initializeForm(activeStudent, template);
    }
  };

  const handleMetadataChange = (field: string, value: string) => {
    setMetadataForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRefreshMetadata = () => {
    if (activeStudent && activeTemplate) {
      initializeForm(activeStudent, activeTemplate);
      toast.success({
        title: 'Fields refreshed',
        description: 'Certificate metadata has been auto-filled with the latest student data.',
      });
    }
  };

  const handleSkipStudent = () => {
    if (students.length === 0) {
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= students.length) {
      setStatusMessage('No additional students awaiting certificates.');
      setCurrentIndex(0);
      setMetadataForm({});
      return;
    }

    setCurrentIndex(nextIndex);
    const nextStudent = students[nextIndex];
    if (nextStudent && activeTemplate) {
      initializeForm(nextStudent, activeTemplate);
    }
  };

  const handleIssueCertificate = async () => {
    if (!activeStudent) {
      toast.warning({
        title: 'No student selected',
        description: 'There are no eligible students to issue a certificate to.',
      });
      return;
    }

    if (!activeTemplate) {
      toast.error({
        title: 'Template required',
        description: 'Select an active template before issuing a certificate.',
      });
      return;
    }

    const enrollment = activeStudent.enrollments?.[0];
    if (!enrollment) {
      toast.error({
        title: 'Missing enrollment',
        description: 'The selected student does not have an enrollment record. Please update their academic data.',
      });
      return;
    }

    const requiredFields = Object.keys(templateFields);
    const missingRequiredField = requiredFields.find((field) => (metadataForm[field] ?? '').trim().length === 0);
    if (missingRequiredField) {
      toast.error({
        title: 'Missing metadata',
        description: `Please provide a value for "${missingRequiredField}" before issuing the certificate.`,
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const preparedMetadata = Object.fromEntries(
        Object.entries(metadataForm).map(([field, value]) => [
          field,
          castMetadataValue(value, templateFields[field]),
        ])
      );

      const achievementIds =
        enrollment.achievements?.map((achievement: any) => achievement.id).filter(Boolean) ?? [];

      const courseDescription = activeStudent?.enrollments?.[0]?.course?.description ?? '';

      const response = await graphqlClient.issueCertificate({
        studentId: activeStudent.id,
        templateId: activeTemplate.id,
        enrollmentId: enrollment.id,
        badgeTitle: badgeTitle.trim() || activeTemplate.name,
        description: courseDescription?.trim() || undefined,
        degreeType: degreeType.trim() || activeTemplate.degreeType,
        metadata: preparedMetadata,
        achievementIds: achievementIds.length > 0 ? achievementIds : undefined,
      });

      if (response.errors?.length) {
        throw new Error(response.errors[0]?.message ?? 'Failed to issue certificate');
      }

      const issuedCertificate = response.data?.issueCertificate;
      const remainingCount = students.length - 1;

      setStudents((prev) => {
        const next = [...prev];
        next.splice(currentIndex, 1);
        return next;
      });

      toast.success({
        title: 'Certificate prepared',
        description: `Draft certificate ${issuedCertificate?.certificateNumber ?? ''} created successfully.`,
      });

      if (remainingCount <= 0) {
        setStatusMessage('All eligible students now have certificate drafts. Great job!');
        setMetadataForm({});
      } else {
        setCurrentIndex((prevIndex) => (prevIndex >= remainingCount ? 0 : prevIndex));
      }
    } catch (err: any) {
      console.error('Issue certificate failed', err);
      toast.error({
        title: 'Issuance failed',
        description: err?.message ?? 'Unable to issue the certificate. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const courseDescription = activeStudent?.enrollments?.[0]?.course?.description ?? '';

  if (fetching) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading eligible students and templates…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/university/certificates">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-muted/50">
              <ArrowLeft className="h-4 w-4" />
              Back to Certificates
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Single Student Issuance</h1>
        </div>
        <Button variant="outline" onClick={loadData} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && templates.length === 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            No active certificate templates were found. Create a template in the Certificate Designer before issuing
            certificates.
          </AlertDescription>
        </Alert>
      )}

      {!error && templates.length > 0 && students.length === 0 && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>Every registered student already has a certificate draft. Nothing left to issue!</AlertDescription>
        </Alert>
      )}

      {statusMessage && (
        <Alert>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}

      {!error && templates.length > 0 && activeStudent && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-card/60 backdrop-blur">
              <CardHeader className="pb-5">
                <CardTitle className="text-xl">Student Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold">{activeStudent.fullName}</p>
                    <p className="text-muted-foreground">{activeStudent.email}</p>
                  </div>
                  <Badge variant="secondary">{activeStudent.studentNumber}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Program</p>
                    <p className="font-medium">{activeStudent.program ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Department</p>
                    <p className="font-medium">{activeStudent.department ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Enrollment Year</p>
                    <p className="font-medium">{activeStudent.enrollmentYear ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Wallet</p>
                    <p className="font-mono text-xs break-all">
                      {activeStudent.walletAddress ?? 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">Enrollment Summary</p>
                  {activeStudent.enrollments?.length ? (
                    <div className="space-y-2 rounded-lg border border-muted p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{activeStudent.enrollments[0].course?.name ?? 'Course'}</span>
                        <Badge variant="outline">{activeStudent.enrollments[0].status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {courseDescription || 'No course description provided.'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Course Code</span>
                          <span className="font-medium">{activeStudent.enrollments[0].course?.code ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">GPA</span>
                          <span className="font-medium">{activeStudent.enrollments[0].gpa ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Semester</span>
                          <span className="font-medium">{activeStudent.enrollments[0].semester ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Grade</span>
                          <span className="font-medium">{activeStudent.enrollments[0].grade ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No enrollment history found for this student.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">Student Achievements</p>
                  {activeStudent.achievements?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {activeStudent.achievements.map((achievement: any) => (
                        <Badge key={achievement.id} variant="outline">
                          {achievement.achievement?.title ?? achievement.id}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No linked achievements yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-card/60 backdrop-blur">
              <CardHeader className="pb-5 space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Certificate Template & Metadata</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshMetadata}
                    disabled={!activeStudent || !activeTemplate}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Auto-fill
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review the data pulled from student records. Update any field if necessary before issuing the draft certificate.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Template</Label>
                  <Select value={selectedTemplateId ?? ''} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="h-11 bg-background/50 border-muted focus:border-primary">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Badge Title</Label>
                    <div className="relative">
                      <Input
                        value={badgeTitle}
                        onChange={(event) => setBadgeTitle(event.target.value)}
                        placeholder="e.g. Bachelor of Science in Computer Science"
                        className={`h-11 bg-background/50 border-muted focus:border-primary ${
                          badgeTitle ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : ''
                        }`}
                      />
                      {badgeTitle && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Degree Type</Label>
                    <div className="relative">
                      <Input
                        value={degreeType}
                        onChange={(event) => setDegreeType(event.target.value)}
                        placeholder="e.g. Bachelor"
                        className={`h-11 bg-background/50 border-muted focus:border-primary ${
                          degreeType ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : ''
                        }`}
                      />
                      {degreeType && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.keys(templateFields).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This template does not define any additional metadata fields.
                    </p>
                  ) : (
                    Object.entries(templateFields).map(([field, expectedType]) => (
                      <div key={field} className="space-y-2">
                        <Label className="text-sm font-medium capitalize">
                          {field}{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({expectedType === 'any' ? 'text' : expectedType})
                          </span>
                        </Label>
                        {expectedType === 'string' || expectedType === 'any' ? (
                          <div className="relative">
                            <Input
                              value={metadataForm[field] ?? ''}
                              onChange={(event) => handleMetadataChange(field, event.target.value)}
                              className={`h-11 bg-background/50 border-muted focus:border-primary ${
                                metadataForm[field] ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : ''
                              }`}
                              placeholder={`Enter ${field}`}
                            />
                            {metadataForm[field] && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                          </div>
                        ) : expectedType === 'number' ? (
                          <div className="relative">
                            <Input
                              type="number"
                              value={metadataForm[field] ?? ''}
                              onChange={(event) => handleMetadataChange(field, event.target.value)}
                              className={`h-11 bg-background/50 border-muted focus:border-primary ${
                                metadataForm[field] ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : ''
                              }`}
                              placeholder={`Enter numeric value for ${field}`}
                            />
                            {metadataForm[field] && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <Textarea
                              value={metadataForm[field] ?? ''}
                              onChange={(event) => handleMetadataChange(field, event.target.value)}
                              className={`min-h-[80px] bg-background/50 border-muted focus:border-primary ${
                                metadataForm[field] ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : ''
                              }`}
                              placeholder={`Enter ${field}`}
                            />
                            {metadataForm[field] && (
                              <div className="absolute right-2 top-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkipStudent}
                    className="flex items-center gap-2"
                    disabled={loading || students.length === 0}
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip Student
                  </Button>
                  <Button
                    onClick={handleIssueCertificate}
                    disabled={loading || !activeTemplate}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Issuing…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Issue Certificate
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}