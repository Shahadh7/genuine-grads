"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, X, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleMobileMenuToggle()
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-xl font-bold text-primary hover:text-primary/80 transition-colors"
              aria-label="GenuineGrads Home"
            >
              <GraduationCap className="h-8 w-8" />
              <span>GenuineGrads</span>
            </Link>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex lg:items-center lg:space-x-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground hover:bg-accent/50">
                Login
              </Button>
            </Link>
            <Link href="/register-university">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/25">
                Register University
              </Button>
            </Link>
            <ThemeToggle />
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMobileMenuToggle}
              onKeyDown={handleKeyDown}
              aria-label="Toggle mobile menu"
              tabIndex={0}
              className="text-foreground/80 hover:text-foreground hover:bg-accent/50"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2 bg-background/95 backdrop-blur border-t border-border/50">
            <Link
              href="/login"
              className="block rounded-md px-3 py-2 text-base font-medium text-foreground/80 transition-colors hover:text-foreground hover:bg-accent/50"
            >
              Login
            </Link>
            <Link
              href="/register-university"
              className="block rounded-md px-3 py-2 text-base font-medium text-foreground/80 transition-colors hover:text-foreground hover:bg-accent/50"
            >
              Register University
            </Link>
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/60">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar 