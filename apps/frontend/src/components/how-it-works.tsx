import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  Users, 
  FileText, 
  QrCode, 
  ArrowRight,
  CheckCircle2 
} from "lucide-react"

const steps = [
  {
    step: 1,
    title: "Register University",
    description: "Universities create their account and verify their identity on the platform.",
    icon: Building2,
    features: ["Identity verification", "Admin dashboard", "Custom branding"],
    className: "md:col-span-1"
  },
  {
    step: 2,
    title: "Upload Students",
    description: "Add students manually or import via CSV with their academic information.",
    icon: Users,
    features: ["Bulk CSV import", "Student management", "Data validation"],
    className: "md:col-span-1"
  },
  {
    step: 3,
    title: "Mint NFT Certificates & Badges",
    description: "Issue tamper-proof NFT certificates and achievement badges on Solana.",
    icon: FileText,
    features: ["Metaplex Bubblegum v2", "Custom metadata", "Batch minting"],
    className: "md:col-span-1"
  },
  {
    step: 4,
    title: "Verify via QR or ZKP",
    description: "Employers can instantly verify certificates using QR codes or zero-knowledge proofs.",
    icon: QrCode,
    features: ["QR code generation", "ZK proof verification", "Real-time validation"],
    className: "md:col-span-1"
  }
]

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            How It Works
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-4">
            Simple 4-Step Process
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From university registration to instant certificate verification, our platform makes it easy to issue and verify academic credentials.
          </p>
        </div>

        {/* Bento Grid Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {steps.map((step: any, index: any) => {
            const IconComponent = step.icon
            return (
              <Card key={step.step} className={`h-full border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg ${step.className}`}>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex items-center justify-center mb-2">
                    <Badge variant="secondary" className="text-xs">
                      Step {step.step}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-sm mb-4">
                    {step.description}
                  </CardDescription>
                  <div className="space-y-2">
                    {step.features.map((feature: any, featureIndex: any) => (
                      <div key={featureIndex} className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Ready to get started?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register-university"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Register Your University
            </a>
            <a
              href="/example-certificate"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View Example Certificate
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks 