"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Camera, AlertCircle, CheckCircle, X } from 'lucide-react'

interface QRScannerProps {
  onScan: (certificateId: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps): React.JSX.Element {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
            width: 220,
            height: 220,
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

  const onScanSuccess = (decodedText: string) => {
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

  const onScanFailure = (errorMessage: string) => {
    // Ignore common scanning errors
    if (!errorMessage.includes("NotFound") && !errorMessage.includes("NotAllowedError")) {
      setError("Scanning failed. Please try again.")
      if (onError) {
        onError(errorMessage)
      }
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-3 p-4 text-sm bg-destructive/5 border border-destructive/20 text-destructive rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="p-1 hover:bg-destructive/10 rounded-md transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-3 p-4 text-sm bg-green-500/5 border border-green-500/20 text-green-700 dark:text-green-400 rounded-xl">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {!isScanning ? (
        <div className="text-center py-8 space-y-6">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center">
            <Camera className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Position the QR code within the camera frame
            </p>
          </div>
          <Button
            onClick={startScanner}
            className="h-12 sm:h-14 px-8 text-base font-medium"
          >
            <Camera className="h-4 w-4 mr-2" />
            Open Camera
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            id="qr-reader" 
            className="w-full rounded-xl overflow-hidden bg-muted/30"
            aria-label="QR code scanner area"
          />
          <Button
            onClick={stopScanner}
            variant="outline"
            className="w-full h-11"
          >
            <X className="h-4 w-4 mr-2" />
            Stop Scanner
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Make sure the QR code is well-lit and clearly visible
      </p>
    </div>
  )
}
