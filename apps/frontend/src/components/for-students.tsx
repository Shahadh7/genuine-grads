import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  GraduationCap, 
  Eye, 
  Lock, 
  QrCode, 
  Share2,
  FileText,
  Trophy,
  History,
  CheckCircle2,
  Smartphone
} from "lucide-react"

const features = [
  {
    icon: Eye,
    title: "View NFT Certificates & Badges",
    description: "Access all your academic credentials in one secure digital wallet with beautiful visual representation.",
    benefits: ["Digital wallet", "Visual certificates", "Achievement badges"],
    className: "md:col-span-2"
  },
  {
    icon: Lock,
    title: "Generate ZKPs on Demand",
    description: "Create zero-knowledge proofs to verify your credentials without revealing personal information.",
    benefits: ["Privacy protection", "Selective disclosure", "Instant generation"],
    className: "md:col-span-1"
  },
  {
    icon: QrCode,
    title: "Share Credentials with QR",
    description: "Generate QR codes for instant sharing with employers, institutions, or anyone who needs to verify.",
    benefits: ["One-click sharing", "Mobile scanning", "Secure links"],
    className: "md:col-span-1"
  },
  {
    icon: History,
    title: "Access Verification Logs",
    description: "Track who has verified your certificates and when, with full transparency and control.",
    benefits: ["Verification history", "Access control", "Audit trail"],
    className: "md:col-span-2"
  }
]

const studentBenefits = [
  {
    icon: Trophy,
    title: "Achievement Badges",
    description: "Automatically earn badges for academic excellence, Dean's List, and special achievements.",
    className: "md:col-span-1"
  },
  {
    icon: Smartphone,
    title: "Mobile Access",
    description: "Access your credentials anywhere with our mobile-optimized platform and wallet integration.",
    className: "md:col-span-1"
  },
  {
    icon: FileText,
    title: "Portfolio Building",
    description: "Build a comprehensive digital portfolio showcasing all your academic achievements and skills.",
    className: "md:col-span-1"
  }
]

const ForStudents = () => {
  return (
    <section id="students" className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            For Students
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-4">
            Your Digital Academic Identity
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Own your academic credentials like never before. Access, share, and verify your certificates 
            with complete privacy and control.
          </p>
        </div>

        {/* Bento Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {features.map((feature: any, index: any) => {
            const IconComponent = feature.icon
            return (
              <Card key={index} className={`group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 ${feature.className}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {feature.benefits.map((benefit: any, benefitIndex: any) => (
                      <div key={benefitIndex} className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Student Benefits Bento Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center text-foreground mb-8">
            Why Students Love GenuineGrads
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {studentBenefits.map((benefit: any, index: any) => {
              const IconComponent = benefit.icon
              return (
                <Card key={index} className={`text-center p-6 hover:shadow-lg transition-all duration-300 ${benefit.className}`}>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {benefit.description}
                    </CardDescription>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Privacy & Security */}
        <Card className="mb-16 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-primary" />
              <span>Privacy & Security First</span>
            </CardTitle>
            <CardDescription>
              Your data belongs to you. We use zero-knowledge proofs to ensure your privacy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">100%</div>
                <div className="text-sm text-muted-foreground">Data Ownership</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">Zero</div>
                <div className="text-sm text-muted-foreground">Personal Data Stored</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">End-to-End</div>
                <div className="text-sm text-muted-foreground">Encryption</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready to Own Your Academic Future?
            </h3>
            <p className="text-muted-foreground mb-8">
              Join thousands of students who have already taken control of their academic credentials.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80">
                Access My Credentials
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ForStudents 