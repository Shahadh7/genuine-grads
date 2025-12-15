"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

const CTASection = () => {
  return (
    <section className="py-20 sm:py-32 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(217,119,6,0.1),transparent_70%)]"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto animate-fade-in">
          {/* Main CTA Card */}
          <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-8 sm:p-12 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Sparkles className="w-4 h-4 text-primary mr-2" />
                <span className="text-sm font-medium text-primary">Start Today</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Ready to Revolutionize
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Academic Credentials?
                </span>
              </h2>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Join universities worldwide in adopting blockchain-based credentials. Secure, instant, and cost-effective.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/admin/universities/register">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg shadow-lg shadow-primary/25 group w-full sm:w-auto">
                    Register Your University
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/verify">
                  <Button variant="outline" size="lg" className="border-border hover:bg-accent font-semibold px-8 py-6 text-lg w-full sm:w-auto">
                    Verify a Certificate
                  </Button>
                </Link>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="pt-8 border-t border-border/50">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">$0.01</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Per Certificate</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">&lt;1s</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Verification Time</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">100%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Tamper-Proof</div>
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
