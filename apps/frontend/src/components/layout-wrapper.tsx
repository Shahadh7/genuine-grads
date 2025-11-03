'use client';
import React from "react"
import { usePathname } from 'next/navigation';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

interface Props {
  // Add props here
}

export default function LayoutWrapper({children}): React.React.JSX.Element {
  const pathname = usePathname();
  const isUniversityPage = pathname?.startsWith('/university');
  const isStudentPage = pathname?.startsWith('/student');
  const isProtectedPage = isUniversityPage || isStudentPage;
  
  return (
    <div className="min-h-screen flex flex-col">
      {!isProtectedPage && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      {!isProtectedPage && <Footer />}
    </div>
  );
} 