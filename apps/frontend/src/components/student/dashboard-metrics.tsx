'use client';
import React from "react"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Trophy, Shield, Wallet } from 'lucide-react';

interface Props {
  // Add props here
}

export default function DashboardMetrics({metrics}): React.JSX.Element {
  const { 
    totalCertificates = 0, 
    totalUniversities = 0, 
    totalAchievements = 0, 
    claimedAchievements = 0,
    totalVerifications = 0,
    walletConnected = false,
    walletAddress = ''
  } = metrics;

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Certificates</CardTitle>
          <Award className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{totalCertificates}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Across {totalUniversities} universities
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Achievements</CardTitle>
          <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{totalAchievements}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {claimedAchievements} claimed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Verifications</CardTitle>
          <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{totalVerifications}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Times your certs were verified
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Wallet Status</CardTitle>
          <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-xl sm:text-2xl font-bold ${walletConnected ? 'text-green-600' : 'text-red-600'}`}>
            {walletConnected ? 'Connected' : 'Disconnected'}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {walletConnected 
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`
              : 'Please connect your wallet'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 