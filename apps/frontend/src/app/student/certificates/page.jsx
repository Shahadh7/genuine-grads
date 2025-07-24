'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  Share2, 
  Eye, 
  QrCode,
  FileText,
  Building2,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { getSession } from '@/lib/session';
import CertificateCard from '@/components/student/certificate-card';
import QRCodeDialog from '@/components/student/qr-code-dialog';
import { mockCertificates } from '@/lib/mock-student-data';

export default function CertificatesPage() {
  const [session, setSession] = useState(null);
  const [certificates, setCertificates] = useState(mockCertificates);
  const [filteredCertificates, setFilteredCertificates] = useState(mockCertificates);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [showQR, setShowQR] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession || currentSession.role !== 'student') {
      router.push('/login');
      return;
    }
    setSession(currentSession);
  }, [router]);

  useEffect(() => {
    let filtered = certificates;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(cert => 
        cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.university.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cert => cert.status === statusFilter);
    }

    // Apply university filter
    if (universityFilter !== 'all') {
      filtered = filtered.filter(cert => cert.university === universityFilter);
    }

    setFilteredCertificates(filtered);
  }, [certificates, searchTerm, statusFilter, universityFilter]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const shareCertificate = (assetId) => {
    const url = "https://genuinegrads.xyz/verify?asset=" + assetId;
    copyToClipboard(url);
  };

  const getUniversities = () => {
    return [...new Set(certificates.map(cert => cert.university))];
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Certificates</h1>
          <p className="text-muted-foreground">View and manage your academic certificates</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search certificates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={universityFilter} onValueChange={setUniversityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by university" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universities</SelectItem>
                {getUniversities().map(university => (
                  <SelectItem key={university} value={university}>
                    {university}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setUniversityFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredCertificates.length} of {certificates.length} certificates
        </p>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{certificates.filter(c => c.status === 'valid').length} Valid</Badge>
          <Badge variant="outline">{certificates.filter(c => c.status === 'expired').length} Expired</Badge>
          <Badge variant="outline">{certificates.filter(c => c.status === 'pending').length} Pending</Badge>
        </div>
      </div>

      {/* Certificates Grid */}
      {filteredCertificates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCertificates.map((cert) => (
            <CertificateCard
              key={cert.id}
              certificate={cert}
              onView={(cert) => console.log('View certificate:', cert)}
              onShare={(cert) => shareCertificate(cert.asset_id)}
              onDownload={(cert) => console.log('Download certificate:', cert)}
              onShowQR={(cert) => setShowQR(true)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No certificates found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || statusFilter !== 'all' || universityFilter !== 'all' 
                ? 'Try adjusting your filters to see more results.'
                : 'You don\'t have any certificates yet.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <QRCodeDialog
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          title="Certificate QR Code"
          value="https://genuinegrads.xyz/verify?asset=sample-asset-id"
          description="Share this QR code to allow others to verify this certificate"
        />
      )}
    </div>
  );
} 