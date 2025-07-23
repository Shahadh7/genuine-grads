"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  GraduationCap, 
  Building2, 
  Calendar, 
  Award, 
  Shield, 
  ExternalLink, 
  QrCode,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  Loader2
} from 'lucide-react'
import { fetchCertificate, verifyZKPProof } from '@/lib/certificates'

export default function CertificatePage() {
  const params = useParams()
  const router = useRouter()
  const certificateId = params.certificateId

  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAchievement, setSelectedAchievement] = useState(null)
  const [proofFile, setProofFile] = useState(null)
  const [verifyingProof, setVerifyingProof] = useState(false)
  const [proofResult, setProofResult] = useState(null)

  useEffect(() => {
    const loadCertificate = async () => {
      try {
        setLoading(true)
        setError('')
        
        const cert = await fetchCertificate(certificateId)
        if (cert) {
          setCertificate(cert)
        } else {
          setError('Certificate not found')
        }
      } catch (err) {
        setError('Failed to load certificate')
      } finally {
        setLoading(false)
      }
    }

    if (certificateId) {
      loadCertificate()
    }
  }, [certificateId])

  const handleProofVerification = async () => {
    if (!proofFile || !selectedAchievement) return

    try {
      setVerifyingProof(true)
      setProofResult(null)

      const result = await verifyZKPProof(proofFile, selectedAchievement.title)
      setProofResult(result)
    } catch (err) {
      setProofResult({
        isValid: false,
        message: "❌ Verification Failed",
        details: "An error occurred during verification"
      })
    } finally {
      setVerifyingProof(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/json') {
      setProofFile(file)
    } else {
      alert('Please select a valid JSON file')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (isRevoked) => {
    return isRevoked ? 'destructive' : 'default'
  }

  const getStatusIcon = (isRevoked) => {
    return isRevoked ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />
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
                <h2 className="text-xl font-semibold mb-2">Certificate Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  The certificate with ID "{certificateId}" could not be found.
                </p>
                <Button onClick={() => router.push('/verify')}>
                  Try Another Certificate
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.push('/verify')}
            className="mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Verification
          </Button>

          {/* Certificate Header */}
          <div className="mb-8">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/10">
              Certificate Details
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
              {certificate.degreeTitle}
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mb-6"></div>
          </div>

          {/* Status Badge */}
          <div className="mb-8">
            <Badge 
              variant={getStatusColor(certificate.isRevoked)}
              className="inline-flex items-center gap-2 text-sm px-3 py-1"
            >
              {getStatusIcon(certificate.isRevoked)}
              {certificate.isRevoked ? 'Revoked' : 'Valid'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Certificate Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Student Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Student Name</label>
                      <p className="text-lg font-semibold">{certificate.studentName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">University</label>
                      <p className="text-lg font-semibold">{certificate.universityName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">GPA</label>
                      <p className="text-lg font-semibold">{certificate.gpa}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Issue Date</label>
                      <p className="text-lg font-semibold">{formatDate(certificate.issueDate)}</p>
                    </div>
                  </div>
                  
                  {certificate.metadata && (
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {certificate.metadata.major && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Major</label>
                            <p className="font-semibold">{certificate.metadata.major}</p>
                          </div>
                        )}
                        {certificate.metadata.graduationYear && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Graduation Year</label>
                            <p className="font-semibold">{certificate.metadata.graduationYear}</p>
                          </div>
                        )}
                        {certificate.metadata.honors && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Honors</label>
                            <p className="font-semibold">{certificate.metadata.honors}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Achievements & Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {certificate.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Award className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">{achievement.title}</p>
                            {achievement.description && (
                              <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {achievement.zkpRequired && (
                            <Badge variant="outline" className="text-xs">
                              ZKP Required
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {achievement.zkpRequired ? 'Proof Required' : 'Auto Verified'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ZKP Proof Verification */}
              {certificate.achievements.some(a => a.zkpRequired) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Zero-Knowledge Proof Verification
                    </CardTitle>
                    <CardDescription>
                      Verify ZKP proofs for achievements that require them
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Achievement</label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        onChange={(e) => setSelectedAchievement(
                          certificate.achievements.find(a => a.title === e.target.value)
                        )}
                        value={selectedAchievement?.title || ''}
                      >
                        <option value="">Choose an achievement...</option>
                        {certificate.achievements
                          .filter(a => a.zkpRequired)
                          .map((achievement, index) => (
                            <option key={index} value={achievement.title}>
                              {achievement.title}
                            </option>
                          ))}
                      </select>
                    </div>

                    {selectedAchievement && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Upload Proof File (.json)</label>
                          <Input
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="w-full"
                          />
                        </div>

                        {proofFile && (
                          <Button
                            onClick={handleProofVerification}
                            disabled={verifyingProof}
                            className="w-full"
                          >
                            {verifyingProof ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Verifying Proof...
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Verify Proof
                              </>
                            )}
                          </Button>
                        )}

                        {proofResult && (
                          <div className={`p-4 rounded-lg border ${
                            proofResult.isValid 
                              ? 'border-green-200 bg-green-50 text-green-800' 
                              : 'border-red-200 bg-red-50 text-red-800'
                          }`}>
                            <div className="flex items-center gap-2">
                              {proofResult.isValid ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <AlertTriangle className="h-4 w-4" />
                              )}
                              <span className="font-semibold">{proofResult.message}</span>
                            </div>
                            {proofResult.details && (
                              <p className="text-sm mt-1">{proofResult.details}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!certificate.achievements.some(a => a.zkpRequired) && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>No proof required for this certificate.</p>
                      <p className="text-sm">All achievements are automatically verified.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Blockchain Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Blockchain Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Certificate ID</label>
                    <p className="font-mono text-sm break-all">{certificate.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">cNFT Mint Address</label>
                    <p className="font-mono text-sm break-all">{certificate.cnftMintAddress}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`https://solscan.io/account/${certificate.cnftMintAddress}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Solana Explorer
                  </Button>
                </CardContent>
              </Card>

              {/* QR Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    Share Certificate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="w-full h-48 bg-gray-100 rounded flex items-center justify-center">
                      <QrCode className="h-16 w-16 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Scan this QR code to share the certificate
                  </p>
                  <Button variant="outline" className="w-full">
                    <QrCode className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 