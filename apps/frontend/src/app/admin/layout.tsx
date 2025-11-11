import SolanaWalletProvider from '@/components/wallet/wallet-provider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SolanaWalletProvider>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </SolanaWalletProvider>
  );
}

