"use client"
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  GraduationCap,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Calendar,
  Building2,
  User,
  Award,
  Link2,
  Copy,
  Check,
  Image,
  Eye,
  Search
} from 'lucide-react'
import {
  CertificateVerification,
  verifyCertificate,
} from '@/lib/certificates'
import { graphqlClient } from '@/lib/graphql-client'
import { ZkStatusBadge, ZkVerifyButton, getZkStatus, ZkVerificationReportDialog, type ZkVerificationResult } from '@/components/zk'
import { fetchFromIPFS, getProxiedIPFSUrl } from '@/lib/ipfs'

interface ZkAchievementStatus {
  achievementCode: string;
  achievementTitle: string;
  zkEnabled: boolean;
  hasCommitment: boolean;
  hasProof: boolean;
  lastVerifiedAt: string | null;
  verificationCount: number;
}

interface ZkReportData {
  achievementCode: string;
  credentialId: string;
  result: ZkVerificationResult;
  verificationCount: number;
}

export default function CertificatePage(): React.JSX.Element {
  const params = useParams()
  const router = useRouter()
  const certificateId = params.certificateId

  const [verification, setVerification] = useState<CertificateVerification | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [certificateImageUrl, setCertificateImageUrl] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState<boolean>(false)
  const [zkStatuses, setZkStatuses] = useState<ZkAchievementStatus[]>([])
  const [zkVerificationResults, setZkVerificationResults] = useState<Record<string, ZkVerificationResult>>({})
  const [zkReportDialogOpen, setZkReportDialogOpen] = useState(false)
  const [zkReportData, setZkReportData] = useState<ZkReportData | null>(null)
  const hasLoadedRef = useRef<boolean>(false)
  const isLikelyMintAddress = (value: string) => /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(String(value))

  useEffect(() => {
    const loadCertificate = async () => {
      if (hasLoadedRef.current || !certificateId) return

      hasLoadedRef.current = true

      try {
        setLoading(true)
        setError(null)

        const identifier = String(certificateId)
        const params = isLikelyMintAddress(identifier)
          ? { mintAddress: identifier }
          : { certificateNumber: identifier }

        const result = await verifyCertificate(params)
        setVerification(result)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to verify certificate'
        setError(errorMessage)
        hasLoadedRef.current = false
      } finally {
        setLoading(false)
      }
    }

    loadCertificate()
  }, [certificateId])

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const getSolanaExplorerUrl = (address: string, type: 'account' | 'tx') => {
    return `https://explorer.solana.com/${type}/${address}?cluster=devnet`
  }

  const fetchCertificateImage = async (metadataUri: string) => {
    try {
      setLoadingImage(true)
      const metadata = await fetchFromIPFS(metadataUri)
      if (metadata.image) {
        setCertificateImageUrl(getProxiedIPFSUrl(metadata.image))
      }
    } catch (err) {
      console.error('Failed to fetch certificate image:', err)
    } finally {
      setLoadingImage(false)
    }
  }

  useEffect(() => {
    if (verification?.blockchainProof?.metadataUri) {
      fetchCertificateImage(verification.blockchainProof.metadataUri)
    }
  }, [verification])

  useEffect(() => {
    const fetchZkStatuses = async () => {
      if (!verification?.blockchainProof?.mintAddress || !verification.isValid) {
        return
      }

      try {
        const response = await graphqlClient.getZkAchievementStatuses(
          verification.blockchainProof.mintAddress
        )
        if (response.data?.getZkAchievementStatuses) {
          setZkStatuses(response.data.getZkAchievementStatuses)
        }
      } catch (err) {
        // Failed to fetch ZK statuses
      }
    }

    fetchZkStatuses()
  }, [verification])

  const handleZkVerification = (achievementCode: string, result: ZkVerificationResult) => {
    setZkVerificationResults(prev => ({
      ...prev,
      [achievementCode]: result
    }))
    if (result.verified) {
      setZkStatuses(prev => prev.map(status =>
        status.achievementCode === achievementCode
          ? { ...status, lastVerifiedAt: result.verifiedAt || new Date().toISOString(), verificationCount: status.verificationCount + 1 }
          : status
      ))
    }
  }

  const openZkReport = (achievementCode: string, credentialId: string) => {
    const result = zkVerificationResults[achievementCode]
    const status = zkStatuses.find(s => s.achievementCode === achievementCode)
    if (result) {
      setZkReportData({
        achievementCode,
        credentialId,
        result,
        verificationCount: status?.verificationCount || 1,
      })
      setZkReportDialogOpen(true)
    }
  }

  const getZkStatusForAchievement = (achievementTitle: string) => {
    const status = zkStatuses.find(s => s.achievementCode === achievementTitle)
    const verificationResult = zkVerificationResults[achievementTitle]

    if (verificationResult?.verified === false) {
      return 'failed'
    }
    if (status) {
      return getZkStatus(status)
    }
    return 'not_enabled'
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
            <div className="relative p-6 bg-muted/50 rounded-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-foreground">Verifying certificate...</p>
          <p className="mt-2 text-sm text-muted-foreground">Checking blockchain records</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:py-16">
        <div className="max-w-md mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/verify')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 p-8 sm:p-12 text-center">
              <div className="inline-flex p-4 bg-red-500/10 rounded-full mb-6">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Verification Failed
              </h2>
              <p className="text-muted-foreground mb-8 text-sm sm:text-base">
                {error}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => router.refresh()} className="order-2 sm:order-1">
                  Try Again
                </Button>
                <Button onClick={() => router.push('/verify')} className="order-1 sm:order-2">
                  New Search
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!verification) {
    return <></>
  }

  const { certificate, status, revocationInfo, blockchainProof } = verification
  const isRevoked = status === 'REVOKED' || revocationInfo?.isRevoked
  const isValid = verification.isValid && status === 'VALID'

  // Not found / Invalid state
  if (status === 'INVALID') {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:py-16">
        <div className="max-w-md mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/verify')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-8 sm:p-12 text-center">
              <div className="inline-flex p-4 bg-muted rounded-full mb-6">
                <Search className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Certificate Not Found
              </h2>
              <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
                We couldn&apos;t locate a certificate matching this identifier. Please verify the certificate number and try again.
              </p>
              <Button onClick={() => router.push('/verify')} className="w-full sm:w-auto">
                Try Another Certificate
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Revoked certificate state
  if (isRevoked) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/verify')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Status Banner */}
          <Card className="border-0 shadow-xl overflow-hidden mb-6">
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-xl shrink-0">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="destructive" className="mb-2">
                    REVOKED
                  </Badge>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    {certificate?.badgeTitle ?? 'Certificate Revoked'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    This certificate has been revoked by the issuing institution
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Revocation Details */}
          <Card className="border-0 shadow-lg mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Revocation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Revoked At</p>
                  <p className="text-sm font-medium">{formatDate(revocationInfo?.revokedAt)}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm font-medium">{revocationInfo?.reason ?? 'Not specified'}</p>
                </div>
              </div>
              {revocationInfo?.transactionSignature && (
                <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Revocation Transaction</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(revocationInfo.transactionSignature!, 'revokeTx')}
                      className="h-7 w-7 p-0"
                    >
                      {copied === 'revokeTx' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="font-mono text-xs break-all text-muted-foreground">
                    {revocationInfo.transactionSignature}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(getSolanaExplorerUrl(revocationInfo.transactionSignature!, 'tx'), '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View on Explorer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certificate Overview (minimal) */}
          {certificate && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Certificate Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Student</p>
                    <p className="text-sm font-medium">{certificate.studentName ?? 'Not provided'}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Institution</p>
                    <p className="text-sm font-medium">{certificate.university.name}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Issue Date</p>
                    <p className="text-sm font-medium">{formatDate(certificate.issueDate)}</p>
                  </div>
                  {certificate.degreeType && (
                    <div className="p-4 bg-muted/30 rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">Degree Type</p>
                      <p className="text-sm font-medium">{certificate.degreeType}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Valid certificate state
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/verify')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Status Banner */}
        <Card className="border-0 shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="p-3 sm:p-4 bg-green-500/10 rounded-xl shrink-0">
                <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge className="bg-green-600 hover:bg-green-700 mb-3">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  VERIFIED
                </Badge>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2 break-words">
                  {certificate?.badgeTitle ?? 'Certificate Verified'}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  This certificate is authentic and verified on the Solana blockchain
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Certificate Image */}
        {loadingImage && (
          <Card className="border-0 shadow-lg mb-6">
            <CardContent className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
              <p className="text-muted-foreground">Loading certificate image...</p>
            </CardContent>
          </Card>
        )}

        {certificateImageUrl && (
          <Card className="border-0 shadow-lg mb-6 overflow-hidden">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Certificate Image
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(certificateImageUrl, '_blank')}
              >
                <Eye className="h-3 w-3 mr-2" />
                Full Size
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="rounded-xl overflow-hidden bg-muted/30 border">
                <img
                  src={certificateImageUrl}
                  alt="Certificate"
                  className="w-full h-auto"
                  onError={() => setCertificateImageUrl(null)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Certificate details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Certificate Overview */}
            {certificate && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Certificate Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <User className="h-3.5 w-3.5" />
                        <span className="text-xs">Student Name</span>
                      </div>
                      <p className="text-sm font-semibold">{certificate.studentName ?? 'Not provided'}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="text-xs">Institution</span>
                      </div>
                      <p className="text-sm font-semibold">{certificate.university.name}</p>
                      {certificate.university.isVerified && (
                        <Badge variant="outline" className="mt-2 text-xs">✓ Verified</Badge>
                      )}
                    </div>
                    <div className="p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Award className="h-3.5 w-3.5" />
                        <span className="text-xs">Badge Title</span>
                      </div>
                      <p className="text-sm font-semibold">{certificate.badgeTitle}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs">Issue Date</span>
                      </div>
                      <p className="text-sm font-semibold">{formatDate(certificate.issueDate)}</p>
                    </div>
                    {certificate.degreeType && (
                      <div className="p-4 bg-muted/30 rounded-xl sm:col-span-2">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <GraduationCap className="h-3.5 w-3.5" />
                          <span className="text-xs">Degree Type</span>
                        </div>
                        <p className="text-sm font-semibold">{certificate.degreeType}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
            {certificate?.achievements && certificate.achievements.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Achievements & Honors
                    </CardTitle>
                    {zkStatuses.some(s => s.hasProof) && (
                      <Badge variant="outline" className="text-xs w-fit">
                        <Shield className="h-3 w-3 mr-1" />
                        ZK Available
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {certificate.achievements.map((achievement, index) => {
                      const zkStatus = getZkStatusForAchievement(achievement)
                      const hasProof = zkStatuses.find(s => s.achievementCode === achievement)?.hasProof
                      const verificationCount = zkStatuses.find(s => s.achievementCode === achievement)?.verificationCount || 0

                      return (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary rounded-lg shrink-0">
                              <Award className="h-3.5 w-3.5 text-primary-foreground" />
                            </div>
                            <span className="text-sm font-medium">{achievement}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 ml-11 sm:ml-0">
                            <ZkStatusBadge
                              status={zkStatus}
                              verificationCount={zkStatus === 'verified' ? verificationCount : undefined}
                            />
                            {hasProof && blockchainProof?.mintAddress && (
                              <ZkVerifyButton
                                credentialId={blockchainProof.mintAddress}
                                achievementCode={achievement}
                                onVerified={(result) => handleZkVerification(achievement, result)}
                                disabled={zkStatus === 'failed'}
                                showViewReport={!!zkVerificationResults[achievement]?.verified}
                                onViewReport={() => openZkReport(achievement, blockchainProof.mintAddress)}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Blockchain info */}
          <div className="space-y-6">
            {/* Blockchain Proof */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Blockchain Proof
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {blockchainProof ? (
                  <>
                    {blockchainProof.mintAddress && (
                      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Mint Address</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(blockchainProof.mintAddress!, 'mint')}
                            className="h-7 w-7 p-0"
                          >
                            {copied === 'mint' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <p className="font-mono text-xs break-all text-muted-foreground">
                          {blockchainProof.mintAddress}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(getSolanaExplorerUrl(blockchainProof.mintAddress!, 'account'), '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          View on Explorer
                        </Button>
                      </div>
                    )}
                    {blockchainProof.transactionSignature && (
                      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Transaction</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(blockchainProof.transactionSignature!, 'tx')}
                            className="h-7 w-7 p-0"
                          >
                            {copied === 'tx' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <p className="font-mono text-xs break-all text-muted-foreground">
                          {blockchainProof.transactionSignature}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(getSolanaExplorerUrl(blockchainProof.transactionSignature!, 'tx'), '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          View Transaction
                        </Button>
                      </div>
                    )}
                    {blockchainProof.metadataUri && (
                      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Metadata URI</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(blockchainProof.metadataUri!, 'metadata')}
                            className="h-7 w-7 p-0"
                          >
                            {copied === 'metadata' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <p className="font-mono text-xs break-all text-muted-foreground">
                          {blockchainProof.metadataUri}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(blockchainProof.metadataUri!, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          View Metadata
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No blockchain proof available.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Share */}
            {certificate && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    Share Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">
                    Share this link to allow others to verify this certificate.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        copyToClipboard(window.location.href, 'link')
                      }
                    }}
                  >
                    {copied === 'link' ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ZK Verification Report Dialog */}
      {zkReportData && (
        <ZkVerificationReportDialog
          open={zkReportDialogOpen}
          onOpenChange={setZkReportDialogOpen}
          achievementCode={zkReportData.achievementCode}
          credentialId={zkReportData.credentialId}
          verificationResult={zkReportData.result}
          studentName={certificate?.studentName}
          universityName={certificate?.university?.name}
          certificateTitle={certificate?.badgeTitle}
          verificationCount={zkReportData.verificationCount}
        />
      )}
    </div>
  )
}
