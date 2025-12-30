'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchFromIPFS, getProxiedIPFSUrl } from '@/lib/ipfs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ExternalLink,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Award,
  Calendar,
  Building2,
  User,
  Hash,
  GraduationCap,
  Eye,
  Loader2,
  QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';

interface CertificateCardProps {
  certificate: {
    id: string;
    certificateNumber: string;
    badgeTitle: string;
    description?: string;
    degreeType?: string;
    mintAddress: string;
    merkleTreeAddress?: string;
    ipfsMetadataUri?: string;
    transactionSignature?: string;
    status: 'PENDING' | 'MINTED' | 'FAILED';
    issuedAt: string;
    revoked: boolean;
    revokedAt?: string;
    revocationReason?: string;
    metadata?: {
      image?: string;
      description?: string;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
      }>;
      properties?: {
        university?: string;
        studentName?: string;
        certificateNumber?: string;
        issueDate?: string;
        degreeType?: string;
        program?: string;
        gpa?: number;
      };
    };
  };
  onClick?: () => void;
}

export function CertificateCard({ certificate, onClick }: CertificateCardProps) {
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [certificateImageUrl, setCertificateImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch certificate image from IPFS metadata (same as verification page)
  useEffect(() => {
    const fetchCertificateImage = async () => {
      // First check if image is already in metadata
      if (certificate.metadata?.image) {
        // Use proxied URL to avoid CORS issues
        setCertificateImageUrl(getProxiedIPFSUrl(certificate.metadata.image));
        return;
      }

      // Otherwise, fetch from IPFS metadata URI
      if (certificate.ipfsMetadataUri) {
        try {
          setLoadingImage(true);
          // Use proxy to fetch metadata to avoid CORS issues
          const metadata = await fetchFromIPFS(certificate.ipfsMetadataUri);
          if (metadata.image) {
            // Use proxied URL for the image as well
            setCertificateImageUrl(getProxiedIPFSUrl(metadata.image));
          }
        } catch (err) {
          // Failed to fetch certificate image from IPFS
          console.error('Failed to fetch certificate image:', err);
        } finally {
          setLoadingImage(false);
        }
      }
    };

    fetchCertificateImage();
  }, [certificate.metadata, certificate.ipfsMetadataUri]);

  // Generate QR code when modal opens
  const generateQRCode = async () => {
    if (typeof window === 'undefined') return;

    const verificationUrl = `${window.location.origin}/verify/${certificate.certificateNumber}`;

    try {
      const dataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setShowQRCode(true);
    } catch (err) {
      // Failed to generate QR code
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `certificate-qr-${certificate.certificateNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = () => {
    switch (certificate.status) {
      case 'MINTED':
        return <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
  };

  const getStatusBadge = () => {
    if (certificate.revoked) {
      return (
        <Badge variant="destructive" className="ml-auto">
          Revoked
        </Badge>
      );
    }

    switch (certificate.status) {
      case 'MINTED':
        return (
          <Badge className="ml-auto bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900">
            Verified
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900">
            Processing
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="ml-auto bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900">
            Failed
          </Badge>
        );
    }
  };

  const universityName = certificate.metadata?.properties?.university;
  const studentName = certificate.metadata?.properties?.studentName;
  const program = certificate.metadata?.properties?.program;
  const gpa = certificate.metadata?.properties?.gpa;
  const issueDate = certificate.metadata?.properties?.issueDate || certificate.issuedAt;

  return (
    <>
      <Card
        className="overflow-hidden hover:shadow-xl transition-all duration-300 border hover:border-primary/50 cursor-pointer group"
        onClick={onClick}
      >
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Certificate Image Section */}
            <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6 flex items-center justify-center min-h-[300px]">
              {loadingImage ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="h-12 w-12 mb-4 animate-spin text-primary" />
                  <p className="text-sm">Loading certificate image...</p>
                </div>
              ) : certificateImageUrl && !imageError ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="relative w-full aspect-[1.414/1] max-w-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={certificateImageUrl}
                      alt={certificate.badgeTitle}
                      className="w-full h-full object-contain rounded-lg shadow-lg group-hover:scale-105 transition-transform duration-300"
                      onError={() => {
                        setImageError(true);
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullImage(true);
                      }}
                      className="absolute top-2 right-2 bg-background/90 hover:bg-background p-2 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 border border-border"
                      title="View full certificate"
                    >
                      <Eye className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Award className="h-24 w-24 mb-4" />
                  <p className="text-sm">
                    {!certificate.ipfsMetadataUri && !certificate.metadata
                      ? 'No metadata available'
                      : imageError
                      ? 'Failed to load image'
                      : 'Certificate Image'}
                  </p>
                  {imageError && certificateImageUrl && (
                    <p className="text-xs text-destructive mt-2 max-w-full truncate px-2">
                      {certificateImageUrl}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Certificate Details Section */}
            <div className="p-6 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon()}
                  <div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {certificate.badgeTitle}
                    </h3>
                    {certificate.degreeType && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        {certificate.degreeType}
                      </p>
                    )}
                  </div>
                </div>
                {getStatusBadge()}
              </div>

              {/* Details Grid */}
              <div className="space-y-3 flex-1">
                {universityName && (
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">University</p>
                      <p className="text-sm font-medium text-foreground">{universityName}</p>
                    </div>
                  </div>
                )}

                {studentName && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Student</p>
                      <p className="text-sm font-medium text-foreground">{studentName}</p>
                    </div>
                  </div>
                )}

                {program && (
                  <div className="flex items-start gap-2">
                    <Award className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Program</p>
                      <p className="text-sm font-medium text-foreground">{program}</p>
                    </div>
                  </div>
                )}

                {gpa !== undefined && (
                  <div className="flex items-start gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">GPA</p>
                      <p className="text-sm font-medium text-foreground">{gpa.toFixed(2)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Certificate Number</p>
                    <p className="text-sm font-mono text-foreground truncate">
                      {certificate.certificateNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Issued Date</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(issueDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {certificate.description && (
                  <p className="text-sm text-muted-foreground pt-2 border-t">
                    {certificate.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                {certificate.status === 'MINTED' && certificate.transactionSignature && (
                  <a
                    href={`https://solscan.io/tx/${certificate.transactionSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Solscan
                  </a>
                )}

                {certificateImageUrl && !imageError && (
                  <a
                    href={certificateImageUrl}
                    download={`certificate-${certificate.certificateNumber}.png`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-md transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download Image
                  </a>
                )}

                {certificate.status === 'MINTED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateQRCode();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-md transition-colors"
                  >
                    <QrCode className="h-3 w-3" />
                    Download QR
                  </button>
                )}

                {certificate.ipfsMetadataUri && (
                  <a
                    href={certificate.ipfsMetadataUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Metadata
                  </a>
                )}
              </div>

              {/* Revocation Notice */}
              {certificate.revoked && certificate.revocationReason && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    <strong>Revoked:</strong> {certificate.revocationReason}
                  </p>
                  {certificate.revokedAt && (
                    <p className="text-xs text-destructive/80 mt-1">
                      Revoked on: {new Date(certificate.revokedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Image Modal */}
      <Dialog open={showFullImage && !!certificateImageUrl} onOpenChange={setShowFullImage}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Certificate Image</DialogTitle>
            <DialogDescription>Full view of {certificate.badgeTitle}</DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <div className="relative w-full aspect-[1.414/1] bg-background rounded-lg shadow-2xl border border-border overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={certificateImageUrl || ''}
                alt={certificate.badgeTitle}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <a
                href={certificateImageUrl || ''}
                download={`certificate-${certificate.certificateNumber}.png`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors shadow-lg"
              >
                <Download className="h-4 w-4" />
                Download Certificate
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center gap-3">
              <QrCode className="h-8 w-8 text-purple-600" />
              <DialogTitle className="text-2xl">Certificate QR Code</DialogTitle>
            </div>
            <DialogDescription className="text-center">
              Scan or share this QR code to verify the certificate
            </DialogDescription>
          </DialogHeader>

          <div className="text-center space-y-6">
            <div className="bg-white p-6 rounded-lg inline-block">
              {qrCodeDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeDataUrl}
                  alt="Certificate QR Code"
                  className="w-64 h-64"
                />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-mono">
                {certificate.certificateNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {typeof window !== 'undefined' && `${window.location.origin}/verify/${certificate.certificateNumber}`}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={downloadQRCode}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-medium transition-colors shadow-lg"
              >
                <Download className="h-4 w-4" />
                Download QR Code
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
