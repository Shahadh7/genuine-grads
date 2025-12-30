'use client';

import SolanaWalletProvider from '@/components/wallet/wallet-provider';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SolanaWalletProvider>
      <NotificationProvider role="admin">
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </NotificationProvider>
    </SolanaWalletProvider>
  );
}

