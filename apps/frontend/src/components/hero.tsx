import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  QrCode, 
  GraduationCap, 
  Zap,
  CheckCircle2,
  Building2,
  Users,
  Award
} from "lucide-react"

const Hero = () => {
  return (
    <section className="relative py-20 sm:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/10">
            Revolutionary Academic Credentials
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl mb-6">
            Verify Academic Credentials{" "}
            <span className="text-primary font-bold">Instantly</span>
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto mb-6"></div>
          <p className="text-lg text-foreground/80 mb-8 max-w-2xl mx-auto">
            <span className="text-primary font-semibold">Powered by Solana</span>
          </p>
          <p className="text-xl text-foreground/90 mb-12 max-w-3xl mx-auto leading-relaxed">
            NFT-based certificates and achievements, secured on-chain and instantly verifiable through zero-knowledge proofs.
          </p>

          {/* Feature Icons */}
          <div className="flex flex-wrap justify-center items-center gap-8 mb-12">
            <div className="flex items-center space-x-2 text-primary">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-semibold">Tamper-proof</span>
            </div>
            <div className="flex items-center space-x-2 text-primary">
              <QrCode className="h-5 w-5" />
              <span className="text-sm font-semibold">QR Verification</span>
            </div>
            <div className="flex items-center space-x-2 text-primary">
              <GraduationCap className="h-5 w-5" />
              <span className="text-sm font-semibold">NFT Certificates</span>
            </div>
            <div className="flex items-center space-x-2 text-primary">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-semibold">Instant</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 text-lg shadow-lg shadow-primary/25">
              Get Started as a University
            </Button>
            <Button variant="outline" size="lg" className="border-primary/50 text-primary hover:bg-primary/10 font-semibold px-8 py-3 text-lg">
              Verify a Certificate
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="border-t border-border/50 pt-8">
            <p className="text-sm text-muted-foreground mb-6">Trusted by leading universities worldwide</p>
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
              <span className="font-medium">MIT</span>
              <span className="font-medium">Stanford</span>
              <span className="font-medium">Harvard</span>
              <span className="font-medium">Oxford</span>
              <span className="font-medium">Cambridge</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero 