import React from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Rocket, 
  Building2, 
  Play,
  ArrowRight,
  Sparkles
} from "lucide-react"

const CTASection = () => {
  return (
    <section className="py-20 sm:py-32 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Main Content */}
          <div className="relative">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
                <Rocket className="h-10 w-10 text-primary" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-6">
              Join the{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Blockchain Revolution
              </span>
              <br />
              in Education
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Be part of the future of academic credentials. Universities, students, and employers worldwide 
              are already transforming how they issue, own, and verify academic achievements.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">100+</div>
                <div className="text-sm text-muted-foreground">Universities</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">50K+</div>
                <div className="text-sm text-muted-foreground">Certificates Issued</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">99.8%</div>
                <div className="text-sm text-muted-foreground">Verification Rate</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/admin/universities/register">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200 text-base px-8 py-3"
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  Register Your University
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 hover:bg-accent hover:text-accent-foreground transition-all duration-200 text-base px-8 py-3"
              >
                <Play className="h-5 w-5 mr-2" />
                Request a Demo
              </Button>
            </div>

            {/* Additional Links */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <a 
                href="/example-certificate" 
                className="text-primary hover:text-primary/80 transition-colors flex items-center justify-center"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                View Example Certificate
              </a>
              <span className="text-muted-foreground hidden sm:block">•</span>
              <a 
                href="/verify" 
                className="text-primary hover:text-primary/80 transition-colors flex items-center justify-center"
              >
                Try Verification Demo
              </a>
              <span className="text-muted-foreground hidden sm:block">•</span>
              <a 
                href="https://docs.genuinegrads.xyz/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors flex items-center justify-center"
              >
                Read Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTASection 