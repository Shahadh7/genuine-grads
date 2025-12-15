"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Zap,
  Lock,
  QrCode,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Blocks
} from "lucide-react"
import Link from "next/link"

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 items-center max-w-7xl mx-auto">

          {/* Left Column - Content */}
          <div className="space-y-8 animate-fade-in">
            <div>
              <Badge variant="outline" className="mb-6 border-primary/40 bg-primary/10 text-primary px-4 py-2 backdrop-blur-sm">
                <Blocks className="w-4 h-4 mr-2 inline" />
                Powered by Solana Blockchain
              </Badge>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
                <span className="block mb-2">Academic</span>
                <span className="block mb-2">Credentials</span>
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  On-Chain
                </span>
              </h1>

              <p className="text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
                Issue tamper-proof NFT certificates with zero-knowledge proofs.
                Instant verification at <span className="text-primary font-semibold">$0.01</span> per certificate.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/admin/universities/register">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-7 text-lg shadow-xl shadow-primary/30 group w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/verify">
                  <Button variant="outline" size="lg" className="border-2 hover:bg-accent font-semibold px-8 py-7 text-lg w-full sm:w-auto">
                    <QrCode className="mr-2 h-5 w-5" />
                    Verify Now
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border/50">
              <div>
                <div className="text-3xl font-bold text-primary mb-1">50K+</div>
                <div className="text-sm text-muted-foreground">Certificates</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-1">&lt;1s</div>
                <div className="text-sm text-muted-foreground">Verification</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-1">100+</div>
                <div className="text-sm text-muted-foreground">Universities</div>
              </div>
            </div>
          </div>

          {/* Right Column - Bento Grid */}
          <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{animationDelay: '0.2s'}}>

            {/* Large Card - Top Left */}
            <div className="col-span-2 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-sm border border-primary/30 rounded-3xl p-8 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 group">
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 rounded-2xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <Badge variant="secondary" className="bg-primary/10 border-primary/20">ZK Proofs</Badge>
              </div>
              <h3 className="text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                Privacy-First
              </h3>
              <p className="text-muted-foreground text-lg">
                Zero-knowledge verification without exposing sensitive data
              </p>
              <div className="mt-6 pt-6 border-t border-border/50 flex items-center gap-2 text-sm text-primary">
                <TrendingUp className="h-4 w-4" />
                <span className="font-semibold">100% Secure</span>
              </div>
            </div>

            {/* Small Card - Bottom Left */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-6 hover:border-primary/30 hover:shadow-xl transition-all duration-500 group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 mb-4 inline-block group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <div className="text-4xl font-bold text-primary mb-2">$0.01</div>
              <p className="text-sm text-muted-foreground">Per certificate on Solana</p>
            </div>

            {/* Small Card - Bottom Right */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-6 hover:border-primary/30 hover:shadow-xl transition-all duration-500 group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-4 inline-block group-hover:scale-110 transition-transform">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <p className="text-sm text-muted-foreground">Tamper-proof & immutable</p>
            </div>

            {/* Tech Stack Badge Row */}
            <div className="col-span-2 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm border border-border/50 rounded-3xl p-6">
              <p className="text-xs text-muted-foreground mb-3 font-semibold">BUILT WITH</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="px-3 py-1.5 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors">
                  Solana
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors">
                  Metaplex
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors">
                  Helius
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors">
                  ZK Proofs
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors">
                  NFTs
                </Badge>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
