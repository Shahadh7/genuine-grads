'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { graphqlClient } from '@/lib/graphql-client';
import { clearSession, getDefaultRouteForRole } from '@/lib/session';
import { useSession } from '@/hooks/useSession';

const Navbar = () => {
  const router = useRouter();
  const session = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen((open) => !open);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMobileMenuToggle();
    }
  };

  const handleLogout = async () => {
    try {
      await graphqlClient.logout();
    } catch (error) {
      console.warn('Logout request failed, clearing session locally.', error);
    }
    clearSession();
    router.push('/login');
    setMobileMenuOpen(false);
  };

  const goToRoleHome = () => {
    if (!session) return '/login';
    return getDefaultRouteForRole(session.role);
  };

  const renderAuthenticatedLinks = () => (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-foreground/80 hover:text-foreground hover:bg-accent/50"
        onClick={() => {
          router.push(goToRoleHome());
          setMobileMenuOpen(false);
        }}
      >
        Dashboard
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-foreground"
        onClick={handleLogout}
      >
        Logout
      </Button>
      <ThemeToggle />
    </>
  );

  const renderUnauthenticatedLinks = () => (
    <>
      <Link href="/verify">
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground/80 hover:text-foreground hover:bg-accent/50"
        >
          Verify
        </Button>
      </Link>
      <Link href="/student-login">
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground/80 hover:text-foreground hover:bg-accent/50"
        >
          Student Portal
        </Button>
      </Link>
      <Link href="/login">
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground/80 hover:text-foreground hover:bg-accent/50"
        >
          Login
        </Button>
      </Link>
      <Link href="/admin/universities/register">
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/25"
        >
          Register University
        </Button>
      </Link>
      <ThemeToggle />
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link
              href={session ? goToRoleHome() : '/'}
              className="flex items-center space-x-2 text-xl font-bold text-primary hover:text-primary/80 transition-colors"
              aria-label="GenuineGrads Home"
            >
              <GraduationCap className="h-8 w-8" />
              <span>GenuineGrads</span>
            </Link>
          </div>

          <div className="hidden lg:flex lg:items-center lg:space-x-3">
            {session ? renderAuthenticatedLinks() : renderUnauthenticatedLinks()}
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
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2 bg-background/95 backdrop-blur border-t border-border/50">
            {session ? (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push(goToRoleHome());
                    setMobileMenuOpen(false);
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push('/verify');
                    setMobileMenuOpen(false);
                  }}
                >
                  Verify Certificate
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push('/student-login');
                    setMobileMenuOpen(false);
                  }}
                >
                  Student Portal
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push('/login');
                    setMobileMenuOpen(false);
                  }}
                >
                  Admin Login
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push('/admin/universities/register');
                    setMobileMenuOpen(false);
                  }}
                >
                  Register University
                </Button>
              </>
            )}
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
  );
};

export default Navbar;
