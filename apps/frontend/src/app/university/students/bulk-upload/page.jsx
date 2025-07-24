'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { studentsAPI } from '@/lib/api';

export default function BulkUploadPage() {
  const router = useRouter();
  const [uploadedData, setUploadedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [uploadResults, setUploadResults] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        row.rowNumber = index + 2; // +2 because we start from line 2 and index starts at 0
        return row;
      }).filter(row => row.name || row.nic || row.email); // Remove empty rows

      // Validate data
      const validationErrors = [];
      data.forEach(row => {
        if (!row.name) {
          validationErrors.push({ row: row.rowNumber, field: 'name', message: 'Name is required' });
        }
        if (!row.nic) {
          validationErrors.push({ row: row.rowNumber, field: 'nic', message: 'NIC is required' });
        }
        if (!row.email) {
          validationErrors.push({ row: row.rowNumber, field: 'email', message: 'Email is required' });
        } else if (!isValidEmail(row.email)) {
          validationErrors.push({ row: row.rowNumber, field: 'email', message: 'Invalid email format' });
        }
        if (!row.program) {
          validationErrors.push({ row: row.rowNumber, field: 'program', message: 'Program is required' });
        }
        if (!row.walletAddress) {
          validationErrors.push({ row: row.rowNumber, field: 'walletAddress', message: 'Wallet address is required' });
        } else if (!isValidWalletAddress(row.walletAddress)) {
          validationErrors.push({ row: row.rowNumber, field: 'walletAddress', message: 'Invalid wallet address format' });
        }
      });

      setErrors(validationErrors);
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
      // Use the mock API to bulk create students
      const results = await studentsAPI.bulkCreate(uploadedData);
      setUploadResults(results);
      
      if (results.success.length > 0) {
        // Show success message and redirect after a delay
        setTimeout(() => {
          router.push('/university/students');
        }, 2000);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setErrors([{ message: 'Upload failed. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const getRowError = (rowNumber) => {
    return errors.filter(error => error.row === rowNumber);
  };

  const downloadTemplate = () => {
    const template = `name,nic,email,program,walletAddress,achievements
John Doe,NIC123456789,john.doe@student.edu,Bachelor of Computer Science,9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM,"Dean's List 2023, Hackathon Winner"
Jane Smith,NIC987654321,jane.smith@student.edu,Master of Business Administration,7XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM,"Academic Excellence Award"`;
    
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
                    The file should contain columns: <strong>name</strong>, <strong>nic</strong>, <strong>email</strong>, <strong>program</strong>, <strong>walletAddress</strong> (required), <strong>achievements</strong> (optional)
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <Button as="span" className="cursor-pointer h-11 px-6 bg-primary hover:bg-primary/90 shadow-lg">
                      Select File
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
                            <p className="text-2xl font-bold text-blue-600">{uploadResults.success.length}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setUploadedData(null);
                          setUploadResults(null);
                          setErrors([]);
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
                      {uploadResults && uploadResults.success.length > 0 && (
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
                          <TableHead className="font-medium">Name</TableHead>
                          <TableHead className="font-medium">NIC</TableHead>
                          <TableHead className="font-medium">Email</TableHead>
                          <TableHead className="font-medium">Program</TableHead>
                          <TableHead className="font-medium">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadedData.map((row) => {
                          const rowErrors = getRowError(row.rowNumber);
                          const hasErrors = rowErrors.length > 0;
                          
                          return (
                            <TableRow 
                              key={row.rowNumber} 
                              className={hasErrors ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-muted/50'}
                            >
                              <TableCell className="font-mono text-sm font-medium">{row.rowNumber}</TableCell>
                              <TableCell>
                                <div>
                                  <div className={rowErrors.find(e => e.field === 'name') ? 'text-red-600 font-medium' : 'font-medium'}>
                                    {row.name || 'Missing'}
                                  </div>
                                  {rowErrors.find(e => e.field === 'name') && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {rowErrors.find(e => e.field === 'name').message}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className={rowErrors.find(e => e.field === 'nic') ? 'text-red-600 font-medium' : 'font-medium'}>
                                    {row.nic || 'Missing'}
                                  </div>
                                  {rowErrors.find(e => e.field === 'nic') && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {rowErrors.find(e => e.field === 'nic').message}
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
                    CSV file must include: name, nic, email, and program columns.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    Achievements column is optional and can contain multiple values separated by commas.
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

          {/* Upload Stats Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/5 to-blue-600/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Upload Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Uploads</span>
                <Badge variant="secondary">24</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month</span>
                <Badge variant="default">+8</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <Badge variant="outline" className="text-green-600">98.5%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Students/Upload</span>
                <Badge variant="outline">15</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500/5 to-green-600/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Link href="/university/students/add" className="w-full">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Add Single Student
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 