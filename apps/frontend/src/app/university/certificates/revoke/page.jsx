'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mockCertificates } from '@/lib/mock-data-clean';
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

export default function RevokeCertificatePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    const cert = mockCertificates.find(c => 
      c.id.toLowerCase() === searchTerm.toLowerCase() ||
      c.studentNIC.toLowerCase() === searchTerm.toLowerCase()
    );
    setSelectedCertificate(cert || null);
  };

  const handleRevoke = async () => {
    if (!selectedCertificate || !reason.trim()) return;
    
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);
    router.push('/university/certificates');
  };

  const formatDate = (dateString) => {
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
              <Label htmlFor="search">Certificate ID or Student NIC</Label>
              <Input
                id="search"
                placeholder="Enter certificate ID or student NIC"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
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
                    <span><strong>Name:</strong> {selectedCertificate.studentName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono"><strong>NIC:</strong> {selectedCertificate.studentNIC}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Certificate Information</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Title:</strong> {selectedCertificate.title}</div>
                  <div><strong>Program:</strong> {selectedCertificate.program}</div>
                  <div><strong>GPA:</strong> {selectedCertificate.gpa}</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Issue Date:</strong> {formatDate(selectedCertificate.issueDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Certificate ID</h4>
              <div className="bg-muted p-3 rounded-lg">
                <code className="text-sm font-mono break-all">{selectedCertificate.certificateId}</code>
              </div>
            </div>

            {selectedCertificate.badges.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Attached Badges</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCertificate.badges.map((badge, index) => (
                    <Badge key={index} variant="secondary">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
                onChange={(e) => setReason(e.target.value)}
                rows={4}
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
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRevoke}
                disabled={!reason.trim() || loading}
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