"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps as NextThemeProviderProps } from "next-themes"

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: NextThemeProviderProps['attribute'];
  defaultTheme?: NextThemeProviderProps['defaultTheme'];
  enableSystem?: NextThemeProviderProps['enableSystem'];
  disableTransitionOnChange?: NextThemeProviderProps['disableTransitionOnChange'];
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps): React.React.JSX.Element {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
} 