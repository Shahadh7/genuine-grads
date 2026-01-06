import React from "react"
import Link from "next/link"
import { GraduationCap } from "lucide-react"

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Brand */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center space-x-2 text-xl font-bold text-primary mb-4"
            aria-label="GenuineGrads Home"
          >
            <GraduationCap className="h-8 w-8" />
            <span>GenuineGrads</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Revolutionizing academic credentials with blockchain technology. 
            Secure, verifiable, and tamper-proof certificates powered by Solana.
          </p>
        </div>

        {/* Bottom Section */}
        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © 2024 GenuineGrads. All rights reserved.
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Built on</span>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
              <span className="font-medium">Solana</span>
            </div>
            <span>•</span>
            <span>Powered by</span>
            <span className="font-medium">Metaplex</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
