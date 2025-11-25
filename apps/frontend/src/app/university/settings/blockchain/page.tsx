'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle,
  Database,
  Loader2,
  Network,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { graphqlClient } from '@/lib/graphql-client';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

type UniversityRecord = {
  id: string;
  name: string;
  walletAddress: string;
  websiteUrl?: string | null;
  merkleTreeAddress?: string | null;
  treeConfigAddress?: string | null;
  collectionAddress?: string | null;
  collectionPDA?: string | null;
};

const defaultTreeConfig = {
  maxDepth: '14',
  maxBufferSize: '64',
  isPublic: true,
};

const formatPublicKey = (value?: string | null) => {
  if (!value) return '—';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
};

export default function BlockchainSettingsPage(): React.ReactElement {
  const toast = useToast();
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [university, setUniversity] = useState<UniversityRecord | null>(null);

  const [treeForm, setTreeForm] = useState(defaultTreeConfig);
  const [collectionForm, setCollectionForm] = useState({
    name: '',
    symbol: '',
    description: '',
    image: null as File | null
  });

  const [creatingTree, setCreatingTree] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);

  const loadUniversity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await graphqlClient.getMyUniversity();
      const record = response.data?.myUniversity;
      if (!record) {
        throw new Error('Unable to load university data');
      }

      setUniversity(record);

      setCollectionForm((prev) => ({
        name: prev.name || `${record.name} Certificates`,
        symbol: prev.symbol,
        description: prev.description || `Official certificate collection from ${record.name}. Verify academic credentials instantly on the Solana blockchain using compressed NFT technology.`,
        image: prev.image,
      }));
    } catch (err: any) {
      console.error('[BlockchainSettings] Failed to load university', err);
      setError(err?.message ?? 'Unable to load university data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUniversity();
  }, [loadUniversity]);

  const hasTree = Boolean(university?.merkleTreeAddress);
  const hasCollection = Boolean(university?.collectionAddress);

  const handleCreateTree = async () => {
    if (!university) return;
    if (!publicKey || !signTransaction) {
      toast.error({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to create a Merkle tree.',
      });
      return;
    }

    if (!treeForm.maxDepth || !treeForm.maxBufferSize) {
      toast.error({
        title: 'Missing details',
        description: 'Please provide both max depth and buffer size.',
      });
      return;
    }

    const maxDepth = Number(treeForm.maxDepth);
    const maxBuffer = Number(treeForm.maxBufferSize);

    if (!Number.isFinite(maxDepth) || maxDepth <= 0 || !Number.isFinite(maxBuffer) || maxBuffer <= 0) {
      toast.error({
        title: 'Invalid values',
        description: 'Depth and buffer size must be positive numbers.',
      });
      return;
    }

    setCreatingTree(true);

    try {
      // Step 1: Create transaction via backend
      const response = await graphqlClient.createMerkleTree({
        universityId: university.id,
        maxDepth,
        maxBufferSize: maxBuffer,
        isPublic: treeForm.isPublic,
      });

      const txData = response.data?.createMerkleTree;
      if (!txData) {
        const errorMessage = response.errors?.[0]?.message ?? 'Failed to create transaction';
        throw new Error(errorMessage);
      }

      toast.success({
        title: 'Transaction created',
        description: 'Please sign the transaction in your wallet.',
      });

      // Step 2: Deserialize and sign transaction
      const txBuffer = bs58.decode(txData.transaction);
      const transaction = VersionedTransaction.deserialize(txBuffer);

      const signedTx = await signTransaction(transaction);

      // Step 3: Send and confirm transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      toast.success({
        title: 'Transaction sent',
        description: 'Waiting for confirmation...',
      });

      // Step 4: Confirm transaction via backend
      await graphqlClient.confirmTransaction({
        signature,
        operationType: 'create_tree',
        metadata: txData.metadata,
      });

      toast.success({
        title: 'Merkle tree created!',
        description: 'Your Merkle tree has been successfully created on-chain.',
      });

      await loadUniversity();
    } catch (err: any) {
      console.error('[BlockchainSettings] create tree failed', err);
      toast.error({
        title: 'Creation failed',
        description: err?.message ?? 'Unable to create Merkle tree.',
      });
    } finally {
      setCreatingTree(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!university) return;
    if (!publicKey || !signTransaction) {
      toast.error({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to create a collection.',
      });
      return;
    }

    if (!collectionForm.name.trim() || !collectionForm.image) {
      toast.error({
        title: 'Missing details',
        description: 'Collection name and image are required.',
      });
      return;
    }

    setCreatingCollection(true);

    try {
      // Convert image to base64
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(collectionForm.image!);
      });

      toast.success({
        title: 'Uploading image',
        description: 'Uploading collection image to IPFS...',
      });

      // Step 1: Create transaction via backend (includes image upload and metadata creation)
      const response = await graphqlClient.createCollection({
        universityId: university.id,
        name: collectionForm.name.trim(),
        imageBase64,
        symbol: collectionForm.symbol.trim() || undefined,
        description: collectionForm.description.trim() || undefined,
      });

      const txData = response.data?.createCollection;
      if (!txData) {
        const message = response.errors?.[0]?.message ?? 'Failed to create transaction';
        throw new Error(message);
      }

      toast.success({
        title: 'Transaction created',
        description: 'Please sign the transaction in your wallet.',
      });

      // Step 2: Deserialize and sign transaction
      const txBuffer = bs58.decode(txData.transaction);
      const transaction = VersionedTransaction.deserialize(txBuffer);

      const signedTx = await signTransaction(transaction);

      // Step 3: Send and confirm transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      toast.success({
        title: 'Transaction sent',
        description: 'Waiting for confirmation...',
      });

      // Step 4: Confirm transaction via backend
      await graphqlClient.confirmTransaction({
        signature,
        operationType: 'create_collection',
        metadata: txData.metadata,
      });

      toast.success({
        title: 'Collection created!',
        description: 'Your MPL Core collection has been successfully created on-chain.',
      });

      await loadUniversity();
    } catch (err: any) {
      console.error('[BlockchainSettings] create collection failed', err);
      toast.error({
        title: 'Creation failed',
        description: err?.message ?? 'Unable to create collection.',
      });
    } finally {
      setCreatingCollection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-4 text-center">
        <XCircle className="h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-xl font-semibold">Failed to load blockchain settings</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => loadUniversity()} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!university) {
    return null;
  }

  const walletConnected = Boolean(publicKey);
  const walletMatches = publicKey?.toBase58() === university.walletAddress;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Network className="h-5 w-5 text-primary" />
          <span>University ID: {university.id}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Blockchain Setup</h1>
        <p className="max-w-2xl text-muted-foreground">
          Initialize and manage the Merkle tree and MPL Core collection that power your university&apos;s
          GenuineGrads credentials.
        </p>
      </div>

      {!walletConnected && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Please connect your wallet to create blockchain resources.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {walletConnected && !walletMatches && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800 dark:text-red-200">
                Connected wallet ({formatPublicKey(publicKey?.toBase58())}) does not match university wallet (
                {formatPublicKey(university.walletAddress)}). Please connect the correct wallet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Current On-chain Configuration</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => loadUniversity()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Merkle Tree
                </h3>
                <Badge variant={hasTree ? 'default' : 'secondary'}>
                  {hasTree ? 'Configured' : 'Not Created'}
                </Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tree Address</span>
                  <span className="font-mono text-xs">{formatPublicKey(university.merkleTreeAddress)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tree Config</span>
                  <span className="font-mono text-xs">{formatPublicKey(university.treeConfigAddress)}</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  MPL Core Collection
                </h3>
                <Badge variant={hasCollection ? 'default' : 'secondary'}>
                  {hasCollection ? 'Configured' : 'Not Created'}
                </Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Collection Address</span>
                  <span className="font-mono text-xs">{formatPublicKey(university.collectionAddress)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Collection PDA</span>
                  <span className="font-mono text-xs">{formatPublicKey(university.collectionPDA)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Merkle Tree Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxDepth">Max Depth</Label>
                <Input
                  id="maxDepth"
                  type="number"
                  min={1}
                  value={treeForm.maxDepth}
                  onChange={(event) => setTreeForm((prev) => ({ ...prev, maxDepth: event.target.value }))}
                  disabled={hasTree}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxBufferSize">Max Buffer Size</Label>
                <Input
                  id="maxBufferSize"
                  type="number"
                  min={1}
                  value={treeForm.maxBufferSize}
                  onChange={(event) => setTreeForm((prev) => ({ ...prev, maxBufferSize: event.target.value }))}
                  disabled={hasTree}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border bg-muted/30 p-3">
              <Checkbox
                id="isPublic"
                checked={treeForm.isPublic}
                onCheckedChange={(checked) =>
                  setTreeForm((prev) => ({ ...prev, isPublic: checked === true }))
                }
                disabled={hasTree}
              />
              <Label htmlFor="isPublic" className="cursor-pointer">
                Make Merkle tree public (required for cNFT minting)
              </Label>
            </div>
            <Button onClick={handleCreateTree} disabled={creatingTree || hasTree || !walletConnected || !walletMatches} className="w-full">
              {creatingTree ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : hasTree ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Tree Created
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Merkle Tree
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              MPL Core Collection Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="collectionName">Collection Name *</Label>
                <Input
                  id="collectionName"
                  value={collectionForm.name}
                  onChange={(event) =>
                    setCollectionForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  disabled={hasCollection}
                  placeholder="e.g., University Name Certificates"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collectionSymbol">Collection Symbol (Optional)</Label>
                <Input
                  id="collectionSymbol"
                  value={collectionForm.symbol}
                  onChange={(event) => {
                    const value = event.target.value;
                    // Only allow uppercase alphanumeric, limit to 10 chars
                    if (value.length <= 10) {
                      setCollectionForm((prev) => ({ ...prev, symbol: value.toUpperCase() }));
                    }
                  }}
                  disabled={hasCollection}
                  placeholder="e.g., CERT"
                  maxLength={10}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Max 10 characters. Leave empty to auto-generate from university name.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collectionDescription">Collection Description (Optional)</Label>
                <Textarea
                  id="collectionDescription"
                  value={collectionForm.description}
                  onChange={(event) =>
                    setCollectionForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  disabled={hasCollection}
                  placeholder="Official certificate collection from..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for default description. Will be visible in NFT marketplaces.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collectionImage">Collection Image *</Label>
                <Input
                  id="collectionImage"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setCollectionForm((prev) => ({ ...prev, image: file }));
                  }}
                  disabled={hasCollection}
                  className="cursor-pointer"
                />
                {collectionForm.image && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {collectionForm.image.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  This image will be uploaded to IPFS and used for your collection metadata
                </p>
              </div>
            </div>
            <Button onClick={handleCreateCollection} disabled={creatingCollection || hasCollection || !walletConnected || !walletMatches} className="w-full">
              {creatingCollection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : hasCollection ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Collection Created
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Collection
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Once both the Merkle tree and MPL Core collection are finalized on-chain, your university can mint
            certificates directly from the dashboard.
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle className={cn('h-4 w-4', hasTree && hasCollection ? 'text-emerald-500' : 'text-amber-500')} />
            {hasTree && hasCollection
              ? 'Both prerequisites detected. You are ready to mint certificates.'
              : 'Complete both setup steps above to enable certificate minting.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
