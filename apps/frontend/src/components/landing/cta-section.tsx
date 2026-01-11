"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Sparkles, Zap, Shield, Rocket, Check, Star } from "lucide-react"
import Link from "next/link"

const CTASection = () => {
  return (
    <section className="py-16 sm:py-24 lg:py-32 relative overflow-hidden">
      {/* Ultra-modern background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
      </div>

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* FULL-WIDTH SPLIT LAYOUT CARD */}
        <div className="max-w-7xl mx-auto relative bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur-2xl border-2 border-border/50 rounded-2xl sm:rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/20 animate-scale-in">

          {/* Animated background effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 bg-300 animate-gradient-shift"></div>
          <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] lg:w-[600px] h-[300px] sm:h-[400px] lg:h-[600px] bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[250px] sm:w-[350px] lg:w-[500px] h-[250px] sm:h-[350px] lg:h-[500px] bg-primary/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-0">

            {/* LEFT SIDE - Content */}
            <div className="p-6 sm:p-10 lg:p-16 flex flex-col justify-center">

              {/* Badge */}
              <div className="inline-flex mb-6 sm:mb-8">
                <div className="relative group cursor-pointer">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/70 to-primary/50 rounded-full blur-lg opacity-40 group-hover:opacity-60 animate-pulse-slow transition duration-500"></div>
                  <div className="relative flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-primary/25 via-primary/15 to-primary/10 border-2 border-primary/40 rounded-full backdrop-blur-xl shadow-xl shadow-primary/20">
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-primary/30 border border-primary/50">
                        <Rocket className="w-3 h-3 sm:w-4 sm:h-4 text-white relative z-10" />
                        <div className="absolute inset-0 bg-primary/60 blur-sm animate-pulse"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs font-bold text-primary/80 uppercase tracking-wider">Go Live</span>
                        <span className="text-xs sm:text-sm font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                          On-Chain Institution
                        </span>
                      </div>
                    </div>
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-ping"></div>
                  </div>
                </div>
              </div>

              {/* Headline */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black mb-3 sm:mb-4 md:mb-6 leading-tight">
                <span className="block">Ready to</span>
                <span className="block bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent bg-300 animate-gradient-shift">
                  Transform
                </span>
                <span className="block">Education?</span>
              </h2>

              {/* Description */}
              <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-muted-foreground mb-4 sm:mb-6 md:mb-8 lg:mb-10 leading-relaxed max-w-xl">
                Join <span className="text-primary font-bold">100+ universities</span> issuing blockchain-verified credentials. Setup takes <span className="text-primary font-bold">less than 10 minutes</span>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-6 sm:mb-8 lg:mb-10">
                <Link href="/admin/universities/register" className="w-full sm:w-auto">
                  <Button size="lg" className="relative group bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 sm:px-10 sm:py-6 lg:px-12 lg:py-8 text-base sm:text-lg lg:text-xl font-black shadow-2xl shadow-primary/40 overflow-hidden w-full sm:w-auto min-h-touch">
                    <span className="relative z-10 flex items-center justify-center">
                      Get Started Free
                      <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 group-hover:translate-x-2 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </Button>
                </Link>

                <Link href="/verify/UOM-2026-FACULTYOFI-00001" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 px-8 py-6 sm:px-10 sm:py-6 lg:px-12 lg:py-8 text-base sm:text-lg lg:text-xl font-bold transition-all w-full sm:w-auto min-h-touch">
                    View Demo
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 lg:gap-8 pt-4 sm:pt-6 md:pt-8 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-card flex items-center justify-center">
                        <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 text-primary fill-primary" />
                      </div>
                    ))}
                  </div>
                  <div className="text-xs sm:text-sm">
                    <div className="font-bold">100+ Universities</div>
                    <div className="text-muted-foreground text-[10px] sm:text-xs">Already on board</div>
                  </div>
                </div>

                <div className="hidden sm:block h-12 w-px bg-border/30"></div>

                <div className="text-xs sm:text-sm">
                  <div className="font-bold text-primary">50,000+</div>
                  <div className="text-muted-foreground text-[10px] sm:text-xs">Certificates issued</div>
                </div>
              </div>

            </div>

            {/* RIGHT SIDE - Feature highlights with bento */}
            <div className="bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm p-4 sm:p-6 md:p-8 lg:p-16 flex flex-col justify-center">

              <div className="space-y-3 sm:space-y-4">

                <h3 className="text-lg sm:text-xl md:text-2xl font-black mb-3 sm:mb-4 md:mb-6 lg:mb-8">What You Get:</h3>

                {/* Feature list with enhanced styling */}
                {[
                  { icon: Zap, title: "<$0.001 per certificate", desc: "The lowest cost in the industry" },
                  { icon: Shield, title: "Zero-knowledge proofs", desc: "Privacy-preserving verification" },
                  { icon: Check, title: "Instant verification", desc: "Real-time credential checking" },
                  { icon: Sparkles, title: "Custom branding", desc: "Design certificates your way" }
                ].map((feature, index) => {
                  const IconComponent = feature.icon
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-2 sm:gap-3 md:gap-4 p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl bg-card/60 border border-border/40 hover:bg-card hover:border-primary/20 transition-all duration-300 group"
                      style={{animationDelay: `${index * 0.1}s`}}
                    >
                      <div className="p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg md:rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                        <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs sm:text-sm md:text-base lg:text-lg mb-0.5 sm:mb-1">{feature.title}</div>
                        <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">{feature.desc}</div>
                      </div>
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  )
                })}

                {/* Bottom stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 pt-4 sm:pt-6 md:pt-8 mt-3 sm:mt-4 md:mt-8 border-t border-border/30">
                  <div className="text-center">
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-primary mb-0.5 sm:mb-1">99.9%</div>
                    <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground font-medium">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-primary mb-0.5 sm:mb-1">&lt;1s</div>
                    <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground font-medium">Verify Speed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-primary mb-0.5 sm:mb-1">24/7</div>
                    <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground font-medium">Support</div>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  )
}

export default CTASection
