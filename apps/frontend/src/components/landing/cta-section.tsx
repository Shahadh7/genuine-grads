"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Sparkles, Zap, Shield, Rocket, Check, Star } from "lucide-react"
import Link from "next/link"

const CTASection = () => {
  return (
    <section className="py-32 relative overflow-hidden">
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
        <div className="max-w-7xl mx-auto relative bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur-2xl border-2 border-border/50 rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/20 animate-scale-in">

          {/* Animated background effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 bg-300 animate-gradient-shift"></div>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-0">

            {/* LEFT SIDE - Content */}
            <div className="p-12 lg:p-16 flex flex-col justify-center">

              {/* Badge */}
              <div className="inline-flex mb-8">
                <div className="relative group cursor-pointer">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/70 to-primary/50 rounded-full blur-lg opacity-40 group-hover:opacity-60 animate-pulse-slow transition duration-500"></div>
                  <div className="relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/25 via-primary/15 to-primary/10 border-2 border-primary/40 rounded-full backdrop-blur-xl shadow-xl shadow-primary/20">
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/30 border border-primary/50">
                        <Rocket className="w-4 h-4 text-white relative z-10" />
                        <div className="absolute inset-0 bg-primary/60 blur-sm animate-pulse"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-primary/80 uppercase tracking-wider">Go Live</span>
                        <span className="text-sm font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                          On-Chain Institution
                        </span>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                  </div>
                </div>
              </div>

              {/* Headline */}
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
                <span className="block">Ready to</span>
                <span className="block bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent bg-300 animate-gradient-shift">
                  Transform
                </span>
                <span className="block">Education?</span>
              </h2>

              {/* Description */}
              <p className="text-xl sm:text-2xl text-muted-foreground mb-10 leading-relaxed max-w-xl">
                Join <span className="text-primary font-bold">100+ universities</span> issuing blockchain-verified credentials. Setup takes <span className="text-primary font-bold">less than 10 minutes</span>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link href="/admin/universities/register">
                  <Button size="lg" className="relative group bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-8 text-xl font-black shadow-2xl shadow-primary/40 overflow-hidden w-full sm:w-auto">
                    <span className="relative z-10 flex items-center justify-center">
                      Get Started Free
                      <ArrowRight className="ml-3 h-7 w-7 group-hover:translate-x-2 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </Button>
                </Link>

                <Link href="/verify">
                  <Button variant="outline" size="lg" className="border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 px-12 py-8 text-xl font-bold transition-all w-full sm:w-auto">
                    View Demo
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-8 pt-8 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-card flex items-center justify-center">
                        <Star className="h-4 w-4 text-primary fill-primary" />
                      </div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="font-bold">100+ Universities</div>
                    <div className="text-muted-foreground text-xs">Already on board</div>
                  </div>
                </div>

                <div className="h-12 w-px bg-border/30"></div>

                <div className="text-sm">
                  <div className="font-bold text-primary">50,000+</div>
                  <div className="text-muted-foreground text-xs">Certificates issued</div>
                </div>
              </div>

            </div>

            {/* RIGHT SIDE - Feature highlights with bento */}
            <div className="bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm p-12 lg:p-16 flex flex-col justify-center">

              <div className="space-y-4">

                <h3 className="text-2xl font-black mb-8">What You Get:</h3>

                {/* Feature list with enhanced styling */}
                {[
                  { icon: Zap, title: "$0.01 per certificate", desc: "The lowest cost in the industry" },
                  { icon: Shield, title: "Zero-knowledge proofs", desc: "Privacy-preserving verification" },
                  { icon: Check, title: "Instant verification", desc: "Real-time credential checking" },
                  { icon: Sparkles, title: "Custom branding", desc: "Design certificates your way" }
                ].map((feature, index) => {
                  const IconComponent = feature.icon
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-card/60 border border-border/40 hover:bg-card hover:border-primary/20 transition-all duration-300 group"
                      style={{animationDelay: `${index * 0.1}s`}}
                    >
                      <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg mb-1">{feature.title}</div>
                        <div className="text-sm text-muted-foreground">{feature.desc}</div>
                      </div>
                      <Check className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )
                })}

                {/* Bottom stats */}
                <div className="grid grid-cols-3 gap-4 pt-8 mt-8 border-t border-border/30">
                  <div className="text-center">
                    <div className="text-3xl font-black text-primary mb-1">99.9%</div>
                    <div className="text-xs text-muted-foreground font-medium">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-primary mb-1">&lt;1s</div>
                    <div className="text-xs text-muted-foreground font-medium">Verify Speed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-primary mb-1">24/7</div>
                    <div className="text-xs text-muted-foreground font-medium">Support</div>
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
