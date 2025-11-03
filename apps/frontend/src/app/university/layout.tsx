'use client';

import React from "react";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/session';
import Sidebar from '@/components/university/sidebar';
import Topbar from '@/components/university/topbar';

interface Props {
  // Add props here
}

export default function UniversityLayout({children}): React.React.JSX.Element {
  const [session, setSession] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<any>(null);
  const [loading, setLoading] = useState<any>(true);
  const router = useRouter();

  useEffect(() => {
    const currentSession = getSession();
    console.log('University layout - current session:', currentSession);
    
    if (!currentSession || currentSession.role !== 'admin') {
      console.log('University layout - redirecting to login, session invalid:', currentSession);
      router.replace('/login');
      return;
    }
    
    console.log('University layout - session valid, setting session');
    setSession(currentSession);
    setWalletAddress(currentSession.wallet);
    setLoading(false);
  }, []); // Remove router from dependency array

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar session={session} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <Topbar session={session} walletAddress={walletAddress} />
        
        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 