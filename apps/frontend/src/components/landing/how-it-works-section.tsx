"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Users,
  FileText,
  QrCode,
  ArrowRight
} from "lucide-react"

const steps = [
  {
    step: "01",
    title: "Register",
    description: "Universities create verified accounts",
    icon: Building2,
    color: "from-blue-500 to-cyan-500"
  },
  {
    step: "02",
    title: "Upload",
    description: "Bulk import students via CSV",
    icon: Users,
    color: "from-purple-500 to-pink-500"
  },
  {
    step: "03",
    title: "Mint NFTs",
    description: "Issue tamper-proof certificates on-chain",
    icon: FileText,
    color: "from-orange-500 to-red-500"
  },
  {
    step: "04",
    title: "Verify",
    description: "Instant QR or ZK-proof verification",
    icon: QrCode,
    color: "from-green-500 to-emerald-500"
  }
]

const HowItWorksSection = () => {
  return (
    <section className="py-20 sm:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4">
            Simple Process
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to secure academic credentials on the blockchain
          </p>
        </div>

        {/* Desktop Layout - Horizontal */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-8 relative">
          {/* Connection Lines */}
          <div className="absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

          {steps.map((step, index) => {
            const IconComponent = step.icon
            return (
              <div
                key={index}
                className="relative animate-fade-in"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-xl group">
                  {/* Step Number Badge */}
                  <div className="absolute -top-3 -left-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                      {step.step}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="p-4 rounded-xl bg-primary/10 mb-4 inline-block group-hover:scale-110 transition-transform">
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Arrow Between Steps */}
                {index < steps.length - 1 && (
                  <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                    <ArrowRight className="h-6 w-6 text-primary/40" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile & Tablet Layout - Vertical */}
        <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, index) => {
            const IconComponent = step.icon
            return (
              <div
                key={index}
                className="relative animate-fade-in"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 group">
                  {/* Step Number Badge */}
                  <div className="absolute -top-3 -left-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                      {step.step}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="p-4 rounded-xl bg-primary/10 mb-4 inline-block group-hover:scale-110 transition-transform">
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
