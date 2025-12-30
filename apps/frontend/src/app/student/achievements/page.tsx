'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Trophy,
  Award,
  CheckCircle,
  Clock,
  Shield,
  FileKey,
  Loader2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getSession } from '@/lib/session';
import { graphqlClient } from '@/lib/graphql-client';
import { ZkStatusBadge, getZkStatus, type ZkStatus } from '@/components/zk';
import { deriveSecrets } from '@/lib/zk/deterministic-secrets';
import { computeCommitment, ComputedCommitment } from '@/lib/zk/commitment';
import { generateProofPack } from '@/lib/zk/proof-generator';

interface Certificate {
  id: string;
  certificateNumber: string;
  badgeTitle: string;
  mintAddress: string;
  status: string;
  issuedAt: string;
  revoked?: boolean;
  ipfsMetadataUri?: string;
  metadata?: {
    properties?: {
      achievements?: string[];
    };
  };
}

interface ZkAchievementStatus {
  achievementCode: string;
  achievementTitle: string;
  zkEnabled: boolean;
  hasCommitment: boolean;
  hasProof: boolean;
  lastVerifiedAt: string | null;
  verificationCount: number;
}

interface AchievementWithZk {
  code: string;
  title: string;
  certificateId: string;
  certificateName: string;
  mintAddress: string;
  zkStatus: ZkStatus;
  hasCommitment: boolean;
  hasProof: boolean;
  verificationCount: number;
}

interface ProgressState {
  stage: string;
  percent: number;
  currentAchievement?: string;
}

export default function AchievementsPage(): React.JSX.Element {
  const router = useRouter();
  const wallet = useWallet();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [achievements, setAchievements] = useState<AchievementWithZk[]>([]);
  const [filteredAchievements, setFilteredAchievements] = useState<AchievementWithZk[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [zkFilter, setZkFilter] = useState<string>('all');

  // ZK operation states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState(false);
  const [selectedAchievements, setSelectedAchievements] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession || currentSession.role !== 'student') {
      router.push('/login');
      return;
    }
    setSession(currentSession);
    loadData();
  }, [router]);

  useEffect(() => {
    let filtered = achievements;

    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.certificateName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (zkFilter !== 'all') {
      filtered = filtered.filter(a => a.zkStatus === zkFilter);
    }

    setFilteredAchievements(filtered);
  }, [achievements, searchTerm, zkFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch certificates and achievements in parallel
      const [certResponse, achievementsResponse] = await Promise.all([
        graphqlClient.myCertificates(),
        graphqlClient.myAchievements(),
      ]);

      if (certResponse.errors) {
        throw new Error(certResponse.errors[0]?.message || 'Failed to load certificates');
      }

      const certs = (certResponse.data?.myCertificates || []).filter(
        (c: Certificate) => c.status === 'MINTED' && !c.revoked
      );
      setCertificates(certs);

      // Get student achievements from myAchievements query
      const studentAchievements = achievementsResponse.data?.myAchievements || [];
      console.log('Student achievements from API:', studentAchievements);

      // Extract achievements from certificates and fetch ZK statuses
      const allAchievements: AchievementWithZk[] = [];

      for (const cert of certs) {
        // Get achievements from multiple sources
        let achievementTitles: string[] = [];

        // 1. Parse metadata if it's a string
        let metadata = cert.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            console.error('Failed to parse metadata JSON:', e);
          }
        }

        // 2. Try different possible locations for achievements in metadata
        if (metadata?.properties?.achievements && Array.isArray(metadata.properties.achievements)) {
          achievementTitles = metadata.properties.achievements;
        } else if (metadata?.achievements && Array.isArray(metadata.achievements)) {
          achievementTitles = metadata.achievements;
        } else if (metadata?.attributes && Array.isArray(metadata.attributes)) {
          // Look for achievements in attributes array
          const achievementAttr = metadata.attributes.find(
            (attr: any) => attr.trait_type === 'achievements' || attr.trait_type === 'Achievements'
          );
          if (achievementAttr?.value) {
            if (Array.isArray(achievementAttr.value)) {
              achievementTitles = achievementAttr.value;
            } else if (typeof achievementAttr.value === 'string') {
              achievementTitles = achievementAttr.value.split(',').map((s: string) => s.trim());
            }
          }
        }

        // 3. Try fetching from IPFS if still no achievements
        if (achievementTitles.length === 0 && cert.ipfsMetadataUri) {
          try {
            const metaResponse = await fetch(cert.ipfsMetadataUri);
            const ipfsMetadata = await metaResponse.json();

            if (ipfsMetadata?.properties?.achievements) {
              achievementTitles = ipfsMetadata.properties.achievements;
            } else if (ipfsMetadata?.achievements) {
              achievementTitles = ipfsMetadata.achievements;
            }
          } catch (e) {
            console.error('Failed to fetch metadata from IPFS:', e);
          }
        }

        // 4. Fallback: Use achievements from myAchievements that have matching achievement titles
        // This links student achievements to certificates through title (AchievementCatalog uses 'title' not 'badgeTitle')
        if (achievementTitles.length === 0 && studentAchievements.length > 0) {
          // Use all student achievements for this certificate - AchievementCatalog has 'title' field
          achievementTitles = studentAchievements
            .map((sa: any) => sa.achievement?.title)
            .filter(Boolean);
        }

        console.log(`Certificate ${cert.badgeTitle} achievements:`, achievementTitles);

        // Fetch ZK status for this certificate
        let zkStatuses: ZkAchievementStatus[] = [];
        if (cert.mintAddress) {
          try {
            const zkResponse = await graphqlClient.myZkCertificateStatus(cert.mintAddress);
            zkStatuses = zkResponse.data?.myZkCertificateStatus?.achievements || [];
          } catch (e) {
            console.error('Failed to fetch ZK status:', e);
          }
        }

        // Map achievements with ZK status
        for (const title of achievementTitles) {
          // Avoid duplicates
          const existingAch = allAchievements.find(
            a => a.code === title && a.mintAddress === cert.mintAddress
          );
          if (existingAch) continue;

          const zkStatus = zkStatuses.find(z => z.achievementCode === title);

          allAchievements.push({
            code: title,
            title: title,
            certificateId: cert.id,
            certificateName: cert.badgeTitle,
            mintAddress: cert.mintAddress,
            zkStatus: zkStatus ? getZkStatus(zkStatus) : 'not_enabled',
            hasCommitment: zkStatus?.hasCommitment || false,
            hasProof: zkStatus?.hasProof || false,
            verificationCount: zkStatus?.verificationCount || 0,
          });
        }
      }

      // Only add standalone achievements if there's at least one valid (minted, non-revoked) certificate
      // This ensures achievements are only shown when the student has active certificates
      if (allAchievements.length === 0 && studentAchievements.length > 0 && certs.length > 0) {
        for (const sa of studentAchievements) {
          // AchievementCatalog uses 'title' field
          const title = sa.achievement?.title;
          if (!title) continue;

          // Find a certificate to link to (first minted one)
          const linkedCert = certs[0];

          allAchievements.push({
            code: title,
            title: title,
            certificateId: linkedCert?.id || '',
            certificateName: linkedCert?.badgeTitle || 'Unknown Certificate',
            mintAddress: linkedCert?.mintAddress || '',
            zkStatus: 'not_enabled',
            hasCommitment: false,
            hasProof: false,
            verificationCount: 0,
          });
        }
      }

      console.log('All achievements loaded:', allAchievements);
      setAchievements(allAchievements);
      setFilteredAchievements(allAchievements);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const total = achievements.length;
    const withProofs = achievements.filter(a => a.hasProof).length;
    const withCommitments = achievements.filter(a => a.hasCommitment && !a.hasProof).length;
    const notEnabled = achievements.filter(a => !a.hasCommitment).length;
    // Total number of employer verifications across all achievements
    const verified = achievements.reduce((sum, a) => sum + a.verificationCount, 0);
    return { total, withProofs, withCommitments, notEnabled, verified };
  };

  const toggleAchievementSelection = (achievementKey: string) => {
    setSelectedAchievements(prev => {
      const next = new Set(prev);
      if (next.has(achievementKey)) {
        next.delete(achievementKey);
      } else {
        next.add(achievementKey);
      }
      return next;
    });
  };

  const selectAllWithoutProofs = () => {
    const withoutProofs = achievements
      .filter(a => !a.hasProof)
      .map(a => `${a.mintAddress}:${a.code}`);
    setSelectedAchievements(new Set(withoutProofs));
  };

  const clearSelection = () => {
    setSelectedAchievements(new Set());
  };

  const handleEnableAndGenerateProofs = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setOperationError('Please connect your wallet first');
      return;
    }

    // Security: Validate connected wallet matches student's registered wallet
    if (session?.walletAddress && wallet.publicKey.toBase58() !== session.walletAddress) {
      setOperationError('Connected wallet does not match your registered wallet. Please connect the wallet associated with your student account.');
      return;
    }

    if (selectedAchievements.size === 0) {
      setOperationError('Please select at least one achievement');
      return;
    }

    setIsProcessing(true);
    setShowProgressDialog(true);
    setOperationError(null);
    setOperationSuccess(false);
    setProgress({ stage: 'Requesting wallet signature...', percent: 0 });

    try {
      // Group selected achievements by certificate
      const byCertificate = new Map<string, { mintAddress: string; achievements: string[] }>();

      for (const key of selectedAchievements) {
        const [mintAddress, achievementCode] = key.split(':');
        if (!byCertificate.has(mintAddress)) {
          byCertificate.set(mintAddress, { mintAddress, achievements: [] });
        }
        byCertificate.get(mintAddress)!.achievements.push(achievementCode);
      }

      let totalProcessed = 0;
      const totalToProcess = selectedAchievements.size;

      for (const [mintAddress, data] of byCertificate) {
        // Step 1: Derive secrets
        setProgress({
          stage: `Deriving secrets for certificate...`,
          percent: Math.round((totalProcessed / totalToProcess) * 100)
        });

        const secrets = await deriveSecrets(wallet, mintAddress);

        // Step 2: Compute and register commitments
        setProgress({
          stage: 'Computing commitments...',
          percent: Math.round((totalProcessed / totalToProcess) * 100) + 5
        });

        const achievementsWithCommitments: Array<{
          code: string;
          commitment: ComputedCommitment;
        }> = [];

        for (const achievementCode of data.achievements) {
          const commitment = await computeCommitment({
            credentialId: mintAddress,
            studentSecret: secrets.studentSecret,
            salt: secrets.salt,
            achievementCode,
          });
          achievementsWithCommitments.push({ code: achievementCode, commitment });
        }

        // Register commitments
        setProgress({
          stage: 'Registering commitments...',
          percent: Math.round((totalProcessed / totalToProcess) * 100) + 10
        });

        const commitmentInputs = achievementsWithCommitments.map(a => ({
          credentialId: mintAddress,
          achievementCode: a.code,
          commitment: a.commitment.commitment,
        }));

        const commitmentResponse = await graphqlClient.registerAchievementCommitmentsBatch(commitmentInputs);

        if (commitmentResponse.errors) {
          throw new Error(commitmentResponse.errors[0].message);
        }

        // Step 3: Generate proofs
        const proofs = await generateProofPack({
          credentialId: mintAddress,
          studentSecret: secrets.studentSecret,
          salt: secrets.salt,
          achievements: achievementsWithCommitments,
          onProgress: (achievementCode, prg) => {
            setProgress({
              stage: prg.message,
              percent: Math.round((totalProcessed / totalToProcess) * 100) +
                Math.round((prg.percent / 100) * (80 / byCertificate.size)),
              currentAchievement: achievementCode,
            });
          },
        });

        // Step 4: Upload proofs
        setProgress({
          stage: 'Uploading proofs...',
          percent: Math.round((totalProcessed / totalToProcess) * 100) + 90
        });

        const proofInputs = proofs.map(proof => ({
          credentialId: mintAddress,
          achievementCode: proof.achievementCode,
          proof: proof.proof,
          publicSignals: proof.publicSignals,
        }));

        const proofResponse = await graphqlClient.uploadAchievementProofsBatch(proofInputs);

        if (proofResponse.errors) {
          throw new Error(proofResponse.errors[0].message);
        }

        totalProcessed += data.achievements.length;
      }

      setProgress({ stage: 'Complete!', percent: 100 });
      setOperationSuccess(true);

      // Reload data to show updated status
      await loadData();
      setSelectedAchievements(new Set());

    } catch (err: any) {
      console.error('Error generating proofs:', err);
      setOperationError(err.message || 'Failed to generate proofs');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseDialog = () => {
    setShowProgressDialog(false);
    setProgress(null);
    setOperationError(null);
    setOperationSuccess(false);
  };

  if (!session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600">Loading achievements...</p>
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
            <CardTitle className="text-2xl font-bold">Error Loading Achievements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Achievements</h1>
          <p className="text-muted-foreground">Manage ZK proofs for your academic achievements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Achievements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withProofs}</p>
                <p className="text-sm text-muted-foreground">ZK Proofs Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.verified}</p>
                <p className="text-sm text-muted-foreground">Verified by Employers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.notEnabled}</p>
                <p className="text-sm text-muted-foreground">Pending ZK Setup</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ZK Generation Panel */}
      {stats.notEnabled > 0 && wallet.connected && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate ZK Proofs
            </CardTitle>
            <CardDescription>
              Enable privacy-preserving verification for your achievements. Employers can verify your achievements without seeing your private data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {selectedAchievements.size} achievement{selectedAchievements.size !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-muted-foreground">
                  Select achievements below to generate ZK proofs
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllWithoutProofs}>
                  Select All Pending
                </Button>
                {selectedAchievements.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {selectedAchievements.size > 0 && (
              <Button
                onClick={handleEnableAndGenerateProofs}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileKey className="h-4 w-4 mr-2" />
                    Generate ZK Proofs for {selectedAchievements.size} Achievement{selectedAchievements.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Wallet not connected warning */}
      {!wallet.connected && stats.notEnabled > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Connect your wallet to generate ZK proofs for your achievements
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet mismatch warning */}
      {wallet.connected && wallet.publicKey && session?.walletAddress && wallet.publicKey.toBase58() !== session.walletAddress && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Connected wallet does not match your registered wallet
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Please connect the wallet associated with your student account to generate ZK proofs.
                  Expected: {session.walletAddress.slice(0, 8)}...{session.walletAddress.slice(-8)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search achievements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={zkFilter} onValueChange={setZkFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by ZK status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_enabled">Not Enabled</SelectItem>
                <SelectItem value="proof_available">Proof Available</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setZkFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredAchievements.length} of {achievements.length} achievements
        </p>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {stats.withProofs} With Proofs
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            {stats.notEnabled} Pending
          </Badge>
        </div>
      </div>

      {/* Achievements Grid */}
      {filteredAchievements.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAchievements.map((achievement) => {
            const key = `${achievement.mintAddress}:${achievement.code}`;
            const isSelected = selectedAchievements.has(key);
            const canSelect = !achievement.hasProof;

            return (
              <Card
                key={key}
                className={`overflow-hidden transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-primary border-primary'
                    : canSelect
                      ? 'hover:border-primary/50'
                      : ''
                }`}
                onClick={() => canSelect && toggleAchievementSelection(key)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        achievement.hasProof
                          ? 'bg-green-500/10'
                          : 'bg-primary/10'
                      }`}>
                        {achievement.hasProof ? (
                          <Shield className="h-6 w-6 text-green-500" />
                        ) : (
                          <Award className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{achievement.title}</CardTitle>
                        <CardDescription className="truncate">{achievement.certificateName}</CardDescription>
                      </div>
                    </div>
                    {canSelect && (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/30'
                      }`}>
                        {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ZK Status:</span>
                    <ZkStatusBadge
                      status={achievement.zkStatus}
                      verificationCount={achievement.verificationCount > 0 ? achievement.verificationCount : undefined}
                    />
                  </div>

                  {achievement.hasProof && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        <span>ZK proof ready for verification</span>
                      </div>
                      {achievement.verificationCount > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Verified {achievement.verificationCount} time{achievement.verificationCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {!achievement.hasProof && !achievement.hasCommitment && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Select to generate ZK proof
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No achievements found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || zkFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'You don\'t have any achievements yet. They will appear here once your certificates are issued.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {operationSuccess ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  ZK Proofs Generated Successfully
                </span>
              ) : operationError ? (
                <span className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  Generation Failed
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FileKey className="w-5 h-5" />
                  Generating ZK Proofs
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {operationSuccess
                ? 'Your ZK proofs are ready. Employers can now verify your achievements privately.'
                : operationError
                ? operationError
                : 'Please keep this window open. This may take a few moments.'}
            </DialogDescription>
          </DialogHeader>

          {progress && !operationError && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{progress.stage}</span>
                  <span className="text-muted-foreground">{progress.percent}%</span>
                </div>
                <Progress value={progress.percent} className="h-2" />
              </div>

              {progress.currentAchievement && !operationSuccess && (
                <div className="text-sm text-center text-muted-foreground">
                  Processing: <strong>{progress.currentAchievement}</strong>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              {operationSuccess || operationError ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
