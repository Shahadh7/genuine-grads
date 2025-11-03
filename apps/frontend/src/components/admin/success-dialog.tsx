'use client';
import React from "react"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, ArrowRight, Building } from 'lucide-react';

const SuccessDialog = ({ isOpen, onClose, universityData, onRedirect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-2xl border-green-200 dark:border-green-800">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-green-800 dark:text-green-200">
            Registration Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Your university has been successfully registered with GenuineGrads.
            </p>
            
            {/* University Info */}
            <div className="p-4 bg-muted/50 rounded-lg text-left">
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-4 w-4 text-primary" />
                <span className="font-medium">{universityData?.name}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Domain: {universityData?.domain}</p>
                <p>Admin: {universityData?.admin}</p>
                <p>Wallet: {universityData?.wallet?.slice(0, 4)}...{universityData?.wallet?.slice(-4)}</p>
              </div>
            </div>

            {/* Next Steps */}
            <div className="text-left space-y-2">
              <h4 className="font-medium text-sm">Next Steps:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Check your email for verification link
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Complete email verification
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Sign in to your dashboard
                </li>
              </ul>
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
              onClick={onRedirect}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              Go to Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuccessDialog; 