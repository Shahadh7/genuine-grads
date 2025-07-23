"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QRScanner } from '@/components/qr-scanner'
import { Search, QrCode, FileText, Shield } from 'lucide-react'

export default function VerifyPage() {
  const [certificateId, setCertificateId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleVerify = async (e) => {
    e.preventDefault()
    
    if (!certificateId.trim()) {
      setError('Please enter a certificate ID')
      return
    }

    setIsLoading(true)
    setError('')
    
    // Navigate to certificate verification page
    router.push(`/verify/${certificateId.trim()}`)
  }

  const handleQRScan = (scannedCertificateId) => {
    router.push(`/verify/${scannedCertificateId}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleVerify(e)
    }
  }

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/10">
              Certificate Verification
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-4">
              Verify a Certificate
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto mb-6"></div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Verify the authenticity of academic credentials using certificate ID or QR code scanning
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Certificate ID Input */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Enter Certificate ID
                </CardTitle>
                <CardDescription>
                  Manually enter the certificate ID to verify
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="certificateId" className="text-sm font-medium text-foreground">
                      Certificate ID
                    </label>
                    <Input
                      id="certificateId"
                      type="text"
                      placeholder="e.g., abc123"
                      value={certificateId}
                      onChange={(e) => setCertificateId(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full"
                      aria-label="Certificate ID input"
                      tabIndex={0}
                    />
                  </div>
                  
                  {error && (
                    <div className="text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    aria-label="Verify certificate"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Verify Certificate
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-xs text-muted-foreground">
                  <p>• Enter the certificate ID exactly as provided</p>
                  <p>• Certificate IDs are case-sensitive</p>
                  <p>• Example: abc123, def456, ghi789</p>
                </div>
              </CardContent>
            </Card>

            {/* QR Scanner */}
            <div className="flex justify-center">
              <QRScanner onScan={handleQRScan} />
            </div>
          </div>

          {/* Features */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">Why Verify with GenuineGrads?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="text-center p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Tamper-Proof</h3>
                  <p className="text-sm text-muted-foreground">
                    All certificates are stored as immutable NFTs on Solana blockchain
                  </p>
                </div>
              </Card>
              
              <Card className="text-center p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <QrCode className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Instant Verification</h3>
                  <p className="text-sm text-muted-foreground">
                    Verify certificates instantly with QR codes or certificate IDs
                  </p>
                </div>
              </Card>
              
              <Card className="text-center p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Complete Details</h3>
                  <p className="text-sm text-muted-foreground">
                    View full certificate details including achievements and metadata
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 