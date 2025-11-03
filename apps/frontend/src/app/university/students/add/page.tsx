'use client';
import React from "react";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { mockPrograms } from '@/lib/mock-data-clean';
import { studentsAPI } from '@/lib/api';
import { ArrowLeft, Save, UserPlus, GraduationCap, Award, Info } from 'lucide-react';
import Link from 'next/link';

interface Props {
  // Add props here
}

export default function AddStudentPage(): React.JSX.Element {
  const router = useRouter();
  const [formData, setFormData] = useState<any>({
    name: '',
    nic: '',
    email: '',
    program: '',
    walletAddress: '',
    achievements: ''
  });
  const [loading, setLoading] = useState<any>(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await studentsAPI.create({
        name: formData.name,
        nic: formData.nic,
        email: formData.email,
        program: formData.program,
        walletAddress: formData.walletAddress,
        achievements: formData.achievements
      });

      if (result.success) {
        router.push('/university/students');
      } else {
        // Handle errors
        console.error('Failed to create student:', result.errors);
        // In a real app, you would show these errors to the user
      }
    } catch (error) {
      console.error('Error creating student:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.name && formData.nic && formData.email && formData.program && formData.walletAddress;

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/university/students">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-muted/50">
              <ArrowLeft className="h-4 w-4" />
              Back to Students
            </Button>
          </Link>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
              <p className="text-muted-foreground text-lg">Register a new student in your institution</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                Student Information
              </CardTitle>
              <p className="text-muted-foreground">Fill in the student's basic information and academic details.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name and NIC Row */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter student's full name"
                      value={formData.name}
                      onChange={(e: any) => handleInputChange('name', e.target.value)}
                      className="h-11 bg-background/50 border-muted focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="nic" className="text-sm font-medium">
                      NIC Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="nic"
                      placeholder="Enter NIC number"
                      value={formData.nic}
                      onChange={(e: any) => handleInputChange('nic', e.target.value)}
                      className="h-11 bg-background/50 border-muted focus:border-primary"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter student's email address"
                    value={formData.email}
                    onChange={(e: any) => handleInputChange('email', e.target.value)}
                    className="h-11 bg-background/50 border-muted focus:border-primary"
                    required
                  />
                </div>

                {/* Program */}
                <div className="space-y-3">
                  <Label htmlFor="program" className="text-sm font-medium">
                    Program Enrolled <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={formData.program} 
                    onValueChange={(value) => handleInputChange('program', value)}
                    required
                  >
                    <SelectTrigger className="h-11 bg-background/50 border-muted focus:border-primary">
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPrograms.map((program: any) => (
                        <SelectItem key={program} value={program}>
                          {program}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Wallet Address */}
                <div className="space-y-3">
                  <Label htmlFor="walletAddress" className="text-sm font-medium">
                    Wallet Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="walletAddress"
                    placeholder="Enter student's Solana wallet address"
                    value={formData.walletAddress}
                    onChange={(e: any) => handleInputChange('walletAddress', e.target.value)}
                    className="h-11 bg-background/50 border-muted focus:border-primary font-mono text-sm"
                    required
                  />
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Info className="h-3 w-3" />
                    Student must have a connected Solana wallet to be registered
                  </p>
                </div>

                {/* Achievements */}
                <div className="space-y-3">
                  <Label htmlFor="achievements" className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    Achievements <Badge variant="secondary" className="text-xs">Optional</Badge>
                  </Label>
                  <Textarea
                    id="achievements"
                    placeholder="Enter any achievements, awards, or notable accomplishments"
                    value={formData.achievements}
                    onChange={(e: any) => handleInputChange('achievements', e.target.value)}
                    rows={4}
                    className="bg-background/50 border-muted focus:border-primary resize-none"
                  />
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Info className="h-3 w-3" />
                    Separate multiple achievements with commas
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t">
                  <Link href="/university/students" className="flex-1">
                    <Button type="button" variant="outline" className="w-full h-11">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={!isFormValid || loading}
                    className="flex-1 h-11 bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Registering Student...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Register Student
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Quick Info Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-primary" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    After registration, students will need to connect their Solana wallet to receive certificates.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    You can also use the bulk upload feature to register multiple students at once.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    All required fields are marked with an asterisk (*).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500/5 to-green-600/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Students</span>
                <Badge variant="secondary">1,247</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month</span>
                <Badge variant="default">+12</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Programs</span>
                <Badge variant="outline">8</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 