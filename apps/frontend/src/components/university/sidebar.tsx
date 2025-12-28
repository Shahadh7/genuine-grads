'use client';
import React from "react";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Award, 
  BarChart3, 
  Settings, 
  Menu,
  X,
  Building,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/university/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/university/students', icon: Users },
  { name: 'Certificates', href: '/university/certificates', icon: Award },
  { name: 'Analytics', href: '/university/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/university/settings', icon: Settings },
  { name: 'Blockchain Setup', href: '/university/settings/blockchain', icon: Shield },
];

interface Props {
  // Add props here
}

export default function Sidebar({session}): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState<any>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<any>(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 bg-card border-r transform transition-transform duration-200 ease-in-out lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Building className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">GenuineGrads</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navigation.map((item: any) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:bg-card lg:border-r lg:flex-shrink-0 transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "lg:w-16" : "lg:w-80"
      )}>
        <div className="flex items-center justify-between p-4 border-b relative">
          <div className={cn(
            "flex items-center space-x-2 transition-opacity duration-200",
            sidebarCollapsed ? "opacity-0" : "opacity-100"
          )}>
            <Building className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">GenuineGrads</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "p-1 transition-all duration-200 hover:bg-muted/50",
              sidebarCollapsed ? "absolute right-2 top-1/2 -translate-y-1/2" : ""
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item: any) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors w-full group relative",
                  sidebarCollapsed 
                    ? "justify-center px-2 py-3" 
                    : "space-x-3 px-3 py-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className={cn(
                  "transition-opacity duration-200",
                  sidebarCollapsed ? "opacity-0 w-0" : "opacity-100 flex-1"
                )}>
                  {item.name}
                </span>
                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapsed state toggle button - more visible */}
        {sidebarCollapsed && (
          <div className="absolute -right-3 top-8 z-50">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSidebar}
              className="h-6 w-6 p-0 rounded-full bg-background border-2 shadow-lg hover:bg-muted/50"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile menu button */}
      <div className={cn(
        "lg:hidden fixed top-4 left-4 z-50 transition-opacity duration-200",
        sidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="bg-card/80 backdrop-blur"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
} 