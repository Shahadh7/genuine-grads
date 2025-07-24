'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isUniversityPage = pathname?.startsWith('/university');
  
  return (
    <div className="min-h-screen flex flex-col">
      {!isUniversityPage && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      {!isUniversityPage && <Footer />}
    </div>
  );
} 