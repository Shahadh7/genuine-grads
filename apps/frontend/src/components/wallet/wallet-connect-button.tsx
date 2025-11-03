import React from "react"
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';
import { updateSession } from '@/lib/session';

const WalletConnectButton = ({ onWalletConnected }) => {
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = publicKey.toString();
      updateSession({ wallet: walletAddress });
      if (onWalletConnected) {
        onWalletConnected(walletAddress);
      }
    }
  }, [connected, publicKey, onWalletConnected]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
      {connected && publicKey && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Connected Wallet:</p>
          <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletConnectButton; 