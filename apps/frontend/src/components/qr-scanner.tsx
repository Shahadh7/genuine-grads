"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QrCode, Camera, AlertCircle, CheckCircle } from 'lucide-react'

export function QRScanner({onScan, onError}): React.React.JSX.Element {
  const scannerRef = useRef(null)
  const [isScanning, setIsScanning] = useState<any>(false)
  const [error, setError] = useState<any>(null)
  const [success, setSuccess] = useState<any>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
      }
    }
  }, [])

  const startScanner = () => {
    try {
      setError(null)
      setSuccess(null)
      setIsScanning(true)

      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          qrbox: {
            width: 250,
            height: 250,
          },
          fps: 10,
          aspectRatio: 1.0,
        },
        false
      )

      scanner.render(onScanSuccess, onScanFailure)
      scannerRef.current = scanner
    } catch (err) {
      setError("Failed to start camera. Please check permissions.")
      setIsScanning(false)
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const onScanSuccess = (decodedText) => {
    try {
      // Extract certificate ID from URL
      const url = new URL(decodedText)
      const certificateId = url.pathname.split('/').pop()
      
      if (certificateId) {
        setSuccess("Certificate found! Redirecting...")
        stopScanner()
        
        // Small delay to show success message
        setTimeout(() => {
          onScan(certificateId)
        }, 1000)
      } else {
        setError("Invalid QR code format")
      }
    } catch (err) {
      setError("Invalid QR code. Please try again.")
    }
  }

  const onScanFailure = (error) => {
    // Ignore common scanning errors
    if (!error.includes("NotFound") && !error.includes("NotAllowedError")) {
      setError("Scanning failed. Please try again.")
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (isScanning) {
        stopScanner()
      } else {
        startScanner()
      }
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          QR Code Scanner
        </CardTitle>
        <CardDescription>
          Scan a certificate QR code to verify instantly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm border border-destructive/50 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-2 p-3 text-sm border border-green-200 bg-green-50 text-green-800 rounded-md">
            <CheckCircle className="h-4 w-4" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            onClick={isScanning ? stopScanner : startScanner}
            onKeyDown={handleKeyDown}
            variant={isScanning ? "destructive" : "default"}
            className="w-full"
            tabIndex={0}
            aria-label={isScanning ? "Stop scanning" : "Start scanning"}
          >
            {isScanning ? (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Stop Scanner
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Start Scanner
              </>
            )}
          </Button>
        </div>

        <div 
          id="qr-reader" 
          className="w-full min-h-[300px] border rounded-lg overflow-hidden"
          aria-label="QR code scanner area"
        />

        <div className="text-xs text-muted-foreground text-center">
          <p>Point your camera at a GenuineGrads certificate QR code</p>
          <p>Make sure the QR code is well-lit and clearly visible</p>
        </div>
      </CardContent>
    </Card>
  )
} 