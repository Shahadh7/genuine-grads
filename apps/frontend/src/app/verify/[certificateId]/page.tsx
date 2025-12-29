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
  QrCode,
  FileText,
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
  Eye
} from 'lucide-react'
import {
  CertificateVerification,
  verifyCertificate,
} from '@/lib/certificates'
import { graphqlClient } from '@/lib/graphql-client'
import { ZkStatusBadge, ZkVerifyButton, getZkStatus, ZkVerificationReportDialog, type ZkVerificationResult } from '@/components/zk'

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
      // Prevent duplicate calls - only load once per certificateId
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
      } catch (err: any) {
        setError(err?.message || 'Failed to verify certificate')
        hasLoadedRef.current = false // Allow retry on error
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
      const response = await fetch(metadataUri)
      const metadata = await response.json()
      if (metadata.image) {
        setCertificateImageUrl(metadata.image)
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

  // Fetch ZK achievement statuses
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
        console.error('Failed to fetch ZK statuses:', err)
      }
    }

    fetchZkStatuses()
  }, [verification])

  // Handle ZK verification result
  const handleZkVerification = (achievementCode: string, result: ZkVerificationResult) => {
    setZkVerificationResults(prev => ({
      ...prev,
      [achievementCode]: result
    }))
    // Update ZK statuses to reflect the verification
    if (result.verified) {
      setZkStatuses(prev => prev.map(status =>
        status.achievementCode === achievementCode
          ? { ...status, lastVerifiedAt: result.verifiedAt || new Date().toISOString(), verificationCount: status.verificationCount + 1 }
          : status
      ))
    }
  }

  // Open ZK verification report dialog
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

  // Get ZK status for an achievement
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4 relative" />
              </div>
              <p className="text-muted-foreground text-lg">Verifying certificate...</p>
              <p className="text-sm text-muted-foreground/60 mt-2">Checking blockchain records</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/verify')}
              className="mb-8 hover:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Verification
            </Button>

            <Card className="border-0 shadow-2xl bg-gradient-to-br from-red-500/5 to-red-600/10">
              <CardContent className="pt-12 pb-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-4 bg-red-500/10 rounded-full">
                    <XCircle className="h-16 w-16 text-red-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-3">Verification Failed</h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  {error}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => router.refresh()} size="lg">
                    Try Again
                  </Button>
                  <Button onClick={() => router.push('/verify')} size="lg">
                    New Verification
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!verification) {
    return null
  }

  const { certificate, status, revocationInfo, blockchainProof } = verification
  const isRevoked = status === 'REVOKED' || revocationInfo?.isRevoked
  const isValid = verification.isValid && status === 'VALID'

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <Button
            variant="ghost"
            onClick={() => router.push('/verify')}
            className="mb-8 hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Verification
          </Button>

          {/* Status Banner */}
          <div className={`relative overflow-hidden rounded-2xl mb-8 ${
            isValid
              ? 'bg-gradient-to-r from-green-500/10 via-green-600/10 to-emerald-500/10 border-2 border-green-500/20'
              : isRevoked
              ? 'bg-gradient-to-r from-red-500/10 via-red-600/10 to-rose-500/10 border-2 border-red-500/20'
              : 'bg-gradient-to-r from-gray-500/10 via-gray-600/10 to-slate-500/10 border-2 border-gray-500/20'
          }`}>
            <div className="absolute inset-0 bg-grid-white/5"></div>
            <div className="relative p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    isValid ? 'bg-green-500/20' : isRevoked ? 'bg-red-500/20' : 'bg-gray-500/20'
                  }`}>
                    {isValid ? (
                      <Shield className="h-8 w-8 text-green-600" />
                    ) : isRevoked ? (
                      <XCircle className="h-8 w-8 text-red-600" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <Badge
                      variant={isValid ? 'default' : 'destructive'}
                      className={`mb-3 text-sm px-4 py-1 ${
                        isValid ? 'bg-green-600 hover:bg-green-700' : ''
                      }`}
                    >
                      {isValid ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
                      {status}
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                      {certificate?.badgeTitle ?? 'Certificate Verification'}
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      {isValid
                        ? 'This certificate has been verified on the Solana blockchain'
                        : isRevoked
                        ? 'This certificate has been revoked by the issuing institution'
                        : 'Certificate verification status unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Image Preview */}
          {certificateImageUrl && status !== 'INVALID' && (
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-purple-500/5 to-blue-500/10 mb-8 overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-purple-500/5 to-blue-500/5">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Image className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="text-xl">Certificate Image</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(certificateImageUrl, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Size
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="relative rounded-xl overflow-hidden bg-background/50 border-2 border-muted shadow-inner">
                  <img
                    src={certificateImageUrl}
                    alt="Certificate"
                    className="w-full h-auto object-contain"
                    onError={() => {
                      console.error('Failed to load certificate image')
                      setCertificateImageUrl(null)
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {loadingImage && status !== 'INVALID' && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500/5 to-blue-500/10 mb-8">
              <CardContent className="p-12">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                  <p className="text-muted-foreground">Loading certificate image...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {status === 'INVALID' ? (
            <Card className="border-2 border-dashed border-red-300/50 shadow-xl">
              <CardContent className="pt-12 pb-8 text-center space-y-6">
                <div className="p-4 bg-red-500/10 rounded-full w-fit mx-auto">
                  <AlertTriangle className="h-16 w-16 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-3">Certificate Not Found</h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    We could not locate a certificate matching this identifier. Please confirm the certificate number
                    or mint address and try again.
                  </p>
                </div>
                <Button onClick={() => router.push('/verify')} size="lg" className="mt-4">
                  Try Another Certificate
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Certificate Overview */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-muted/5">
                  <CardHeader className="border-b bg-muted/30">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      Certificate Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {certificate ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            Student Name
                          </div>
                          <p className="text-lg font-semibold">{certificate.studentName ?? 'Not provided'}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            Issuing University
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{certificate.university.name}</p>
                            <Badge variant="outline" className="mt-1">
                              {certificate.university.isVerified ? '✓ Verified' : 'Unverified'}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Award className="h-4 w-4" />
                            Badge Title
                          </div>
                          <p className="text-lg font-semibold">{certificate.badgeTitle}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Issue Date
                          </div>
                          <p className="text-lg font-semibold">{formatDate(certificate.issueDate)}</p>
                        </div>
                        {certificate.degreeType && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              Degree Type
                            </div>
                            <p className="text-lg font-semibold">{certificate.degreeType}</p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            Verified On
                          </div>
                          <p className="text-lg font-semibold">{formatDate(verification.verificationTimestamp)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Detailed certificate metadata is not available.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Achievements Section - hidden when certificate is revoked */}
                {!isRevoked && certificate?.achievements && certificate.achievements.length > 0 && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-muted/5">
                    <CardHeader className="border-b bg-muted/30">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Award className="h-6 w-6 text-primary" />
                        </div>
                        Achievements & Honors
                        {zkStatuses.some(s => s.hasProof) && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            ZK Verification Available
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {certificate.achievements.map((achievement, index) => {
                          const zkStatus = getZkStatusForAchievement(achievement)
                          const hasProof = zkStatuses.find(s => s.achievementCode === achievement)?.hasProof
                          const verificationCount = zkStatuses.find(s => s.achievementCode === achievement)?.verificationCount || 0

                          return (
                            <div
                              key={index}
                              className="group flex items-center justify-between p-4 rounded-xl bg-primary/5 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 p-2 bg-primary rounded-full shadow-sm">
                                  <Award className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-foreground">
                                    {achievement}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <ZkStatusBadge
                                  status={zkStatus}
                                  verificationCount={zkStatus === 'verified' ? verificationCount : undefined}
                                />
                                {hasProof && blockchainProof?.mintAddress && (
                                  <>
                                    <ZkVerifyButton
                                      credentialId={blockchainProof.mintAddress}
                                      achievementCode={achievement}
                                      onVerified={(result) => handleZkVerification(achievement, result)}
                                      disabled={zkStatus === 'failed'}
                                      showViewReport={!!zkVerificationResults[achievement]?.verified}
                                      onViewReport={() => openZkReport(achievement, blockchainProof.mintAddress)}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Revocation Details */}
                {isRevoked && (
                  <Card className="border-2 border-red-300/50 shadow-xl bg-gradient-to-br from-red-500/5 to-red-600/10">
                    <CardHeader className="border-b border-red-300/30 bg-red-500/5">
                      <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-3 text-xl">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                          <XCircle className="h-6 w-6" />
                        </div>
                        Revocation Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Revoked At</p>
                          <p className="text-lg font-semibold">{formatDate(revocationInfo?.revokedAt)}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Reason</p>
                          <p className="text-base font-medium">{revocationInfo?.reason ?? 'Not provided'}</p>
                        </div>
                      </div>
                      {revocationInfo?.transactionSignature && (
                        <div className="p-4 bg-red-500/5 rounded-lg border border-red-300/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">Revocation Transaction</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(revocationInfo.transactionSignature!, 'revokeTx')}
                              className="h-8 w-8 p-0"
                            >
                              {copied === 'revokeTx' ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="font-mono text-xs break-all text-muted-foreground">{revocationInfo.transactionSignature}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-red-300/50 hover:bg-red-500/10"
                            onClick={() => window.open(getSolanaExplorerUrl(revocationInfo.transactionSignature!, 'tx'), '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-2" />
                            View Revocation Transaction
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Blockchain Proof */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="border-b bg-primary/5">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      Blockchain Proof
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {blockchainProof ? (
                      <div className="space-y-4">
                        {blockchainProof.mintAddress && (
                          <div className="p-4 bg-background/50 rounded-lg border space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-muted-foreground">Mint Address</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(blockchainProof.mintAddress!, 'mint')}
                                className="h-8 w-8 p-0"
                              >
                                {copied === 'mint' ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <p className="font-mono text-xs break-all">{blockchainProof.mintAddress}</p>
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
                          <div className="p-4 bg-background/50 rounded-lg border space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-muted-foreground">Transaction Signature</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(blockchainProof.transactionSignature!, 'tx')}
                                className="h-8 w-8 p-0"
                              >
                                {copied === 'tx' ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <p className="font-mono text-xs break-all">{blockchainProof.transactionSignature}</p>
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
                          <div className="p-4 bg-background/50 rounded-lg border space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-muted-foreground">Metadata URI</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(blockchainProof.metadataUri!, 'metadata')}
                                className="h-8 w-8 p-0"
                              >
                                {copied === 'metadata' ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <p className="font-mono text-xs break-all">{blockchainProof.metadataUri}</p>
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
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No on-chain proof was returned for this verification.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Share Verification */}
                {certificate && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500/5 to-green-600/10">
                    <CardHeader className="border-b bg-green-500/5">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <QrCode className="h-5 w-5 text-green-600" />
                        </div>
                        Share Verification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Share this verification link with employers or third parties to allow them to confirm the
                        credential on-chain.
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
                            <Link2 className="h-4 w-4 mr-2" />
                            Copy Verification Link
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
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
