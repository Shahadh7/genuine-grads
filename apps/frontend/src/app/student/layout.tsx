'use client';
import React from "react"

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  GraduationCap,
  User,
  LogOut,
  Menu,
  X,
  Home,
  FileText,
  Star,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { graphqlClient } from '@/lib/graphql-client';
import { clearSession } from '@/lib/session';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationBell } from '@/components/notifications';

const navigationItems = [
  {
    path: '/student/dashboard',
    label: 'Dashboard',
    icon: Home,
    description: 'Overview and metrics'
  },
  {
    path: '/student/certificates',
    label: 'Certificates',
    icon: FileText,
    description: 'View your certificates'
  },
  {
    path: '/student/achievements',
    label: 'Achievements',
    icon: Star,
    description: 'ZKP badges and awards'
  },
  {
    path: '/student/verification-log',
    label: 'Verification Log',
    icon: History,
    description: 'Verification history'
  },
  {
    path: '/student/account',
    label: 'My Account',
    icon: User,
    description: 'Profile and settings'
  }
];

interface Props {
  // Add props here
}

export default function StudentLayout({children}): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState<any>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<any>(false);
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useRoleGuard(['student']);
  const { disconnect } = useWallet();

  const handleLogout = async () => {
    try {
      await graphqlClient.logout();
    } catch (error) {
      console.warn('Student logout failed, clearing session locally.', error);
    } finally {
      // Disconnect wallet to prevent auto-login
      if (disconnect) {
        await disconnect();
      }
      clearSession();
      router.push('/student-login');
    }
  };

  const handleNavigation = (path) => {
    router.push(path);
    setSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <NotificationProvider role="student">
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-r border-border/50 transform transition-transform duration-200 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">GenuineGrads</h1>
                <p className="text-xs text-muted-foreground">Student Portal</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigationItems.map((item: any) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start h-auto p-3 transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <div className="text-left">
                      <div className={`font-medium ${isActive ? 'text-primary-foreground' : ''}`}>{item.label}</div>
                      <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{item.description}</div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t space-y-2">
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={`
        hidden lg:flex lg:flex-col lg:bg-card/80 lg:backdrop-blur supports-[backdrop-filter]:lg:bg-card/60 lg:border-r lg:border-border/50 lg:flex-shrink-0 transition-all duration-300 ease-in-out relative
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
      `}>
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 relative">
            <div className={`flex items-center space-x-3 transition-opacity duration-200 ${
              sidebarCollapsed ? 'opacity-0' : 'opacity-100'
            }`}>
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">GenuineGrads</h1>
                <p className="text-xs text-muted-foreground">Student Portal</p>
              </div>
            </div>
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="p-1 hover:bg-muted/50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigationItems.map((item: any) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full h-auto p-3 transition-all duration-200 group relative ${
                    sidebarCollapsed
                      ? 'justify-center px-2 py-3'
                      : 'justify-start'
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleNavigation(item.path)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  {!sidebarCollapsed && (
                    <div className="text-left flex-1 ml-3">
                      <div className={`font-medium ${isActive ? 'text-primary-foreground' : ''}`}>{item.label}</div>
                      <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{item.description}</div>
                    </div>
                  )}
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t space-y-2">
            <div className={`flex items-center transition-opacity duration-200 ${
              sidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}>
              <ThemeToggle />
              {!sidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
            {sidebarCollapsed && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Collapsed state toggle button */}
          {sidebarCollapsed && (
            <div className="absolute -right-3 top-8 z-50">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSidebar}
                className="h-6 w-6 p-0 rounded-full bg-background border-2 shadow-lg hover:bg-muted/50 flex items-center justify-center"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile menu button */}
        <div className="lg:hidden sticky top-0 z-30 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-semibold">Student Portal</span>
            </div>

            <NotificationBell viewAllHref="/student/notifications" />
          </div>
        </div>

        {/* Desktop header with notifications */}
        <div className="hidden lg:flex sticky top-0 z-30 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b items-center justify-end px-6 py-3">
          <NotificationBell viewAllHref="/student/notifications" />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-background to-muted/20">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
    </NotificationProvider>
  );
} 