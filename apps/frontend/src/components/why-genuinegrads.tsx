import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  Trophy, 
  Lock, 
  QrCode, 
  Zap, 
  Database,
  CheckCircle2,
  Sparkles,
  FileText
} from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Tamper-proof NFT credentials",
    description: "All certificates are stored as immutable NFTs on the Solana blockchain, ensuring they cannot be altered or forged.",
    badge: "Security"
  },
  {
    icon: Trophy,
    title: "Claimable GPA / Dean's List badges",
    description: "Students can claim achievement badges for academic excellence, automatically minted based on their performance.",
    badge: "Achievements"
  },
  {
    icon: Lock,
    title: "ZK proof generation and verification",
    description: "Zero-knowledge proofs allow verification of credentials without revealing sensitive personal information.",
    badge: "Privacy"
  },
  {
    icon: QrCode,
    title: "QR-based employer scanning",
    description: "Instant verification through QR codes that employers can scan to validate certificates in real-time.",
    badge: "Convenience"
  },
  {
    icon: Zap,
    title: "Built on Solana with Bubblegum v2",
    description: "Leveraging Solana's high-speed, low-cost infrastructure with Metaplex Bubblegum v2 for efficient NFT minting.",
    badge: "Technology"
  },
  {
    icon: Database,
    title: "Helius RPC integration",
    description: "Powered by Helius RPC for reliable, high-performance blockchain interactions and data retrieval.",
    badge: "Infrastructure"
  }
]

const WhyGenuineGrads = () => {
  return (
    <section className="py-20 sm:py-32 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/3"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/10">
            Why Choose GenuineGrads
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-6">
            Revolutionary Academic Credentials
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Combining blockchain technology with zero-knowledge proofs to create the most secure and efficient academic credential system.
          </p>
        </div>

        {/* Modern Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {features.map((feature: any, index: any) => {
            const IconComponent = feature.icon
            return (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/30 bg-card/50 backdrop-blur-sm h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors border border-primary/20">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Stats with modern design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center p-8 hover:shadow-xl transition-all duration-300 border border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </Card>
          <Card className="text-center p-8 hover:shadow-xl transition-all duration-300 border border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary">&lt;1s</div>
              <div className="text-sm text-muted-foreground">Verification Time</div>
            </div>
          </Card>
          <Card className="text-center p-8 hover:shadow-xl transition-all duration-300 border border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary">$0.01</div>
              <div className="text-sm text-muted-foreground">Per Certificate</div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default WhyGenuineGrads 