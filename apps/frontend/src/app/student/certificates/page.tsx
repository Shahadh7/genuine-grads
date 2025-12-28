'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { graphqlClient } from '@/lib/graphql-client';
import { CertificateCard } from '@/components/certificates/CertificateCard';
import {
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Certificate {
  id: string;
  certificateNumber: string;
  badgeTitle: string;
  description?: string;
  degreeType?: string;
  mintAddress: string;
  merkleTreeAddress?: string;
  ipfsMetadataUri?: string;
  transactionSignature?: string;
  status: 'PENDING' | 'MINTED' | 'FAILED';
  issuedAt: string;
  revoked: boolean;
  revokedAt?: string;
  revocationReason?: string;
  metadata?: {
    image?: string;
    description?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
    properties?: {
      university?: string;
      studentName?: string;
      certificateNumber?: string;
      issueDate?: string;
      degreeType?: string;
      program?: string;
      gpa?: number;
    };
  };
}

interface HeliusAsset {
  id: string;
  content: {
    metadata: {
      name: string;
      description?: string;
      attributes?: Array<{
        trait_type: string;
        value: string;
      }>;
    };
    links?: {
      image?: string;
    };
  };
  compression: {
    compressed: boolean;
  };
}

export default function StudentCertificatesPage(): React.JSX.Element {
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [heliusAssets, setHeliusAssets] = useState<HeliusAsset[]>([]);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);

      // Load from database
      const dbResponse = await graphqlClient.myCertificates();
      if (dbResponse.errors) {
        throw new Error(dbResponse.errors[0]?.message || 'Failed to load certificates');
      }

      const dbCerts = dbResponse.data?.myCertificates || [];
      // Filter out revoked certificates - students should not see revoked certs
      const activeCerts = dbCerts.filter((cert: Certificate) => cert.revoked !== true);
      setCertificates(activeCerts);

      // Load from Helius DAS API if wallet is connected
      if (publicKey) {
        await loadHeliusCertificates(publicKey.toBase58());
      }
    } catch (err: any) {
      console.error('Failed to load certificates:', err);
      setError(err.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const loadHeliusCertificates = async (walletAddress: string) => {
    try {
      const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      if (!heliusApiKey) {
        console.warn('Helius API key not configured');
        return;
      }

      const url = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'student-certificates',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: walletAddress,
            page: 1,
            limit: 1000,
            displayOptions: {
              showFungible: false,
              showNativeBalance: false,
            },
          },
        }),
      });

      const data = await response.json();

      if (data.result?.items) {
        // Filter for compressed NFTs (cNFTs) that look like certificates
        const cNFTs = data.result.items.filter((asset: any) => {
          return asset.compression?.compressed === true;
        });
        setHeliusAssets(cNFTs);
      }
    } catch (err) {
      console.error('Failed to load Helius assets:', err);
      // Don't throw - this is supplementary data
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600">Loading your certificates...</p>
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
            <CardTitle className="text-2xl font-bold">Error Loading Certificates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600">{error}</p>
            <button
              onClick={loadCertificates}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Certificates</h1>
          <p className="text-gray-600 mt-1">
            View and manage your blockchain-verified credentials
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {certificates.length} {certificates.length === 1 ? 'certificate' : 'certificates'} found
        </div>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Certificates Yet</h3>
            <p className="text-gray-600">
              Your certificates will appear here once they are issued by your university
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {certificates.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} />
          ))}
        </div>
      )}

      {/* Helius Assets Section */}
      {heliusAssets.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">All NFTs in Wallet</h2>
          <p className="text-gray-600 mb-4">
            {heliusAssets.length} compressed NFT{heliusAssets.length !== 1 ? 's' : ''} found via Helius DAS API
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {heliusAssets.slice(0, 12).map((asset) => (
              <Card key={asset.id}>
                <CardContent className="p-4">
                  <p className="font-medium truncate">{asset.content?.metadata?.name || 'Unnamed NFT'}</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono truncate">{asset.id}</p>
                  {asset.content?.metadata?.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {asset.content.metadata.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

