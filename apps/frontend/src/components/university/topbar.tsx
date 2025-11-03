'use client';
import React from "react";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Wallet, 
  LogOut, 
  User, 
  Settings, 
  Bell,
  ChevronDown,
  Building
} from 'lucide-react';
import { clearSession } from '@/lib/session';

interface Props {
  // Add props here
}

export default function Topbar({session, walletAddress}): React.React.JSX.Element {
  const router = useRouter();
  const [notifications] = useState<any>(3);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatWalletAddress = (address) => {
    if (!address) return 'Not Connected';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Mobile menu, title, and wallet */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu trigger - hidden on desktop since sidebar is always visible */}
          <div className="lg:hidden">
            <Button variant="ghost" size="sm" className="p-2">
              <Building className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Mobile title */}
          <div className="lg:hidden">
            <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          </div>

          {/* Wallet Status - moved to left side */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <Badge 
              variant={walletAddress ? "default" : "secondary"}
              className="text-xs font-medium"
            >
              {formatWalletAddress(walletAddress)}
            </Badge>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative p-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs font-medium"
              >
                {notifications}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 px-3 py-2 hover:bg-muted/50">
                <Avatar className="h-8 w-8 border-2 border-muted">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getInitials(session?.nic || 'UN')}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-foreground">{session?.nic}</p>
                  <p className="text-xs text-muted-foreground">{session?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="p-3 border-b">
                <p className="text-sm font-medium text-foreground">{session?.nic}</p>
                <p className="text-xs text-muted-foreground">{session?.email}</p>
              </div>
              <DropdownMenuItem className="flex items-center space-x-2 py-2.5">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center space-x-2 py-2.5">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center space-x-2 py-2.5 text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
} 