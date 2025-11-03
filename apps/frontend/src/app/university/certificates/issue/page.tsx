'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { certificatesAPI, studentsAPI } from '@/lib/api';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Award, 
  FileText, 
  Zap,
  Users,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const steps = [
  { id: 1, title: 'Select Certificates', icon: FileText },
  { id: 2, title: 'Review & Confirm', icon: CheckCircle },
  { id: 3, title: 'Mint cNFTs', icon: Zap }
];

interface Props {
  // Add props here
}

export default function IssueCertificatePage(): React.JSX.Element {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<any>(1);
  const [students, setStudents] = useState<any>([]);
  const [pendingCertificates, setPendingCertificates] = useState<any>([]);
  const [loading, setLoading] = useState<any>(false);
  const [selectedCertificates, setSelectedCertificates] = useState<any>([]);
  const [issuanceResults, setIssuanceResults] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<any>(1);
  const [pageSize, setPageSize] = useState<any>(10);
  const [reviewPage, setReviewPage] = useState<any>(1);
  const [reviewPageSize, setReviewPageSize] = useState<any>(5);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [studentsResult, certificatesResult] = await Promise.all([
          studentsAPI.getAll(),
          certificatesAPI.getReadyForIssuance()
        ]);
        
        if (studentsResult.success) {
          setStudents(studentsResult.data);
        }
        
        if (certificatesResult.success) {
          setPendingCertificates(certificatesResult.data);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();
  }, []);

  const handleCertificateToggle = (certificateId) => {
    setSelectedCertificates(prev => 
      prev.includes(certificateId)
        ? prev.filter(id => id !== certificateId)
        : [...prev, certificateId]
    );
  };

  const handleSelectAll = () => {
    const allCertificateIds = pendingCertificates.map(cert => cert.id);
    if (selectedCertificates.length === allCertificateIds.length) {
      setSelectedCertificates([]);
    } else {
      setSelectedCertificates(allCertificateIds);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      // Reset review page when moving to step 2
      if (currentStep === 1) {
        setReviewPage(1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Reset review page when moving back from step 2
      if (currentStep === 2) {
        setReviewPage(1);
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const results = await certificatesAPI.bulkIssue(selectedCertificates);
      setIssuanceResults(results);
      
      if (results.success.length > 0) {
        // Refresh the pending certificates list
        const certificatesResult = await certificatesAPI.getReadyForIssuance();
        if (certificatesResult.success) {
          setPendingCertificates(certificatesResult.data);
        }
        
        // Redirect after a delay
        setTimeout(() => {
          router.push('/university/certificates');
        }, 3000);
      }
    } catch (error) {
      console.error('Issuance failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCertificateObjects = pendingCertificates.filter(cert => 
    selectedCertificates.includes(cert.id)
  );

  // Calculate review pagination
  const reviewTotalPages = Math.ceil(selectedCertificateObjects.length / reviewPageSize);
  const reviewStartIndex = (reviewPage - 1) * reviewPageSize;
  const reviewEndIndex = reviewStartIndex + reviewPageSize;
  const currentReviewCertificates = selectedCertificateObjects.slice(reviewStartIndex, reviewEndIndex);

  const handleReviewPageChange = (page) => {
    setReviewPage(page);
  };

  const handleReviewPageSizeChange = (newPageSize) => {
    setReviewPageSize(parseInt(newPageSize));
    setReviewPage(1); // Reset to first page when changing page size
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  // Define table columns for certificate selection
  const certificateColumns = [
    {
      key: 'select',
      header: '',
      render: (certificate) => (
        <Checkbox
          key={`checkbox-${certificate.id}`}
          checked={selectedCertificates.includes(certificate.id)}
          onCheckedChange={() => handleCertificateToggle(certificate.id)}
        />
      )
    },
    {
      key: 'certificate',
      header: 'Certificate',
      render: (certificate) => (
        <div className="flex-1">
          <div className="font-medium">{certificate.certificateTitle}</div>
          <div className="text-sm text-muted-foreground">
            {getStudentName(certificate.studentId)} • GPA: {certificate.gpa}
          </div>
        </div>
      )
    },
    {
      key: 'badges',
      header: 'Badges',
      render: (certificate) => (
        <div className="flex gap-1">
          {certificate.badgeTitles.length > 0 ? (
            certificate.badgeTitles.map((badge: any, index: any) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {badge}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}
        </div>
      )
    },
    {
      key: 'zkp',
      header: 'ZKP',
      render: (certificate) => (
        certificate.zkpEnabled ? (
          <Badge variant="outline" className="text-xs">
            ZKP Enabled
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">Disabled</span>
        )
      )
    }
  ];

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return selectedCertificates.length > 0;
      case 2:
        return selectedCertificates.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Certificates to Issue</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedCertificates.length === pendingCertificates.length && pendingCertificates.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            

            
            {pendingCertificates.length > 0 ? (
              <DataTable
                data={pendingCertificates}
                columns={certificateColumns}
                itemsPerPage={10}
                emptyMessage="No certificates ready for issuance."
                showPagination={true}
                showItemsPerPage={true}
              />
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  No certificates ready for issuance.
                </div>
              </div>
            )}
            
            {selectedCertificates.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="text-sm">
                  <strong>Selected Certificates:</strong> {selectedCertificates.length} of {pendingCertificates.length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  These certificates will be minted as compressed NFTs on Solana.
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Review Selected Certificates</Label>
              <div className="text-sm text-muted-foreground">
                Review the certificates that will be issued as cNFTs on Solana.
              </div>
            </div>
            
            {/* Review Pagination Controls */}
            {selectedCertificateObjects.length > 0 && reviewTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-4">
                <div className="flex items-center justify-between sm:justify-end space-x-2">
                  <p className="text-sm font-medium">Certificates per page</p>
                  <Select
                    value={reviewPageSize.toString()}
                    onValueChange={handleReviewPageSizeChange}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={reviewPageSize} />
                    </SelectTrigger>
                    <SelectContent side="bottom">
                      {[3, 5, 10, 15].map((size: any) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end space-x-2">
                  <p className="text-sm font-medium">Go to page</p>
                  <Select
                    value={reviewPage.toString()}
                    onValueChange={(value) => handleReviewPageChange(parseInt(value))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={reviewPage} />
                    </SelectTrigger>
                    <SelectContent side="bottom">
                      {Array.from({ length: reviewTotalPages }, (_, i) => i + 1).map((page: any) => (
                        <SelectItem key={page} value={page.toString()}>
                          {page}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {currentReviewCertificates.map((certificate: any) => (
                <Card key={certificate.id} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="font-medium">{certificate.certificateTitle}</div>
                      <div className="text-sm text-muted-foreground">
                        Student: {getStudentName(certificate.studentId)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        GPA: {certificate.gpa}
                      </div>
                      {certificate.badgeTitles.length > 0 && (
                        <div className="flex gap-1">
                          {certificate.badgeTitles.map((badge: any, index: any) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {certificate.zkpEnabled && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Zero-Knowledge Proof Enabled
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Review Pagination Navigation */}
            {selectedCertificateObjects.length > 0 && reviewTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
                {/* Summary */}
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing {reviewStartIndex + 1} to {Math.min(reviewEndIndex, selectedCertificateObjects.length)} of {selectedCertificateObjects.length} certificates
                </div>

                {/* Page Navigation */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex w-full sm:w-[100px] items-center justify-center text-sm font-medium">
                    Page {reviewPage} of {reviewTotalPages}
                  </div>
                  
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handleReviewPageChange(Math.max(1, reviewPage - 1))}
                          className={reviewPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {/* Hide page numbers on very small screens, show on sm and up */}
                      <div className="hidden sm:flex">
                        {(() => {
                          const pages = [];
                          const maxVisiblePages = 5;

                          if (reviewTotalPages <= maxVisiblePages) {
                            for (let i = 1; i <= reviewTotalPages; i++) {
                              pages.push(i);
                            }
                          } else {
                            if (reviewPage <= 3) {
                              for (let i = 1; i <= 4; i++) {
                                pages.push(i);
                              }
                              pages.push('ellipsis');
                              pages.push(reviewTotalPages);
                            } else if (reviewPage >= reviewTotalPages - 2) {
                              pages.push(1);
                              pages.push('ellipsis');
                              for (let i = reviewTotalPages - 3; i <= reviewTotalPages; i++) {
                                pages.push(i);
                              }
                            } else {
                              pages.push(1);
                              pages.push('ellipsis');
                              for (let i = reviewPage - 1; i <= reviewPage + 1; i++) {
                                pages.push(i);
                              }
                              pages.push('ellipsis');
                              pages.push(reviewTotalPages);
                            }
                          }

                          return pages.map((page: any, index: any) => (
                            <PaginationItem key={index}>
                              {page === 'ellipsis' ? (
                                <PaginationEllipsis />
                              ) : (
                                <PaginationLink
                                  onClick={() => handleReviewPageChange(page)}
                                  isActive={reviewPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ));
                        })()}
                      </div>

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handleReviewPageChange(Math.min(reviewTotalPages, reviewPage + 1))}
                          className={reviewPage === reviewTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <div className="text-sm">
                <strong>Total Certificates to Issue:</strong> {selectedCertificateObjects.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Each certificate will be minted as a compressed NFT (cNFT) on Solana using Metaplex Bubblegum v2.
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {issuanceResults ? (
              <div className="space-y-4">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Issuance Complete!</h3>
                  <p className="text-muted-foreground">
                    Successfully issued {issuanceResults.success.length} certificates
                  </p>
                </div>
                
                {issuanceResults.success.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Successfully Issued</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {issuanceResults.success.map((result: any, index: any) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <span className="text-sm">{getStudentName(result.data.certificate.studentId)}</span>
                            <Badge variant="default" className="text-xs">
                              {result.data.mintLog.mintAddress.slice(0, 8)}...
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {issuanceResults.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {issuanceResults.errors.map((error: any, index: any) => (
                          <div key={index} className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm">
                            Certificate {error.certificateId}: {error.error}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Ready to Mint cNFTs</h3>
                  <p className="text-muted-foreground">
                    Click the button below to mint {selectedCertificateObjects.length} certificates as compressed NFTs on Solana.
                  </p>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
                  <div className="text-sm">
                    <strong>Important:</strong> This action will:
                  </div>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Mint compressed NFTs on Solana blockchain</li>
                    <li>• Generate IPFS metadata for each certificate</li>
                    <li>• Create permanent, immutable records</li>
                    <li>• Require Solana transaction fees</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/university/certificates">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Certificates
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Issue Certificates</h1>
          <p className="text-muted-foreground">Mint pending certificates as compressed NFTs on Solana.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {steps.map((step: any, index: any) => {
              const IconComponent = step.icon;
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= step.id 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-muted-foreground text-muted-foreground'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <IconComponent className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(steps[currentStep - 1].icon, { className: "h-5 w-5" })}
            Step {currentStep}: {steps[currentStep - 1].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        <div className="flex gap-2">
          {currentStep < steps.length ? (
            <Button 
              onClick={nextStep}
              disabled={!isStepValid()}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={loading || selectedCertificates.length === 0}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Minting Certificates...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Issue & Mint Certificates
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 