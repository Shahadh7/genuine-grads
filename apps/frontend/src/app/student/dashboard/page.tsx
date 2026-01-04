'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { graphqlClient } from '@/lib/graphql-client';
import { FileText, Award, User, Loader2, AlertCircle, Ban } from 'lucide-react';
import Link from 'next/link';

interface StudentData {
  id: string;
  fullName: string;
  email: string;
  studentNumber: string;
  program?: string;
  department?: string;
  walletAddress?: string;
  certificates: any[];
  enrollments: any[];
  achievements: any[];
}

export default function StudentDashboard(): React.JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const response = await graphqlClient.meStudent();

      if (response.errors) {
        throw new Error(response.errors[0]?.message || 'Failed to load student data');
      }

      if (response.data?.meStudent) {
        setStudentData(response.data.meStudent);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <CardTitle className="text-2xl font-bold">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600">{error}</p>
            <button
              onClick={loadStudentData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allCertificates = studentData?.certificates || [];
  // Only count certificates that are MINTED and not revoked as active
  const activeCertificates = allCertificates.filter(
    (cert: any) => cert.status === 'MINTED' && cert.revoked !== true
  );
  const revokedCertificates = allCertificates.filter((cert: any) => cert.revoked === true);
  const certificatesCount = activeCertificates.length;
  const revokedCount = revokedCertificates.length;

  // Only count achievements if student has at least one active (minted, non-revoked) certificate
  // Achievements are only valid when attached to valid certificates
  const hasActiveCertificates = activeCertificates.length > 0;
  const studentAchievementsCount = hasActiveCertificates ? (studentData?.achievements?.length || 0) : 0;
  const enrollmentAchievementsCount = hasActiveCertificates
    ? (studentData?.enrollments || []).reduce(
        (count: number, enrollment: any) => count + (enrollment.achievements?.length || 0),
        0
      )
    : 0;
  const achievementsCount = studentAchievementsCount + enrollmentAchievementsCount;
  const enrollmentsCount = studentData?.enrollments?.length || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-sm border border-primary/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          Welcome back, {studentData?.fullName || 'Student'}!
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
          Your academic credentials dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/student/certificates">
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-primary/30 hover:shadow-xl transition-all duration-500 group cursor-pointer">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 inline-block group-hover:scale-110 transition-transform">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-1 sm:mb-2">{certificatesCount}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Active {certificatesCount === 1 ? 'Certificate' : 'Certificates'}
            </p>
          </div>
        </Link>

        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-red-500/30 hover:shadow-xl transition-all duration-500 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/10 inline-block group-hover:scale-110 transition-transform">
              <Ban className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-500 mb-1 sm:mb-2">{revokedCount}</div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Revoked {revokedCount === 1 ? 'Certificate' : 'Certificates'}
          </p>
        </div>

        <Link href="/student/achievements">
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-primary/30 hover:shadow-xl transition-all duration-500 group cursor-pointer">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 inline-block group-hover:scale-110 transition-transform">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-1 sm:mb-2">{achievementsCount}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {achievementsCount === 1 ? 'Achievement' : 'Achievements'} earned
            </p>
          </div>
        </Link>

        <Link href="/student/account">
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-primary/30 hover:shadow-xl transition-all duration-500 group cursor-pointer">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 inline-block group-hover:scale-110 transition-transform">
                <User className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-1 sm:mb-2">{enrollmentsCount}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {enrollmentsCount === 1 ? 'Course' : 'Courses'} enrolled
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Certificates */}
      {certificatesCount > 0 && (
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-500">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Recent Certificates
          </h2>
          <div className="space-y-2 sm:space-y-3">
            {activeCertificates.slice(0, 3).map((cert: any) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-3 sm:p-4 border border-border/50 rounded-xl sm:rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm sm:text-base truncate">{cert.badgeTitle}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">{cert.certificateNumber}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                      cert.status === 'MINTED'
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                        : cert.status === 'PENDING'
                        ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                    }`}
                  >
                    {cert.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {certificatesCount > 3 && (
            <Link
              href="/student/certificates"
              className="block text-center text-primary hover:text-primary/80 mt-4 sm:mt-6 text-xs sm:text-sm font-semibold transition-colors"
            >
              View all {certificatesCount} certificates →
            </Link>
          )}
        </div>
      )}

      {/* No certificates message */}
      {certificatesCount === 0 && (
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
          <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-primary/30" />
          <p className="text-base sm:text-lg font-semibold text-foreground mb-1 sm:mb-2">No certificates issued yet</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Your certificates will appear here once they are issued</p>
        </div>
      )}
    </div>
  );
}

