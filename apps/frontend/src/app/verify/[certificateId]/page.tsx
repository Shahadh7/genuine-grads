"use client"
import { useState, useEffect } from 'react'
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
  Loader2
} from 'lucide-react'
import {
  CertificateVerification,
  verifyCertificate,
} from '@/lib/certificates'

export default function CertificatePage(): React.JSX.Element {
  const params = useParams()
  const router = useRouter()
  const certificateId = params.certificateId

  const [verification, setVerification] = useState<CertificateVerification | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const isLikelyMintAddress = (value: string) => /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(String(value))

  useEffect(() => {
    const loadCertificate = async () => {
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
      } finally {
        setLoading(false)
      }
    }

    if (certificateId) {
      loadCertificate()
    }
  }, [certificateId])

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading certificate...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/verify')}
              className="mb-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Verification
            </Button>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
                <p className="text-muted-foreground mb-4">
                  {error}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => router.refresh()}>
                    Retry
                  </Button>
                  <Button onClick={() => router.push('/verify')}>
                    Back to Verification
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
  const statusVariant = isValid ? 'default' : isRevoked ? 'destructive' : 'secondary'
  const statusIcon = isValid ? (
    <CheckCircle className="h-4 w-4" />
  ) : isRevoked ? (
    <XCircle className="h-4 w-4" />
  ) : (
    <AlertTriangle className="h-4 w-4" />
  )

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/verify')}
            className="mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Verification
          </Button>

          <div className="mb-8">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/10">
              Certificate Details
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
              {certificate?.badgeTitle ??
                certificate?.degreeType ??
                'Certificate Verification'}
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mb-6" />
          </div>

          <div className="mb-8">
            <Badge variant={statusVariant} className="inline-flex items-center gap-2 text-sm px-3 py-1">
              {statusIcon}
              {status}
            </Badge>
          </div>

          {status === 'INVALID' ? (
            <Card className="border-dashed border-red-200">
              <CardContent className="pt-6 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <div>
                  <h2 className="text-xl font-semibold mb-2">Certificate Not Found</h2>
                  <p className="text-muted-foreground">
                    We could not locate a certificate matching this identifier. Please confirm the certificate number
                    or mint address and try again.
                  </p>
                </div>
                <Button onClick={() => router.push('/verify')}>
                  Try Another Certificate
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Certificate Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {certificate ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Student Name</p>
                          <p className="text-lg font-semibold">{certificate.studentName ?? 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Issuing University</p>
                          <p className="text-lg font-semibold">{certificate.university.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Badge Title</p>
                          <p className="text-lg font-semibold">{certificate.badgeTitle}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Issue Date</p>
                          <p className="text-lg font-semibold">{formatDate(certificate.issueDate)}</p>
                        </div>
                        {certificate.degreeType && (
                          <div>
                            <p className="text-sm text-muted-foreground">Degree Type</p>
                            <p className="text-lg font-semibold">{certificate.degreeType}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Verification Timestamp</p>
                          <p className="text-lg font-semibold">{formatDate(verification.verificationTimestamp)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Issuer Status</p>
                          <p className="text-lg font-semibold">
                            {certificate.university.isVerified ? 'Verified University' : 'Unverified University'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Detailed certificate metadata is not available.</p>
                    )}
                  </CardContent>
                </Card>

                {isRevoked && (
                  <Card className="border-red-200 bg-red-50/60 dark:bg-red-950/10">
                    <CardHeader>
                      <CardTitle className="text-red-600 dark:text-red-300 flex items-center gap-2">
                        <XCircle className="h-5 w-5" />
                        Revocation Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Revoked At</p>
                        <p className="text-lg font-semibold">{formatDate(revocationInfo?.revokedAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reason</p>
                        <p className="text-base">{revocationInfo?.reason ?? 'Not provided'}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Blockchain Proof
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {blockchainProof ? (
                      <div className="space-y-3">
                        {blockchainProof.mintAddress && (
                          <div>
                            <p className="text-sm text-muted-foreground">Mint Address</p>
                            <p className="font-mono text-sm break-all">{blockchainProof.mintAddress}</p>
                          </div>
                        )}
                        {blockchainProof.transactionSignature && (
                          <div>
                            <p className="text-sm text-muted-foreground">Transaction Signature</p>
                            <p className="font-mono text-sm break-all">
                              {blockchainProof.transactionSignature}
                            </p>
                          </div>
                        )}
                        {blockchainProof.metadataUri && (
                          <div>
                            <p className="text-sm text-muted-foreground">Metadata URI</p>
                            <p className="font-mono text-sm break-all">{blockchainProof.metadataUri}</p>
                          </div>
                        )}
                        {blockchainProof.verifiedAt && (
                          <div>
                            <p className="text-sm text-muted-foreground">Verified On</p>
                            <p className="text-sm font-medium">{formatDate(blockchainProof.verifiedAt)}</p>
                          </div>
                        )}
                        {blockchainProof.mintAddress && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              window.open(
                                `https://solscan.io/account/${blockchainProof.mintAddress}`,
                                '_blank'
                              )
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Solana Explorer
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No on-chain proof was returned for this verification.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {certificate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-primary" />
                        Share Verification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Share this verification link with employers or third parties to allow them to confirm the
                        credential on-chain.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(window.location.href)
                          }
                        }}
                      >
                        Copy Verification Link
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}