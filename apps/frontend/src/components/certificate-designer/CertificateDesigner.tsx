'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CertificateData {
  studentName: string;
  certificateTitle: string;
  universityName: string;
  degreeType: string;
  issueDate: string;
  description: string;
  logoUrl?: string;
}

interface CertificateDesignerProps {
  onExport?: (imageDataUrl: string) => void;
  initialData?: Partial<CertificateData>;
}

export function CertificateDesigner({
  onExport,
  initialData = {},
}: CertificateDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<CertificateData>({
    studentName: initialData.studentName || '',
    certificateTitle: initialData.certificateTitle || '',
    universityName: initialData.universityName || '',
    degreeType: initialData.degreeType || 'Bachelor',
    issueDate: initialData.issueDate || new Date().toISOString().split('T')[0],
    description: initialData.description || '',
    logoUrl: initialData.logoUrl,
  });

  const [template, setTemplate] = useState<string>('classic');

  const updateData = (field: keyof CertificateData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 850;

    // Background
    if (template === 'classic') {
      // Classic template - gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1e3a8a');
      gradient.addColorStop(1, '#3b82f6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Border
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
      
      // Inner border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
    } else {
      // Modern template - clean white with accent
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Accent bar
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, canvas.width, 120);
    }

    // Title
    ctx.fillStyle = template === 'classic' ? '#ffffff' : '#1f2937';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    const yOffset = template === 'classic' ? 150 : 200;
    ctx.fillText('Certificate of Achievement', canvas.width / 2, yOffset);

    // Subtitle
    ctx.fillStyle = template === 'classic' ? '#fbbf24' : '#6b7280';
    ctx.font = '24px sans-serif';
    ctx.fillText('This is to certify that', canvas.width / 2, yOffset + 80);

    // Student name
    ctx.fillStyle = template === 'classic' ? '#ffffff' : '#1f2937';
    ctx.font = 'italic bold 56px serif';
    ctx.fillText(data.studentName || '[Student Name]', canvas.width / 2, yOffset + 160);

    // Line under name
    ctx.strokeStyle = template === 'classic' ? '#fbbf24' : '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, yOffset + 180);
    ctx.lineTo(900, yOffset + 180);
    ctx.stroke();

    // Achievement text
    ctx.fillStyle = template === 'classic' ? '#ffffff' : '#374151';
    ctx.font = '24px sans-serif';
    ctx.fillText(
      `has successfully completed ${data.degreeType} in`,
      canvas.width / 2,
      yOffset + 230
    );

    // Certificate title
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(data.certificateTitle || '[Certificate Title]', canvas.width / 2, yOffset + 280);

    // University name
    ctx.font = '28px sans-serif';
    ctx.fillText(`from ${data.universityName || '[University Name]'}`, canvas.width / 2, yOffset + 330);

    // Date
    ctx.fillStyle = template === 'classic' ? '#fbbf24' : '#6b7280';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Issued on: ${data.issueDate}`, canvas.width / 2, yOffset + 380);

    // Signature section
    ctx.fillStyle = template === 'classic' ? '#ffffff' : '#1f2937';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Authorized Signature', 250, canvas.height - 120);
    ctx.beginPath();
    ctx.moveTo(250, canvas.height - 130);
    ctx.lineTo(500, canvas.height - 130);
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.fillText('University Seal', canvas.width - 250, canvas.height - 120);
    ctx.beginPath();
    ctx.moveTo(canvas.width - 500, canvas.height - 130);
    ctx.lineTo(canvas.width - 250, canvas.height - 130);
    ctx.stroke();

    // Blockchain badge (bottom right corner)
    ctx.fillStyle = template === 'classic' ? '#fbbf24' : '#3b82f6';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔗 Verified on Blockchain', canvas.width - 150, canvas.height - 40);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageDataUrl = canvas.toDataURL('image/png');
    if (onExport) {
      onExport(imageDataUrl);
    }

    // Also download
    const link = document.createElement('a');
    link.download = `certificate-${data.studentName.replace(/\s+/g, '-')}.png`;
    link.href = imageDataUrl;
    link.click();
  };

  // Regenerate on data change
  useEffect(() => {
    generateCertificate();
  }, [data, template]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Designer Form */}
      <Card className="order-2 lg:order-1">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Certificate Designer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="template" className="text-sm sm:text-base">Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="template" className="h-12 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="studentName" className="text-sm sm:text-base">Student Name</Label>
            <Input
              id="studentName"
              value={data.studentName}
              onChange={(e) => updateData('studentName', e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label htmlFor="certificateTitle" className="text-sm sm:text-base">Certificate Title</Label>
            <Input
              id="certificateTitle"
              value={data.certificateTitle}
              onChange={(e) => updateData('certificateTitle', e.target.value)}
              placeholder="Computer Science"
            />
          </div>

          <div>
            <Label htmlFor="universityName" className="text-sm sm:text-base">University Name</Label>
            <Input
              id="universityName"
              value={data.universityName}
              onChange={(e) => updateData('universityName', e.target.value)}
              placeholder="Example University"
            />
          </div>

          <div>
            <Label htmlFor="degreeType" className="text-sm sm:text-base">Degree Type</Label>
            <Select
              value={data.degreeType}
              onValueChange={(value) => updateData('degreeType', value)}
            >
              <SelectTrigger id="degreeType" className="h-12 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bachelor">Bachelor</SelectItem>
                <SelectItem value="Master">Master</SelectItem>
                <SelectItem value="PhD">PhD</SelectItem>
                <SelectItem value="Diploma">Diploma</SelectItem>
                <SelectItem value="Certificate">Certificate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="issueDate" className="text-sm sm:text-base">Issue Date</Label>
            <Input
              id="issueDate"
              type="date"
              value={data.issueDate}
              onChange={(e) => updateData('issueDate', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm sm:text-base">Description (Optional)</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => updateData('description', e.target.value)}
              placeholder="Additional details..."
              rows={3}
              className="resize-none"
            />
          </div>

          <Button onClick={handleExport} className="w-full min-h-touch">
            Export Certificate
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="order-1 lg:order-2">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="scroll-container border rounded-lg overflow-auto">
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ maxHeight: '600px', objectFit: 'contain', minWidth: '300px' }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

