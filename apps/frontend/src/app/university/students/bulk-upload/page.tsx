'use client';
import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Upload, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  FileText,
  Users,
  Info,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { graphqlClient } from '@/lib/graphql-client';
import { validateNIC } from '@/lib/validators';

interface Props {
  // Add props here
}

export default function BulkUploadPage(): React.JSX.Element {
  const router = useRouter();
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [loading, setLoading] = useState<any>(false);
  const [errors, setErrors] = useState<any>([]);
  const [serverFailures, setServerFailures] = useState<any>([]);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [overwriteWallet, setOverwriteWallet] = useState<boolean>(false);

  const generalErrors = errors.filter((error: any) => !error.row);

  const parseAchievements = (value: string): string[] => {
    if (!value) return [];
    return value
      .replace(/^"|"$/g, '')
      .split(/;|\|/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = (e.target?.result as string) || '';
      const lines = csv.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
      if (lines.length === 0) {
        setErrors([{ message: 'The uploaded file is empty.' }]);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1).map((line: any, index: any) => {
        const values = line.split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, i: any) => {
          row[header] = values[i] || '';
        });
        const normalized = {
          rowNumber: index + 2,
          fullName: row.fullName || row.name || '',
          email: row.email || '',
          studentNumber: row.studentNumber || row.student_number || row.studentNo || '',
          nationalId: row.nationalId || row.national_id || row.nic || '',
          program: row.program || '',
          department: row.department || '',
          walletAddress: row.walletAddress || row.wallet_address || '',
          enrollmentYear: row.enrollmentYear || row.enrollment_year || '',
          courseCode: row.courseCode || row.course_code || '',
          courseName: row.courseName || row.course_name || '',
          courseDescription: row.courseDescription || row.course_description || '',
          courseCredits: row.courseCredits || row.course_credits || '',
          degreeType: row.degreeType || row.degree_type || '',
          enrollmentGpa: row.enrollmentGpa || row.enrollment_gpa || '',
          enrollmentGrade: row.enrollmentGrade || row.enrollment_grade || '',
          achievements: parseAchievements(row.achievements || row.achievement || ''),
        };
        return normalized;
      }).filter(row => row.fullName || row.nationalId || row.email);

      // Validate data
      const validationErrors = [];
      data.forEach((row: any) => {
        if (!row.fullName) {
          validationErrors.push({ row: row.rowNumber, field: 'fullName', message: 'Full name is required' });
        }
        if (!row.studentNumber) {
          validationErrors.push({ row: row.rowNumber, field: 'studentNumber', message: 'Student number is required' });
        }
        if (!row.nationalId) {
          validationErrors.push({ row: row.rowNumber, field: 'nationalId', message: 'National ID is required' });
        } else {
          const nicValidation = validateNIC(row.nationalId);
          if (!nicValidation.isValid) {
            validationErrors.push({ row: row.rowNumber, field: 'nationalId', message: nicValidation.error || 'Invalid NIC format' });
          }
        }
        if (!row.email) {
          validationErrors.push({ row: row.rowNumber, field: 'email', message: 'Email is required' });
        } else if (!isValidEmail(row.email)) {
          validationErrors.push({ row: row.rowNumber, field: 'email', message: 'Invalid email format' });
        }
        if (!row.program) {
          validationErrors.push({ row: row.rowNumber, field: 'program', message: 'Program is required' });
        }
        if (!row.department) {
          validationErrors.push({ row: row.rowNumber, field: 'department', message: 'Department is required' });
        }
        if (!row.enrollmentYear) {
          validationErrors.push({ row: row.rowNumber, field: 'enrollmentYear', message: 'Enrollment year is required' });
        }
        if (!row.courseCode) {
          validationErrors.push({ row: row.rowNumber, field: 'courseCode', message: 'Course code is required' });
        }
        if (!row.courseName) {
          validationErrors.push({ row: row.rowNumber, field: 'courseName', message: 'Course name is required' });
        }
        if (!row.degreeType) {
          validationErrors.push({ row: row.rowNumber, field: 'degreeType', message: 'Degree type is required' });
        }
        if (!row.walletAddress) {
          validationErrors.push({ row: row.rowNumber, field: 'walletAddress', message: 'Wallet address is required' });
        } else if (!isValidWalletAddress(row.walletAddress)) {
          validationErrors.push({ row: row.rowNumber, field: 'walletAddress', message: 'Invalid wallet address format' });
        }
        if (row.enrollmentYear && isNaN(Number(row.enrollmentYear))) {
          validationErrors.push({ row: row.rowNumber, field: 'enrollmentYear', message: 'Enrollment year must be a number' });
        }
        if (row.courseCredits && isNaN(Number(row.courseCredits))) {
          validationErrors.push({ row: row.rowNumber, field: 'courseCredits', message: 'Course credits must be numeric' });
        }
        if (row.enrollmentGpa && isNaN(Number(row.enrollmentGpa))) {
          validationErrors.push({ row: row.rowNumber, field: 'enrollmentGpa', message: 'GPA must be numeric' });
        }
      });

      setErrors(validationErrors);
      setServerFailures([]);
      setUploadResults(null);
      setUploadedData(data);
    };
    reader.readAsText(file);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidWalletAddress = (address) => {
    // Basic Solana address validation (44 characters, alphanumeric)
    return /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(address);
  };

  const handleConfirmUpload = async () => {
    setLoading(true);
    
    try {
      const payload = {
        students: uploadedData.map((row: any) => ({
          rowNumber: row.rowNumber,
          fullName: row.fullName,
          email: row.email,
          studentNumber: row.studentNumber,
          nationalId: row.nationalId,
          walletAddress: row.walletAddress,
          program: row.program,
          department: row.department,
          enrollmentYear: Number(row.enrollmentYear),
          courseCode: row.courseCode,
          courseName: row.courseName,
          courseDescription: row.courseDescription || null,
          courseCredits: row.courseCredits ? Number(row.courseCredits) : null,
          degreeType: row.degreeType,
          enrollmentGpa: row.enrollmentGpa ? Number(row.enrollmentGpa) : null,
          enrollmentGrade: row.enrollmentGrade || null,
          achievements: Array.isArray(row.achievements) && row.achievements.length > 0 ? row.achievements : [],
        })),
        overwriteWalletFromGlobalIndex: overwriteWallet,
      };

      const response = await graphqlClient.bulkImportStudents(payload);

      if (response.errors && response.errors.length > 0) {
        setErrors([{ message: response.errors[0]?.message || 'Bulk import failed.' }]);
        return;
      }

      const result = response.data?.bulkImportStudents;

      setUploadResults(result);
      setServerFailures(result?.failures ?? []);

      if (result && result.successCount > 0) {
        router.push('/university/students');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setErrors([{ message: 'Upload failed. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const getRowError = (rowNumber) => {
    const clientErrorsForRow = errors.filter((error: any) => error.row === rowNumber);
    const serverErrorsForRow = serverFailures
      .filter((failure: any) => failure.rowNumber === rowNumber)
      .map((failure: any) => ({
        row: failure.rowNumber,
        field: failure.field,
        message: failure.message,
      }));
    return [...clientErrorsForRow, ...serverErrorsForRow];
  };

  const downloadTemplate = () => {
    const template = `fullName,studentNumber,nationalId,email,program,department,enrollmentYear,walletAddress,courseCode,courseName,courseDescription,degreeType,courseCredits,enrollmentGpa,enrollmentGrade,achievements
John Doe,STU-2025-001,NIC123456789V,john.doe@student.edu,Bachelor of Computer Science,Engineering,2021,9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM,CSC-410,Advanced Distributed Systems,"Core final-year module covering Solana + Web3 concepts.",Bachelor,120,3.85,"First Class","Dean's List 2023|Hackathon Winner"
Jane Smith,STU-2025-002,NIC987654321V,jane.smith@student.edu,Master of Business Administration,Business School,2020,7T3Y7LqjjswXf3bcE8Hu2nQqzHmv8b5e4pNnMxD2qR4B,MBA-502,Strategic Leadership,"Capstone course with board simulation.",Master,60,3.78,"Distinction","Valedictorian|Leadership Award"
Arjun Perera,STU-2025-003,NIC556677889V,arjun.perera@student.edu,Bachelor of Engineering,Technology,2022,8fycQkYbKd8B1u4sQpgo1sr5Yk8XkmGS2o8sDQibV1Uo,ENG-305,Robotics & Automation,"Robotics practicum with industry placement.",Bachelor,90,3.65,"Merit","Hackathon Champion; Research Fellowship 2024"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Bulk Upload Students</h1>
              <p className="text-muted-foreground text-lg">Upload multiple students using a CSV file</p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                ⚠️ Only students with connected wallets can be registered
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Section */}
          {!uploadedData && (
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  Upload CSV File
                </CardTitle>
                <p className="text-muted-foreground">Select a CSV file containing student information to bulk register multiple students.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 text-center bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Choose a CSV file</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Include columns: <strong>fullName</strong>, <strong>studentNumber</strong>, <strong>nationalId</strong>, <strong>email</strong>, <strong>program</strong>, <strong>department</strong>, <strong>enrollmentYear</strong>, <strong>walletAddress</strong>, <strong>courseCode</strong>, <strong>courseName</strong>, <strong>degreeType</strong>, and optional columns for <strong>courseCredits</strong>, <strong>courseDescription</strong>, <strong>enrollmentGpa</strong>, <strong>enrollmentGrade</strong>, plus <strong>achievements</strong> (separate multiple entries with <code>;</code> or <code>|</code>).
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <Button asChild className="cursor-pointer h-11 px-6 bg-primary hover:bg-primary/90 shadow-lg">
                      <span>Select File</span>
                    </Button>
                  </label>
                </div>
                
                <div className="flex items-center justify-center">
                  <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2 h-11">
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Section */}
          {uploadedData && (
            <div className="space-y-6">
              {generalErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-1">
                    {generalErrors.map((error: any, index: number) => (
                      <div key={index}>{error.message}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500/5 to-blue-500/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Students Found</p>
                          <p className="text-2xl font-bold">{uploadedData.length}</p>
                        </div>
                      </div>
                      {errors.length > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-500/10 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Validation Errors</p>
                            <p className="text-2xl font-bold text-orange-600">{errors.length}</p>
                          </div>
                        </div>
                      )}
                      {uploadResults && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Successfully Added</p>
                            <p className="text-2xl font-bold text-blue-600">{uploadResults.successCount}</p>
                          </div>
                        </div>
                      )}
                      {uploadResults && uploadResults.failureCount > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Failed Imports</p>
                            <p className="text-2xl font-bold text-red-600">{uploadResults.failureCount}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="overwrite-wallet"
                          checked={overwriteWallet}
                          onCheckedChange={(value) => setOverwriteWallet(Boolean(value))}
                        />
                        <Label htmlFor="overwrite-wallet" className="text-sm text-muted-foreground">
                          Prefer wallet from Global Student Index when available
                        </Label>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4 md:mt-0">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setUploadedData(null);
                          setUploadResults(null);
                          setErrors([]);
                          setServerFailures([]);
                        }}
                        className="h-11"
                      >
                        Upload New File
                      </Button>
                      {!uploadResults && (
                        <Button 
                          onClick={handleConfirmUpload}
                          disabled={errors.length > 0 || loading}
                          className="h-11 bg-primary hover:bg-primary/90 shadow-lg"
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Registering Students...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Confirm & Register
                            </div>
                          )}
                        </Button>
                      )}
                      {uploadResults && uploadResults.successCount > 0 && (
                        <Button 
                          onClick={() => router.push('/university/students')}
                          className="h-11 bg-green-600 hover:bg-green-700 shadow-lg"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            View Students
                          </div>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Preview Card */}
              <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    Data Preview
                  </CardTitle>
                  <p className="text-muted-foreground">Review the uploaded data before confirming registration.</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-muted">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-medium">Row</TableHead>
                          <TableHead className="font-medium">Student #</TableHead>
                          <TableHead className="font-medium">Full Name</TableHead>
                          <TableHead className="font-medium">National ID</TableHead>
                          <TableHead className="font-medium">Email</TableHead>
                          <TableHead className="font-medium">Program</TableHead>
                          <TableHead className="font-medium">Department</TableHead>
                          <TableHead className="font-medium whitespace-nowrap">Enrollment Year</TableHead>
                          <TableHead className="font-medium whitespace-nowrap">Course Code</TableHead>
                          <TableHead className="font-medium whitespace-nowrap">Course Name</TableHead>
                          <TableHead className="font-medium whitespace-nowrap">Degree Type</TableHead>
                          <TableHead className="font-medium whitespace-nowrap">GPA</TableHead>
                          <TableHead className="font-medium">Achievements</TableHead>
                          <TableHead className="font-medium">Wallet</TableHead>
                          <TableHead className="font-medium">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadedData.map((row: any) => {
                          const rowErrors = getRowError(row.rowNumber);
                          const hasErrors = rowErrors.length > 0;
                          
                          return (
                            <TableRow 
                              key={row.rowNumber} 
                              className={hasErrors ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-muted/50'}
                            >
                              <TableCell className="font-mono text-sm font-medium">{row.rowNumber}</TableCell>
                              <TableCell>
                                <div className={rowErrors.find(e => e.field === 'studentNumber') ? 'text-red-600 font-medium' : 'font-medium'}>
                                  {row.studentNumber || 'Missing'}
                                </div>
                                {rowErrors.find(e => e.field === 'studentNumber') && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {rowErrors.find(e => e.field === 'studentNumber').message}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className={rowErrors.find(e => e.field === 'fullName') ? 'text-red-600 font-medium' : 'font-medium'}>
                                    {row.fullName || 'Missing'}
                                  </div>
                                  {rowErrors.find(e => e.field === 'fullName') && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {rowErrors.find(e => e.field === 'fullName').message}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className={rowErrors.find(e => e.field === 'nationalId') ? 'text-red-600 font-medium' : 'font-medium'}>
                                    {row.nationalId || 'Missing'}
                                  </div>
                                  {rowErrors.find(e => e.field === 'nationalId') && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {rowErrors.find(e => e.field === 'nationalId').message}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className={rowErrors.find(e => e.field === 'email') ? 'text-red-600 font-medium' : 'font-medium'}>
                                    {row.email || 'Missing'}
                                  </div>
                                  {rowErrors.find(e => e.field === 'email') && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {rowErrors.find(e => e.field === 'email').message}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className={rowErrors.find(e => e.field === 'program') ? 'text-red-600 font-medium' : 'font-medium'}>
                                    {row.program || 'Missing'}
                                  </div>
                                  {rowErrors.find(e => e.field === 'program') && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {rowErrors.find(e => e.field === 'program').message}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className={rowErrors.find(e => e.field === 'department') ? 'text-red-600 font-medium' : 'font-medium'}>
                                    {row.department || 'Missing'}
                                  </div>
                                  {rowErrors.find(e => e.field === 'department') && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {rowErrors.find(e => e.field === 'department').message}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className={rowErrors.find(e => e.field === 'enrollmentYear') ? 'text-red-600 font-medium' : 'font-medium'}>
                                    {row.enrollmentYear || 'Missing'}
                                  </div>
                                  {rowErrors.find(e => e.field === 'enrollmentYear') && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {rowErrors.find(e => e.field === 'enrollmentYear').message}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className={rowErrors.find(e => e.field === 'courseCode') ? 'text-red-600 font-medium' : 'font-medium'}>
                                  {row.courseCode || 'Missing'}
                                </div>
                                {rowErrors.find(e => e.field === 'courseCode') && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {rowErrors.find(e => e.field === 'courseCode').message}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className={rowErrors.find(e => e.field === 'courseName') ? 'text-red-600 font-medium' : 'font-medium'}>
                                  {row.courseName || 'Missing'}
                                </div>
                                {rowErrors.find(e => e.field === 'courseName') && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {rowErrors.find(e => e.field === 'courseName').message}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className={rowErrors.find(e => e.field === 'degreeType') ? 'text-red-600 font-medium' : 'font-medium'}>
                                  {row.degreeType || 'Missing'}
                                </div>
                                {rowErrors.find(e => e.field === 'degreeType') && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {rowErrors.find(e => e.field === 'degreeType').message}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className={rowErrors.find(e => e.field === 'enrollmentGpa') ? 'text-red-600 font-medium' : 'font-medium'}>
                                  {row.enrollmentGpa || '—'}
                                </div>
                                {rowErrors.find(e => e.field === 'enrollmentGpa') && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {rowErrors.find(e => e.field === 'enrollmentGpa').message}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {Array.isArray(row.achievements) && row.achievements.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {row.achievements.map((achievement: string, index: number) => (
                                      <Badge key={`${row.rowNumber}-ach-${index}`} variant="secondary" className="text-xs px-2 py-0">
                                        {achievement}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className={rowErrors.find(e => e.field === 'walletAddress') ? 'text-red-600 font-medium' : 'font-medium'}>
                                  {row.walletAddress || <span className="text-muted-foreground">Not provided</span>}
                                </div>
                                {rowErrors.find(e => e.field === 'walletAddress') && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {rowErrors.find(e => e.field === 'walletAddress').message}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {hasErrors ? (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Errors
                                  </Badge>
                                ) : (
                                  <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="h-3 w-3" />
                                    Valid
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Upload Guidelines Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-primary" />
                Upload Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    CSV file must include all required academic fields: full name, national ID, email, program, department, enrollment year, wallet address, course code, course name, and degree type. Optional academic metrics like GPA and achievements can also be provided.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    Achievements column is optional. Separate multiple entries with semicolons (<code>;</code>) or pipes (<code>|</code>).
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    All email addresses must be in valid format.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    Maximum 100 students per upload for optimal performance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 