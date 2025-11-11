'use client';
import React from "react"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, ArrowRight, Building, Mail } from 'lucide-react';

interface SuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  university: any;
}

const SuccessDialog = ({ isOpen, onClose, university }: SuccessDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-2xl border-orange-200 dark:border-orange-800">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-orange-800 dark:text-orange-200">
            Application Submitted!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <Badge variant="secondary" className="mb-2">
              {university?.status || 'PENDING_APPROVAL'}
            </Badge>
            
            <p className="text-muted-foreground">
              Your university application has been submitted and is pending review by our team.
            </p>
            
            {/* University Info */}
            <div className="p-4 bg-muted/50 rounded-lg text-left">
              <div className="flex items-center gap-2 mb-3">
                <Building className="h-4 w-4 text-primary" />
                <span className="font-medium">{university?.name}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Domain:</strong> {university?.domain}</p>
                <p><strong>Country:</strong> {university?.country}</p>
                {university?.walletAddress && (
                  <p><strong>Wallet:</strong> {university.walletAddress.slice(0, 4)}...{university.walletAddress.slice(-4)}</p>
                )}
              </div>
            </div>

            {/* Next Steps */}
            <div className="text-left space-y-2 pt-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                What happens next:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                <li>• Our team will review your application</li>
                <li>• You'll receive an email notification once approved</li>
                <li>• After approval, you can login and start issuing certificates</li>
              </ul>
            </div>

            <div className="pt-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  We've sent a confirmation email to <strong>{university?.admins?.[0]?.email || 'your email'}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              Back to Home
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuccessDialog; 