"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Camera, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react'

interface QRScannerProps {
  onScan: (certificateId: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps): React.JSX.Element {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [isStarting, setIsStarting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      // Stop the stream immediately, we just needed to request permission
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (err) {
      return false
    }
  }

  const startScanner = async () => {
    setError(null)
    setSuccess(null)
    setIsStarting(true)

    try {
      // First, request camera permission
      const hasPermission = await requestCameraPermission()
      
      if (!hasPermission) {
        setError("Camera permission denied. Please allow camera access in your browser settings.")
        setIsStarting(false)
        return
      }

      // Create scanner instance
      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      // Start scanning
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        onScanFailure
      )

      setIsScanning(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission')) {
        setError("Camera permission denied. Please allow camera access and try again.")
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('device')) {
        setError("No camera found. Please ensure your device has a camera.")
      } else if (errorMessage.includes('NotReadableError') || errorMessage.includes('in use')) {
        setError("Camera is in use by another application. Please close other apps using the camera.")
      } else {
        setError("Unable to start camera. Please check your device settings.")
      }
      
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsStarting(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch (err) {
        // Ignore cleanup errors
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const onScanSuccess = (decodedText: string) => {
    try {
      // Try to extract certificate ID from URL
      let certificateId: string | undefined

      try {
        const url = new URL(decodedText)
        certificateId = url.pathname.split('/').pop()
      } catch {
        // Not a URL, use the raw text as certificate ID
        certificateId = decodedText.trim()
      }
      
      if (certificateId) {
        setSuccess("Certificate found! Redirecting...")
        stopScanner()
        
        // Small delay to show success message
        setTimeout(() => {
          onScan(certificateId)
        }, 800)
      } else {
        setError("Invalid QR code format")
      }
    } catch (err) {
      setError("Invalid QR code. Please try again.")
    }
  }

  const onScanFailure = () => {
    // Silently ignore scan failures - these happen constantly while looking for QR codes
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
            disabled={isStarting}
            className="h-12 sm:h-14 px-8 text-base font-medium"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Requesting Access...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Open Camera
              </>
            )}
          </Button>
          {/* Hidden container for scanner - needs to exist before starting */}
          <div 
            id="qr-reader" 
            className="hidden"
            aria-hidden="true"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            id="qr-reader" 
            className="w-full rounded-xl overflow-hidden bg-muted/30 [&_video]:rounded-xl"
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
