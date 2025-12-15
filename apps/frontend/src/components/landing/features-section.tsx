"use client"

import React from "react"
import {
  Building2,
  GraduationCap,
  Briefcase,
  FileText,
  Trophy,
  Users,
  CheckCircle2
} from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "For Universities",
    description: "Issue & manage NFT certificates with bulk operations",
    features: ["Batch minting", "Custom templates", "Analytics dashboard"],
    gradient: "from-blue-500/10 to-cyan-500/10"
  },
  {
    icon: GraduationCap,
    title: "For Students",
    description: "Own your credentials as NFTs with lifetime access",
    features: ["Portable credentials", "Achievement badges", "QR verification"],
    gradient: "from-purple-500/10 to-pink-500/10"
  },
  {
    icon: Briefcase,
    title: "For Employers",
    description: "Verify credentials instantly with zero-knowledge proofs",
    features: ["Instant verification", "No manual checks", "Privacy-preserving"],
    gradient: "from-green-500/10 to-emerald-500/10"
  }
]

const stats = [
  { icon: FileText, value: "50K+", label: "Certificates Issued" },
  { icon: Building2, value: "100+", label: "Universities" },
  { icon: Users, value: "25K+", label: "Students" },
  { icon: Trophy, value: "99.9%", label: "Verification Rate" }
]

const FeaturesSection = () => {
  return (
    <section className="py-20 sm:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Features Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <div
                key={index}
                className={`bg-gradient-to-br ${feature.gradient} backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:border-primary/30 transition-all duration-300 group hover:shadow-xl animate-fade-in`}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="p-3 rounded-xl bg-card/80 mb-6 inline-block group-hover:scale-110 transition-transform">
                  <IconComponent className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div
                key={index}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center hover:border-primary/30 transition-all duration-300 hover:shadow-lg animate-fade-in"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="p-2 rounded-lg bg-primary/10 mb-3 inline-block">
                  <IconComponent className="h-5 w-5 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
