'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Share2, 
  Download,
  QrCode
} from 'lucide-react';

export default function CertificateCard({ certificate, onView, onShare, onDownload, onShowQR }) {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const handleShare = () => {
    const url = `https://genuinegrads.xyz/verify?asset=${certificate.asset_id}`;
    copyToClipboard(url);
    if (onShare) onShare(certificate);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg line-clamp-2">{certificate.title}</CardTitle>
          <Badge variant={certificate.status === 'valid' ? 'default' : 'destructive'}>
            {certificate.status === 'valid' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
            {certificate.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center space-x-2">
          <Building2 className="h-4 w-4" />
          <span>{certificate.university}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Course:</span>
            <span>{certificate.course}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GPA:</span>
            <span className="font-medium">{certificate.gpa}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Issued:</span>
            <span>{new Date(certificate.issued_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Asset ID:</span>
            <span className="font-mono text-xs">{certificate.asset_id.slice(0, 8)}...</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button size="sm" className="flex-1" onClick={() => onView && onView(certificate)}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDownload && onDownload(certificate)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onShowQR && onShowQR(certificate)}>
            <QrCode className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 