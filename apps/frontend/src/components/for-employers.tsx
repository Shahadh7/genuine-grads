import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  QrCode, 
  FileText, 
  Shield, 
  Clock,
  CheckCircle2,
  Zap
} from "lucide-react"

const verificationMethods = [
  {
    icon: QrCode,
    title: "Scan QR Code",
    description: "Simply scan the QR code provided by the candidate to instantly verify their credentials.",
    benefits: ["Instant verification", "Mobile-friendly", "No manual input"],
    className: "md:col-span-1"
  },
  {
    icon: Search,
    title: "Input Certificate ID",
    description: "Enter the certificate ID manually to access detailed verification information.",
    benefits: ["Detailed view", "Full metadata", "Verification history"],
    className: "md:col-span-1"
  },
  {
    icon: Shield,
    title: "Validate ZKP Proof",
    description: "Verify zero-knowledge proofs to confirm credentials without accessing personal data.",
    benefits: ["Privacy-preserving", "Cryptographic proof", "Selective disclosure"],
    className: "md:col-span-1"
  }
]

const verificationFeatures = [
  {
    icon: FileText,
    title: "View Certificate Metadata",
    description: "Access comprehensive certificate information including issuer, date, and academic details.",
    className: "md:col-span-1"
  },
  {
    icon: Clock,
    title: "Check Revocation Status",
    description: "Verify that certificates haven't been revoked and are still valid.",
    className: "md:col-span-1"
  },
  {
    icon: Zap,
    title: "Real-time Validation",
    description: "Get instant verification results with blockchain-level security and transparency.",
    className: "md:col-span-1"
  }
]

const ForEmployers = () => {
  return (
    <section id="employers" className="py-20 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            For Employers
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-4">
            Verify Credentials in Seconds
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Eliminate credential fraud and streamline your hiring process with instant, 
            blockchain-verified academic credentials.
          </p>
        </div>

        {/* Verification Methods Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {verificationMethods.map((method: any, index: any) => {
            const IconComponent = method.icon
            return (
              <Card key={index} className={`group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 ${method.className}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {method.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {method.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {method.benefits.map((benefit: any, benefitIndex: any) => (
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

        {/* Verification Features Bento Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center text-foreground mb-8">
            Comprehensive Verification Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {verificationFeatures.map((feature: any, index: any) => {
              const IconComponent = feature.icon
              return (
                <Card key={index} className={`text-center p-6 hover:shadow-lg transition-all duration-300 ${feature.className}`}>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Benefits for Employers */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center text-foreground mb-8">
            Benefits for Your Organization
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center p-6 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-3xl font-bold text-primary">90%</div>
                <div className="text-sm text-muted-foreground">Faster Verification</div>
              </div>
            </Card>
            <Card className="text-center p-6 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Fraud Prevention</div>
              </div>
            </Card>
            <Card className="text-center p-6 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-3xl font-bold text-primary">$0</div>
                <div className="text-sm text-muted-foreground">Verification Cost</div>
              </div>
            </Card>
            <Card className="text-center p-6 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Availability</div>
              </div>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Start Verifying Credentials Today
            </h3>
            <p className="text-muted-foreground mb-8">
              Join leading companies worldwide in adopting blockchain-verified academic credentials.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80">
                Try Verification Demo
              </Button>
              <Button variant="outline" size="lg">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ForEmployers 