"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Users,
  FileText,
  QrCode,
  ArrowDown,
  Sparkles,
  Zap,
  Check
} from "lucide-react"

const steps = [
  {
    step: "01",
    title: "Register Your Institution",
    description: "Create a verified university account on our platform. Submit your credentials and get approved within 24 hours.",
    icon: Building2,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500",
    features: ["Quick verification", "Secure onboarding", "Dedicated support"]
  },
  {
    step: "02",
    title: "Upload Student Data",
    description: "Import student information via CSV upload or our API. Supports bulk operations for thousands of students at once.",
    icon: Users,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500",
    features: ["CSV import", "API integration", "Bulk processing"]
  },
  {
    step: "03",
    title: "Mint NFT Certificates",
    description: "Generate tamper-proof certificates on the Solana blockchain. Each certificate is a unique NFT with embedded metadata.",
    icon: FileText,
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-500",
    features: ["Instant minting", "Custom designs", "Blockchain verified"]
  },
  {
    step: "04",
    title: "Verify Anywhere, Anytime",
    description: "Share QR codes or use zero-knowledge proofs for instant verification. Works globally, no intermediaries needed.",
    icon: QrCode,
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500",
    features: ["QR scanning", "ZK proofs", "Global access"]
  }
]

const HowItWorksSection = () => {
  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 left-1/4 w-[300px] sm:w-[400px] lg:w-[600px] h-[300px] sm:h-[400px] lg:h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-24 animate-fade-in px-2">
          <div className="inline-flex mb-4 sm:mb-6">
            <div className="relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-primary rounded-full blur-md opacity-30 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 rounded-full backdrop-blur-sm">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 border border-primary/40">
                  <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary animate-pulse" />
                </div>
                <span className="text-xs sm:text-sm font-black tracking-wide text-primary">
                  4 STEPS
                </span>
                <div className="h-3 sm:h-4 w-px bg-primary/30"></div>
                <span className="text-xs sm:text-sm font-bold text-muted-foreground">
                  Lightning Fast Setup
                </span>
              </div>
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 sm:mb-6">
            From Zero to
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Blockchain in Minutes
            </span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
            Get started with blockchain credentials faster than brewing coffee
          </p>
        </div>

        {/* VERTICAL TIMELINE - Desktop & Mobile */}
        <div className="max-w-5xl mx-auto">
          <div className="relative">

            {/* Vertical line (desktop only) */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent -translate-x-1/2"></div>

            {/* Steps */}
            <div className="space-y-8 sm:space-y-16 lg:space-y-24">
              {steps.map((step, index) => {
                const IconComponent = step.icon
                const isEven = index % 2 === 0

                return (
                  <div
                    key={index}
                    className="relative animate-scale-in"
                    style={{animationDelay: `${index * 0.15}s`}}
                  >
                    {/* Desktop layout */}
                    <div className="hidden lg:grid lg:grid-cols-2 gap-16 items-center">

                      {/* LEFT SIDE */}
                      {isEven ? (
                        <>
                          {/* Content */}
                          <div className="text-right">
                            <div className="inline-block mb-4">
                              <Badge className="bg-primary/10 border-primary/20 text-primary px-4 py-1.5">
                                Step {step.step}
                              </Badge>
                            </div>
                            <h3 className="text-4xl font-black mb-4">{step.title}</h3>
                            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                              {step.description}
                            </p>
                            <div className="flex justify-end gap-2 flex-wrap">
                              {step.features.map((feature, i) => (
                                <div key={i} className="px-3 py-1.5 rounded-full bg-card border border-border text-sm font-medium flex items-center gap-2">
                                  <Check className="h-3 w-3 text-primary" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Icon node */}
                          <div className="flex justify-start">
                            <div className={`relative p-6 rounded-3xl bg-gradient-to-br ${step.color} shadow-2xl shadow-primary/20 group hover:scale-110 transition-transform duration-500`}>
                              <IconComponent className="h-12 w-12 text-white" />
                              {/* Pulse ring */}
                              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${step.color} animate-ping opacity-20`}></div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Icon node */}
                          <div className="flex justify-end">
                            <div className={`relative p-6 rounded-3xl bg-gradient-to-br ${step.color} shadow-2xl shadow-primary/20 group hover:scale-110 transition-transform duration-500`}>
                              <IconComponent className="h-12 w-12 text-white" />
                              {/* Pulse ring */}
                              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${step.color} animate-ping opacity-20`}></div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="text-left">
                            <div className="inline-block mb-4">
                              <Badge className="bg-primary/10 border-primary/20 text-primary px-4 py-1.5">
                                Step {step.step}
                              </Badge>
                            </div>
                            <h3 className="text-4xl font-black mb-4">{step.title}</h3>
                            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                              {step.description}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {step.features.map((feature, i) => (
                                <div key={i} className="px-3 py-1.5 rounded-full bg-card border border-border text-sm font-medium flex items-center gap-2">
                                  <Check className="h-3 w-3 text-primary" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Mobile layout */}
                    <div className="lg:hidden relative bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 lg:p-8 overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-500">
                      {/* Glow */}
                      <div className={`absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 ${step.bgColor}/10 rounded-full blur-3xl`}></div>

                      <div className="relative z-10">
                        {/* Icon & badge */}
                        <div className="flex items-start justify-between mb-4 sm:mb-6">
                          <div className={`p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br ${step.color}`}>
                            <IconComponent className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
                          </div>
                          <Badge className="bg-primary/10 border-primary/20 text-primary px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm">
                            Step {step.step}
                          </Badge>
                        </div>

                        {/* Content */}
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-black mb-2 sm:mb-4">{step.title}</h3>
                        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                          {step.description}
                        </p>

                        {/* Features */}
                        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                          {step.features.map((feature, i) => (
                            <div key={i} className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-muted border border-border text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                              <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Arrow connector (mobile only) */}
                    {index < steps.length - 1 && (
                      <div className="lg:hidden flex justify-center my-4 sm:my-6">
                        <div className="p-2 sm:p-3 rounded-full bg-primary/10 border border-primary/20">
                          <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-bounce-slow" />
                        </div>
                      </div>
                    )}

                  </div>
                )
              })}
            </div>

          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 sm:mt-16 lg:mt-24 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm sm:text-base">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
            <span>Ready in less than 10 minutes</span>
          </div>
        </div>

      </div>
    </section>
  )
}

export default HowItWorksSection
