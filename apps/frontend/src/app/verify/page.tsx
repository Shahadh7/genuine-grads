"use client"
import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QRScanner } from '@/components/qr-scanner'
import { Search, ScanLine, ArrowRight } from 'lucide-react'
import { useYupValidation } from '@/lib/validation/hooks'
import { certificateVerificationSchema, CertificateVerificationFormData } from '@/lib/validation/schemas/certificate'

export default function VerifyPage(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'manual' | 'scan'>('manual')
  const router = useRouter()

  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
  } = useYupValidation<CertificateVerificationFormData>({
    schema: certificateVerificationSchema,
    initialValues: { certificateId: '' },
    clearErrorOnChange: true,
  })

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    const isValid = await validateForm()
    if (!isValid) return

    setIsLoading(true)

    router.push(`/verify/${formData.certificateId.trim()}`)
  }

  const handleQRScan = (scannedCertificateId: string) => {
    router.push(`/verify/${scannedCertificateId}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-14">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
              Verify Certificate
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Enter the certificate ID or scan the QR code to verify authenticity on the blockchain.
            </p>
          </div>

          {/* Main verification card */}
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              {/* Tab switcher */}
              <div className="flex p-1 bg-muted/60 rounded-xl mb-8">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'manual'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  <span>Enter ID</span>
                </button>
                <button
                  onClick={() => setActiveTab('scan')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'scan'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ScanLine className="h-4 w-4" />
                  <span>Scan QR</span>
                </button>
              </div>

              {/* Manual input section */}
              {activeTab === 'manual' && (
                <div className="space-y-6">
                  <form onSubmit={handleVerify} className="space-y-5">
                    <div className="space-y-2">
                      <label 
                        htmlFor="certificateId" 
                        className="text-sm font-medium text-foreground"
                      >
                        Certificate ID
                      </label>
                      <Input
                        id="certificateId"
                        type="text"
                        placeholder="e.g., abc123 or mint address"
                        value={formData.certificateId}
                        onChange={(e) => handleInputChange('certificateId', e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`h-12 sm:h-14 text-base px-4 bg-background border-border/60 focus:border-primary/50 ${errors.certificateId ? 'border-destructive' : ''}`}
                        aria-label="Certificate ID input"
                      />
                      {errors.certificateId && (
                        <p className="text-sm text-destructive mt-1">{errors.certificateId}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 sm:h-14 text-base font-medium group" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Verifying...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          Verify Certificate
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-muted-foreground text-center">
                    Certificate IDs are case-sensitive. Enter exactly as shown on the certificate.
                  </p>
                </div>
              )}

              {/* QR Scanner section */}
              {activeTab === 'scan' && (
                <div className="space-y-4">
                  <QRScanner onScan={handleQRScan} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trust indicator */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Secured by Solana blockchain technology
          </p>
        </div>
      </div>
    </div>
  )
}
