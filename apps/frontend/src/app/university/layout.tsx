'use client';

import { ReactNode } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import Sidebar from '@/components/university/sidebar';
import Topbar from '@/components/university/topbar';

export default function UniversityLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useRoleGuard(['university_admin']);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <Sidebar session={session} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar session={session} walletAddress={session.university?.walletAddress ?? null} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}