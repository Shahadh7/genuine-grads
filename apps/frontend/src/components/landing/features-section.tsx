"use client"

import React from "react"
import {
  Building2,
  GraduationCap,
  Briefcase,
  FileText,
  Trophy,
  Users,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  BarChart3,
  Rocket,
  Target,
  Zap
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const FeaturesSection = () => {
  return (
    <section className="py-16 sm:py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 lg:mb-20 animate-fade-in px-2">
          <div className="inline-flex mb-4 sm:mb-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 to-primary/20 rounded-full blur-sm opacity-50 group-hover:opacity-75 transition duration-300"></div>
              <div className="relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-card/80 border-2 border-primary/20 rounded-full backdrop-blur-md shadow-lg shadow-primary/10">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary animate-pulse"
                      style={{animationDelay: `${i * 0.2}s`}}
                    ></div>
                  ))}
                </div>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Built for Everyone
                </span>
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary animate-pulse" />
              </div>
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 sm:mb-6">
            One Platform.
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Three Ecosystems.
            </span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
            Seamless credential management for universities, students, and employers
          </p>
        </div>

        {/* ASYMMETRIC BENTO GRID - Completely new layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mb-10 sm:mb-16">

          {/* LEFT: Large Universities Card - spans 7 columns */}
          <div className="lg:col-span-7 relative bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 overflow-hidden group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 animate-scale-in">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-500"></div>

            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 animate-shimmer"></div>

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between mb-4 sm:mb-6 lg:mb-8">
                <div className="p-3 sm:p-4 lg:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-primary" />
                </div>
                <Badge className="bg-blue-500/10 border-blue-500/20 text-blue-600 text-xs sm:text-sm">
                  <Rocket className="h-3 w-3 mr-1" />
                  Universities
                </Badge>
              </div>

              {/* Content */}
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-3 sm:mb-4 group-hover:text-primary transition-colors">
                Issue & Manage at Scale
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-6 lg:mb-8 leading-relaxed max-w-xl">
                Mint thousands of NFT certificates in minutes. Custom templates, bulk operations, and real-time analytics—all in one dashboard.
              </p>

              {/* Features grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-start gap-2 sm:gap-3 group/item">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors mt-0.5">
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base mb-0.5 sm:mb-1">Bulk Minting</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Upload CSV, mint thousands</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3 group/item">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors mt-0.5">
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base mb-0.5 sm:mb-1">Custom Templates</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Design certificates your way</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3 group/item">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors mt-0.5">
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base mb-0.5 sm:mb-1">Analytics Dashboard</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Track everything in real-time</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3 group/item">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors mt-0.5">
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base mb-0.5 sm:mb-1">API Access</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Integrate with your systems</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT TOP: Students Card - spans 5 columns */}
          <div className="lg:col-span-5 relative bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 overflow-hidden group hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 animate-scale-in" style={{animationDelay: '0.1s'}}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 animate-shimmer"></div>

            <div className="relative z-10">
              <div className="p-3 sm:p-4 lg:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm inline-block group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-4 sm:mb-6">
                <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-primary" />
              </div>

              <Badge className="bg-purple-500/10 border-purple-500/20 text-purple-600 mb-4 sm:mb-6 text-xs sm:text-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                Students
              </Badge>

              <h3 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4 group-hover:text-primary transition-colors">
                Own Your Achievements
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                Your credentials, your wallet. Portable, verifiable, forever.
              </p>

              <ul className="space-y-2 sm:space-y-3">
                {["NFT wallet integration", "Achievement showcase", "QR code sharing", "Lifetime access"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 sm:gap-3 group/item">
                    <div className="p-1 sm:p-1.5 rounded-full bg-primary/10 group-hover/item:bg-primary/20 transition-colors">
                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm sm:text-base">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW - Different asymmetric layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">

          {/* Stats card - 3 columns */}
          <div className="sm:col-span-1 lg:col-span-3 relative bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 overflow-hidden group hover:shadow-xl hover:border-primary/30 transition-all duration-500 animate-scale-in" style={{animationDelay: '0.2s'}}>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-primary/10 mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-primary mb-1 sm:mb-2">50K+</div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium mb-2">Certificates Issued</div>
              <Badge className="bg-green-500/10 border-green-500/20 text-green-600 text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% this month
              </Badge>
            </div>
          </div>

          {/* Employers card - 6 columns */}
          <div className="sm:col-span-2 lg:col-span-6 relative bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 overflow-hidden group hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 animate-scale-in" style={{animationDelay: '0.3s'}}>
            <div className="absolute top-0 left-0 w-80 h-80 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-colors duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent opacity-0 group-hover:opacity-100 animate-shimmer"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4 sm:mb-6">
                <div className="p-3 sm:p-4 lg:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Briefcase className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-primary" />
                </div>
                <Badge className="bg-green-500/10 border-green-500/20 text-green-600 text-xs sm:text-sm">
                  <Target className="h-3 w-3 mr-1" />
                  Employers
                </Badge>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4 group-hover:text-primary transition-colors">
                Verify in Seconds
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                Zero-knowledge proofs mean instant verification without compromising privacy. No calls. No emails. No waiting.
              </p>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                {["Instant verification", "No manual checks", "Privacy-preserving", "Tamper-proof"].map((feature, i) => (
                  <div key={i} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-card/60 border border-border/40 text-xs sm:text-sm font-medium hover:bg-card transition-colors">
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Verification stat - 3 columns */}
          <div className="sm:col-span-1 lg:col-span-3 relative bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 overflow-hidden group hover:shadow-xl hover:border-primary/30 transition-all duration-500 animate-scale-in" style={{animationDelay: '0.4s'}}>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-primary/10 mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-primary mb-1 sm:mb-2">&lt;1s</div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium mb-2">Verification Time</div>
              <Badge className="bg-primary/10 border-primary/20 text-primary text-xs">
                Lightning fast
              </Badge>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}

export default FeaturesSection
