import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Building2, 
  FileText, 
  Users, 
  BarChart3, 
  Upload,
  Shield,
  Zap,
  CheckCircle2
} from "lucide-react"

const features = [
  {
    icon: FileText,
    title: "Certificate Editor",
    description: "Create beautiful, customizable certificates with your university branding and design templates.",
    benefits: ["Drag & drop editor", "Custom templates", "Brand integration"],
    className: "md:col-span-2"
  },
  {
    icon: Upload,
    title: "Bulk Student Registration",
    description: "Import thousands of students at once via CSV or integrate with your existing student management system.",
    benefits: ["CSV import", "API integration", "Data validation"],
    className: "md:col-span-1"
  },
  {
    icon: Shield,
    title: "NFT Issuance & Revocation",
    description: "Mint certificates as NFTs and revoke them if needed with full audit trail and transparency.",
    benefits: ["Batch minting", "Revocation control", "Audit logs"],
    className: "md:col-span-1"
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track certificate issuance, verification rates, and student engagement with comprehensive dashboards.",
    benefits: ["Live metrics", "Export reports", "Performance insights"],
    className: "md:col-span-2"
  }
]

const stats = [
  { label: "Certificates Issued", value: "50,000+", icon: FileText },
  { label: "Universities", value: "100+", icon: Building2 },
  { label: "Verification Rate", value: "99.8%", icon: CheckCircle2 },
  { label: "Cost per Certificate", value: "$0.01", icon: Zap }
]

const ForUniversities = () => {
  return (
    <section id="universities" className="py-20 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            For Universities
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-4">
            Streamline Your Certificate Management
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Issue tamper-proof academic credentials with our comprehensive university dashboard. 
            From certificate creation to analytics, we've got you covered.
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat: any, index: any) => {
            const IconComponent = stat.icon
            return (
              <Card key={index} className="text-center p-6 hover:shadow-md transition-all duration-300">
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready to Transform Your Certificate Process?
            </h3>
            <p className="text-muted-foreground mb-8">
              Join leading universities worldwide in adopting blockchain-based academic credentials.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/admin/universities/register">
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80">
                  Register Your University
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                Request a Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ForUniversities 