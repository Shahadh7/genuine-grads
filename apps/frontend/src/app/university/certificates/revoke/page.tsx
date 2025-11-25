'use client';
import React from "react";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { graphqlClient } from '@/lib/graphql-client';
import { 
  ArrowLeft, 
  Search, 
  XCircle, 
  AlertTriangle,
  User,
  Award,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  // Add props here
}

export default function RevokeCertificatePage(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<any>('');
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [reason, setReason] = useState<any>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    const term = String(searchTerm).trim();
    if (!term) {
      setSearchError('Enter a certificate number, mint address, or student identifier to search.');
      setSelectedCertificate(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSelectedCertificate(null);

    try {
      const response = await graphqlClient.getCertificates({ search: term, limit: 1 });

      if (response.errors?.length) {
        throw new Error(response.errors[0]?.message ?? 'Search failed');
      }

      const certificate = response.data?.certificates?.[0] ?? null;
      if (!certificate) {
        setSearchError('No certificates matched your search criteria.');
        return;
      }

      setSelectedCertificate(certificate);
    } catch (err: any) {
      setSearchError(err?.message ?? 'Failed to search certificates. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedCertificate) {
      toast({
        title: 'Select a certificate',
        description: 'Search for a certificate before attempting to revoke it.',
        variant: 'destructive',
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Provide a detailed reason for revoking this certificate.',
        variant: 'destructive',
      });
      return;
    }

    if (!adminPassword.trim()) {
      toast({
        title: 'Administrator password required',
        description: 'Enter your password to authorize the revocation.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await graphqlClient.revokeCertificate({
        certificateId: selectedCertificate.id,
        reason: reason.trim(),
        adminPassword: adminPassword,
      });

      if (response.errors?.length) {
        throw new Error(response.errors[0]?.message ?? 'Failed to revoke certificate');
      }

      toast({
        title: 'Certificate revoked',
        description: `Certificate ${selectedCertificate.certificateNumber ?? selectedCertificate.id} has been marked as revoked.`,
      });

      router.push('/university/certificates');
    } catch (err: any) {
      toast({
        title: 'Revocation failed',
        description: err?.message ?? 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          <h1 className="text-3xl font-bold">Revoke Certificate</h1>
          <p className="text-muted-foreground">Revoke an issued NFT certificate.</p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Certificate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Certificate Number, Student, or Mint Address</Label>
              <Input
                id="search"
                placeholder="Enter certificate number, student email, or mint address"
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="flex items-center gap-2" disabled={searching}>
                {searching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
          {searchError && (
            <p className="text-sm text-destructive">
              {searchError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Certificate Details */}
      {selectedCertificate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certificate Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-3">Student Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Name:</strong> {selectedCertificate.student?.fullName ?? 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono"><strong>Student #:</strong> {selectedCertificate.student?.studentNumber ?? 'N/A'}</span>
                  </div>
                  {selectedCertificate.student?.walletAddress && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        <strong>Wallet:</strong> {formatWalletAddress(selectedCertificate.student.walletAddress)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Certificate Information</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Certificate #:</strong> {selectedCertificate.certificateNumber ?? selectedCertificate.id}</div>
                  <div><strong>Badge Title:</strong> {selectedCertificate.badgeTitle}</div>
                  {selectedCertificate.degreeType && (
                    <div><strong>Degree Type:</strong> {selectedCertificate.degreeType}</div>
                  )}
                  {selectedCertificate.description && (
                    <div><strong>Description:</strong> {selectedCertificate.description}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Issue Date:</strong> {formatDate(selectedCertificate.issuedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Certificate ID</h4>
              <div className="bg-muted p-3 rounded-lg">
                <code className="text-sm font-mono break-all">{selectedCertificate.id}</code>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <h4 className="font-medium">Status</h4>
                <Badge variant={selectedCertificate.revoked ? 'destructive' : 'secondary'}>
                  {selectedCertificate.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Mint Address</h4>
                <div className="bg-muted p-3 rounded-lg">
                  <code className="text-sm font-mono break-all">
                    {selectedCertificate.mintAddress ?? 'Not minted'}
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Warning: Certificate Revocation
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Revoking a certificate will permanently mark it as invalid on the blockchain. 
                    This action cannot be undone. Please ensure you have a valid reason for revocation.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Revocation *</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a detailed reason for revoking this certificate..."
                value={reason}
                onChange={(e: any) => setReason(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Administrator Password *</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Confirm your password to authorize the action"
                value={adminPassword}
                onChange={(e: any) => setAdminPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedCertificate(null);
                  setReason('');
                  setSearchTerm('');
                  setAdminPassword('');
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRevoke}
                disabled={!reason.trim() || !adminPassword.trim() || loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Revoking...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Revoke Certificate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Certificate Found */}
      {searchTerm && !selectedCertificate && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Certificate Not Found</p>
              <p>No certificate found with the provided ID or NIC. Please check your search term and try again.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
} 