'use client';
import React from "react"


import { Button } from '@/components/ui/button';
import { Copy, Download, XCircle, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';

interface Props {
  // Add props here
}

export default function QRCodeDialog({
  isOpen, 
  onClose, 
  title = "QR Code", 
  value, 
  description = "Scan this QR code to verify or view the content"
}: Props): React.JSX.Element {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const downloadQR = () => {
    const canvas = document.querySelector('#qr-code canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'qr-code.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <QrCode className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-white rounded-lg" id="qr-code">
            <QRCode
              value={value}
              size={200}
              level="M"
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground text-center mb-4">
          {description}
        </p>
        
        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={() => copyToClipboard(value)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={downloadQR}
          >
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} 