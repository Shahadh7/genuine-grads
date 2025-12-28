'use client';
import React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { 
  Wallet, 
  User, 
  Mail, 
  Building2, 
  Copy, 
  QrCode,
  Download,
  LogOut
} from 'lucide-react';

interface StudentData {
  name: string;
  email: string;
  nic: string;
  wallet: string;
  avatar?: string;
  universities: string[];
}

interface Props {
  student: StudentData;
  onLogout?: () => void;
  onShowQR?: () => void;
  onCopyWallet?: (wallet: string) => void;
}

export default function ProfileSidebar({
  student,
  onLogout,
  onShowQR,
  onCopyWallet
}: Props): React.JSX.Element {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    if (onCopyWallet) onCopyWallet(text);
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={student.avatar} />
              <AvatarFallback className="text-lg">
                {student.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{student.name}</h3>
              <p className="text-sm text-muted-foreground">Student</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{student.email}</p>
              </div>
            </div>
            
            <div>
              <Label className="text-sm text-muted-foreground">NIC Number</Label>
              <p className="font-medium">{student.nic}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Wallet</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Wallet Address</Label>
            <div className="flex items-center space-x-2 mt-1">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1 font-mono">
                {student.wallet}
              </code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(student.wallet)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button size="sm" className="flex-1" onClick={() => onShowQR && onShowQR()}>
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Universities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Universities</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {student.universities.map((university: string, index: number) => (
              <Badge key={index} variant="outline" className="mr-2 mb-2">
                {university}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            Update Profile
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Wallet className="h-4 w-4 mr-2" />
            Change Wallet
          </Button>
          <Button 
            variant="destructive" 
            className="w-full justify-start"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 