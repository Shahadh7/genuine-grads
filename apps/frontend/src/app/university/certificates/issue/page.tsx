'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Upload,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { graphqlClient } from '@/lib/graphql-client';

type RowStatus = 'PENDING' | 'READY' | 'ISSUED' | 'ERROR';

interface BulkCertificateRow {
  rowNumber: number;
  studentNumber: string;
  nationalId: string;
  badgeTitle: string;
  degreeType?: string;
  description?: string;
  metadata: Record<string, string>;
  walletAddress?: string;
  studentId?: string;
  status: RowStatus;
  errors: string[];
  issueError?: string;
  certificateId?: string;
}

const REQUIRED_HEADERS = ['studentNumber', 'nationalId', 'badgeTitle'];
const RESERVED_HEADERS = new Set([
  ...REQUIRED_HEADERS,
  'degreeType',
  'description',
  'walletAddress',
]);

export default function IssueCertificatePage(): React.JSX.Element {
  const [rows, setRows] = useState<BulkCertificateRow[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [loadingLookup, setLoadingLookup] = useState<boolean>(false);
  const [processingRow, setProcessingRow] = useState<number | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = (e.target?.result as string) || '';
      const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        setUploadErrors(['The uploaded CSV must include a header row and at least one data row.']);
        return;
      }

      const headers = lines[0].split(',').map((header) => header.trim());

      const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
      if (missingHeaders.length > 0) {
        setUploadErrors([
          `Missing required column${missingHeaders.length > 1 ? 's' : ''}: ${missingHeaders.join(', ')}`,
        ]);
        return;
      }

      const parsedRows: BulkCertificateRow[] = [];
      const validationErrors: string[] = [];

      lines.slice(1).forEach((line, index) => {
        const values = line.split(',').map((value) => value.trim());
        const data: Record<string, string> = {};
        headers.forEach((header, i) => {
          data[header] = values[i] ?? '';
        });

        const studentNumber = data.studentNumber || '';
        const nationalId = data.nationalId || '';
        const badgeTitle = data.badgeTitle || '';
        const degreeType = data.degreeType || '';
        const description = data.description || '';
        const explicitWallet = data.walletAddress || '';

        const metadata: Record<string, string> = {};
        headers.forEach((header) => {
          if (!RESERVED_HEADERS.has(header)) {
            metadata[header] = data[header];
          }
        });

        const rowNumber = index + 2; // account for header row
        const rowErrors: string[] = [];

        if (!studentNumber) {
          rowErrors.push('Student number is required.');
        }
        if (!nationalId) {
          rowErrors.push('National ID is required.');
        }
        if (!badgeTitle) {
          rowErrors.push('Badge title is required.');
        }

        if (rowErrors.length > 0) {
          validationErrors.push(`Row ${rowNumber}: ${rowErrors.join(' ')}`);
        }

        parsedRows.push({
          rowNumber,
          studentNumber,
          nationalId,
          badgeTitle,
          degreeType,
          description,
          metadata,
          walletAddress: explicitWallet || undefined,
          status: rowErrors.length > 0 ? 'ERROR' : 'PENDING',
          errors: rowErrors,
        });
      });

      setUploadErrors(validationErrors);
      setRows(parsedRows);
      setGlobalMessage(null);

      const rowsNeedingLookup = parsedRows.filter((row) => row.status !== 'ERROR');
      if (rowsNeedingLookup.length > 0) {
        await enrichRowsWithLookups(parsedRows);
      }
    };

    reader.readAsText(file);
  };

  const enrichRowsWithLookups = async (currentRows: BulkCertificateRow[]) => {
    setLoadingLookup(true);
    const updatedRows = [...currentRows];

    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      if (row.status === 'ERROR') continue;

      try {
        const response = await graphqlClient.lookupStudentByNationalId(row.nationalId);
        const lookup = response.data?.lookupStudentByNationalId;

        if (!lookup) {
          row.status = 'ERROR';
          row.errors = [...row.errors, 'Lookup failed – unexpected response from server.'];
          continue;
        }

        if (!lookup.globalExists) {
          row.status = 'ERROR';
          row.errors = [...row.errors, 'No entry found in Global Student Index for this national ID.'];
          continue;
        }

        row.studentId = lookup.studentId ?? undefined;
        row.walletAddress = (lookup.walletAddress || lookup.globalWalletAddress) ?? row.walletAddress;

        if (!row.studentId) {
          row.status = 'ERROR';
          row.errors = [
            ...row.errors,
            'Student is not registered in this university. Register the student before issuing certificates.',
          ];
        } else {
          row.status = 'READY';
        }
      } catch (error) {
        console.error('Lookup failed for row', row.rowNumber, error);
        row.status = 'ERROR';
        row.errors = [...row.errors, 'Lookup failed. Please retry later.'];
      }
    }

    setRows(updatedRows);
    setLoadingLookup(false);
  };

  const handleIssueCertificate = async (rowIndex: number) => {
    const targetRow = rows[rowIndex];
    if (!targetRow || targetRow.status === 'ISSUED') return;

    const rowErrors: string[] = [];
    if (!targetRow.studentId) {
      rowErrors.push('Student is missing. Please verify the student registration.');
    }
    if (!targetRow.walletAddress) {
      rowErrors.push('Wallet address is missing. Ensure the student has a registered wallet.');
    }

    if (rowErrors.length > 0) {
      updateRow(rowIndex, {
        status: 'ERROR',
        errors: [...targetRow.errors, ...rowErrors],
      });
      return;
    }

    setProcessingRow(targetRow.rowNumber);
    setGlobalMessage(null);

    try {
      const metadata = {
        studentNumber: targetRow.studentNumber,
        nationalId: targetRow.nationalId,
        badgeTitle: targetRow.badgeTitle,
        degreeType: targetRow.degreeType,
        description: targetRow.description,
        walletAddress: targetRow.walletAddress,
        ...targetRow.metadata,
      };

      const response = await graphqlClient.issueCertificate({
        studentId: targetRow.studentId!,
        badgeTitle: targetRow.badgeTitle,
        description: targetRow.description,
        degreeType: targetRow.degreeType,
        metadata,
      });

      if (response.errors && response.errors.length > 0) {
        const message = response.errors[0]?.message || 'Failed to issue certificate.';
        updateRow(rowIndex, {
          status: 'ERROR',
          issueError: message,
          errors: [...targetRow.errors, message],
        });
        return;
      }

      const issued = response.data?.issueCertificate;
      updateRow(rowIndex, {
        status: 'ISSUED',
        certificateId: issued?.id,
        issueError: undefined,
      });

      setGlobalMessage(
        'Certificates have been queued for minting. Visit the Certificates tab to mint each pending certificate on-chain.'
      );
    } catch (error: any) {
      console.error('Issue certificate error:', error);
      updateRow(rowIndex, {
        status: 'ERROR',
        issueError: error?.message || 'Failed to issue certificate.',
        errors: [...targetRow.errors, error?.message || 'Failed to issue certificate.'],
      });
    } finally {
      setProcessingRow(null);
    }
  };

  const updateRow = (index: number, updates: Partial<BulkCertificateRow>) => {
    setRows((prevRows) => {
      const copy = [...prevRows];
      copy[index] = {
        ...copy[index],
        ...updates,
      };
      return copy;
    });
  };

  const downloadTemplate = () => {
    const template = `studentNumber,nationalId,badgeTitle,degreeType,description,gpa,honors
STU-2024-001,NIC123456789V,Bachelor of Science in Computer Science,Bachelor,Completed with honors,3.90,"Dean's List; Hackathon Winner"
STU-2024-002,NIC987654321V,Master of Business Administration,Master,Thesis distinction,3.85,"Graduate Research Award"`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'bulk-certificates-template.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const readyRows = rows.filter((row) => row.status === 'READY').length;
  const issuedRows = rows.filter((row) => row.status === 'ISSUED').length;
  const errorRows = rows.filter((row) => row.status === 'ERROR').length;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/university/certificates">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-muted/50">
              <ArrowLeft className="h-4 w-4" />
              Back to Certificates
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Bulk Certificate Drafts</h1>
              <p className="text-muted-foreground text-lg">
                Upload a CSV to create pending certificates. Each certificate is issued off-chain and can then be minted individually.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {!rows.length && (
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  Upload CSV File
                </CardTitle>
                <p className="text-muted-foreground">
                  Required columns: <strong>studentNumber</strong>, <strong>nationalId</strong>,{' '}
                  <strong>badgeTitle</strong>. Optional columns are added to certificate metadata.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 text-center bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Choose a CSV file</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Each row will be validated against the Global Student Index. Wallet addresses are automatically populated when available.
                  </p>
                  <Input type="file" accept=".csv" onChange={handleFileUpload} className="max-w-sm mx-auto" />
                </div>

                <div className="flex items-center justify-center">
                  <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2 h-11">
                    <FileText className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {uploadErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                {uploadErrors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {globalMessage && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>{globalMessage}</AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  Review & Issue Certificates
                </CardTitle>
                <p className="text-muted-foreground">
                  Verify each row, then click <strong>Issue Certificate</strong> to create an off-chain record. Minting happens afterwards from the Certificates tab.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-muted">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-medium">Row</TableHead>
                        <TableHead className="font-medium">Student #</TableHead>
                        <TableHead className="font-medium">National ID</TableHead>
                        <TableHead className="font-medium">Badge Title</TableHead>
                        <TableHead className="font-medium">Wallet</TableHead>
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={row.rowNumber} className="align-top">
                          <TableCell className="font-mono text-sm font-medium">{row.rowNumber}</TableCell>
                          <TableCell>
                            <div className="font-medium">{row.studentNumber}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{row.nationalId}</div>
                            {row.errors.find((message) => message.toLowerCase().includes('global')) && (
                              <div className="text-xs text-red-500 mt-1">Not found in global index</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{row.badgeTitle}</div>
                            {row.degreeType && (
                              <div className="text-xs text-muted-foreground">{row.degreeType}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.walletAddress ? (
                              <span className="font-mono text-xs break-all">{row.walletAddress}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Pending lookup</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.status === 'READY'
                                  ? 'default'
                                  : row.status === 'ISSUED'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className="flex items-center gap-1"
                            >
                              {row.status === 'ISSUED' ? (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  Issued
                                </>
                              ) : row.status === 'READY' ? (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  Ready
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-3 w-3" />
                                  {row.status === 'ERROR' ? 'Needs attention' : 'Pending'}
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-2"
                                onClick={() => enrichRowsWithLookups(rows)}
                                disabled={loadingLookup}
                              >
                                <RefreshCw className={`h-4 w-4 ${loadingLookup ? 'animate-spin' : ''}`} />
                                Refresh Lookup
                              </Button>
                              <Button
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => handleIssueCertificate(index)}
                                disabled={row.status !== 'READY' || processingRow === row.rowNumber}
                              >
                                {processingRow === row.rowNumber ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Issuing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    Issue Certificate
                                  </>
                                )}
                              </Button>
                            </div>
                            {row.issueError && (
                              <div className="text-xs text-red-600 mt-2">{row.issueError}</div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Notes
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>
                      Each issued certificate appears in the Certificates list with status <strong>PENDING</strong>.
                    </li>
                    <li>
                      Use the standard minting flow to sign and finalize each certificate on-chain.
                    </li>
                    <li>
                      Wallet addresses are sourced from the Global Student Index. Update the global record before running a bulk issuance.
                    </li>
                  </ul>
                </div>

                {rows.some((row) => row.errors.length > 0) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Rows requiring attention
                    </h3>
                    <div className="bg-red-500/5 border border-red-200 rounded-lg p-4 space-y-2">
                      {rows
                        .filter((row) => row.errors.length > 0)
                        .map((row) => (
                          <div key={row.rowNumber} className="text-sm text-red-600">
                            <span className="font-mono mr-2">Row {row.rowNumber}:</span>
                            {row.errors.join(' ')}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Workflow Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground">1. Upload CSV</h4>
                <p>Include studentNumber, nationalId, badgeTitle, and any additional metadata columns.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">2. System Validation</h4>
                <p>
                  We hash each national ID, check the Global Student Index, and reuse the wallet registered for the student. Rows with missing data are flagged for review.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">3. Issue Certificates</h4>
                <p>
                  Issue each certificate to create an off-chain record. The GraphQL API stores metadata and marks the certificate as pending mint.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">4. Mint Individually</h4>
                <p>
                  Open the Certificates tab to mint each pending certificate via the wallet-based transaction flow. This ensures every mint is explicitly signed.
                </p>
              </div>
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Progress Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <span>Total rows</span>
                  <span className="font-semibold">{rows.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ready to issue</span>
                  <span className="font-semibold text-green-600">{readyRows}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Issued (pending mint)</span>
                  <span className="font-semibold text-blue-600">{issuedRows}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Needs attention</span>
                  <span className="font-semibold text-red-600">{errorRows}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

