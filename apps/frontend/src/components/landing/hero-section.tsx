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
  Blocks,
  Wallet,
  Globe,
  Award,
  Fingerprint
} from "lucide-react"
import Link from "next/link"
import Aurora from "@/components/backgrounds/Aurora"

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">
      {/* Aurora Background */}
      <div className="absolute inset-0 opacity-40 dark:opacity-60">
        <Aurora 
          colorStops={['#F59E0B', '#D97706', '#B45309']} 
          amplitude={1.2}
          blend={0.6}
          speed={0.8}
        />
      </div>
      
      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background/90"></div>
      
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">

          {/* LEFT: Content */}
          <div className="space-y-8 lg:pr-8">
            {/* Floating badge */}
            <div className="inline-flex animate-scale-in">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 border border-primary/30 rounded-full backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Blocks className="w-4 h-4 text-primary" />
                      <div className="absolute inset-0 bg-primary/50 blur-sm animate-pulse"></div>
                    </div>
                    <span className="text-sm font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      Solana
                    </span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse"></div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      ZK Proofs
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Massive headline */}
            <div className="space-y-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none">
                <span className="block text-foreground">Your</span>
                <span className="block text-foreground">Credentials.</span>
                <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent bg-300 animate-gradient-shift">
                  On-Chain.
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-muted-foreground max-w-lg leading-relaxed font-light">
                Issue tamper-proof NFT certificates with <span className="text-primary font-semibold">zero-knowledge proofs</span>. Verify instantly at <span className="text-primary font-semibold">$0.01</span> per certificate.
              </p>
            </div>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row gap-4 animate-scale-in" style={{animationDelay: '0.2s'}}>
              <Link href="/admin/universities/register" className="sm:w-auto">
                <Button size="lg" className="relative group bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-7 text-lg font-bold shadow-2xl shadow-primary/40 overflow-hidden w-full sm:w-auto">
                  <span className="relative z-10 flex items-center justify-center">
                    Start Issuing
                    <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </Button>
              </Link>

              <Link href="/verify" className="sm:w-auto">
                <Button variant="outline" size="lg" className="border-2 px-10 py-7 text-lg font-bold hover:bg-primary/5 hover:border-primary/50 transition-all w-full sm:w-auto">
                  <QrCode className="mr-3 h-5 w-5" />
                  Verify Certificate
                </Button>
              </Link>
            </div>

            {/* Trust metrics */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border/30 animate-fade-in" style={{animationDelay: '0.3s'}}>
              <div>
                <div className="text-4xl font-black text-primary mb-1">50K+</div>
                <div className="text-sm text-muted-foreground font-medium">Certificates</div>
              </div>
              <div>
                <div className="text-4xl font-black text-primary mb-1">&lt;1s</div>
                <div className="text-sm text-muted-foreground font-medium">Verification</div>
              </div>
              <div>
                <div className="text-4xl font-black text-primary mb-1">100+</div>
                <div className="text-sm text-muted-foreground font-medium">Universities</div>
              </div>
            </div>
          </div>

          {/* RIGHT: 3D Showcase Bento Grid */}
          <div className="relative animate-scale-in" style={{animationDelay: '0.2s'}}>
            {/* Main container with perspective */}
            <div className="relative h-[600px] lg:h-[700px]">

              {/* Large hero card - floating */}
              <div className="absolute top-0 left-0 right-0 h-64 animate-float">
                <div className="relative h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 backdrop-blur-xl border-2 border-primary/40 rounded-[2rem] p-8 shadow-2xl shadow-primary/20 overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                  {/* Animated shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-4 rounded-2xl bg-primary/30 backdrop-blur-sm">
                        <Shield className="h-10 w-10 text-white" />
                      </div>
                      <Badge className="bg-primary/20 border-primary/30 text-white backdrop-blur-sm px-4 py-1.5">
                        Zero-Knowledge
                      </Badge>
                    </div>
                    <h3 className="text-3xl font-black text-white mb-3">
                      Privacy-First
                    </h3>
                    <p className="text-white/80 text-lg leading-relaxed">
                      Verify credentials without exposing sensitive student data
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom row - 3 cards */}
              <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-4">

                {/* Cost card */}
                <div className="relative bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all duration-300 group overflow-hidden" style={{animationDelay: '0.3s'}}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
                  <div className="relative z-10">
                    <Zap className="h-8 w-8 text-primary mb-4 animate-pulse" />
                    <div className="text-3xl font-black text-primary mb-1">$0.01</div>
                    <div className="text-xs text-muted-foreground font-medium">Per cert</div>
                  </div>
                </div>

                {/* Security card */}
                <div className="relative bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all duration-300 group overflow-hidden" style={{animationDelay: '0.4s'}}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors"></div>
                  <div className="relative z-10">
                    <Lock className="h-8 w-8 text-primary mb-4" />
                    <div className="text-3xl font-black text-primary mb-1">100%</div>
                    <div className="text-xs text-muted-foreground font-medium">Secure</div>
                  </div>
                </div>

                {/* Blockchain card */}
                <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 backdrop-blur-md border border-primary/30 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden" style={{animationDelay: '0.5s'}}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer"></div>
                  <div className="relative z-10">
                    <Wallet className="h-8 w-8 text-primary mb-4" />
                    <div className="text-2xl font-black text-primary mb-1">Solana</div>
                    <div className="text-xs text-muted-foreground font-medium">Blockchain</div>
                  </div>
                </div>
              </div>

              {/* Middle cards - stacked badges */}
              <div className="absolute top-80 left-0 right-0 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex-1 bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-card/80 transition-colors">
                    <Award className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold">NFT Certificates</span>
                  </div>
                  <div className="flex-1 bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-card/80 transition-colors">
                    <Globe className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold">Global Reach</span>
                  </div>
                </div>
                <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-card/80 transition-colors">
                  <Fingerprint className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">Instant Verification • Tamper-Proof • Decentralized</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

export default HeroSection
