import Link from "next/link"
import { 
  GraduationCap, 
  Github, 
  Mail, 
  ExternalLink,
  Twitter,
  Linkedin
} from "lucide-react"

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-xl font-bold text-primary mb-4"
              aria-label="GenuineGrads Home"
            >
              <GraduationCap className="h-8 w-8" />
              <span>GenuineGrads</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Revolutionizing academic credentials with blockchain technology. 
              Secure, verifiable, and tamper-proof certificates powered by Solana.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://github.com/genuinegrads" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a 
                href="https://twitter.com/genuinegrads" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://linkedin.com/company/genuinegrads" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a 
                href="mailto:support@genuinegrads.xyz" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/#how-it-works" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link 
                  href="/#universities" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  For Universities
                </Link>
              </li>
              <li>
                <Link 
                  href="/#students" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  For Students
                </Link>
              </li>
              <li>
                <Link 
                  href="/#employers" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  For Employers
                </Link>
              </li>
              <li>
                <Link 
                  href="/example-certificate" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Example Certificate
                </Link>
              </li>
              <li>
                <Link 
                  href="/verify" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Verify Certificate
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://docs.genuinegrads.xyz/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center"
                >
                  Documentation
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/genuinegrads" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center"
                >
                  GitHub
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
              <li>
                <Link 
                  href="/about" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:support@genuinegrads.xyz" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center"
                >
                  support@genuinegrads.xyz
                </a>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/demo" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Request Demo
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground mb-4 md:mb-0">
            © 2024 GenuineGrads. All rights reserved.
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
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