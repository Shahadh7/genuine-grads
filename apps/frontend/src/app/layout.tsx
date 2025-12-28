import React, { Suspense } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import "@solana/wallet-adapter-react-ui/styles.css"
import { ThemeProvider } from "@/components/theme-provider"
import SolanaWalletProvider from "@/components/wallet/wallet-provider"
import LayoutWrapper from "@/components/layout-wrapper"
import { ToastProvider } from "@/components/ui/toast-provider"
import { NavigationLoader } from "@/components/navigation/NavigationLoader"
import { Metadata } from "next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GenuineGrads - NFT Academic Credentials on Solana",
  description: "Verify academic credentials instantly with NFT-based certificates and achievement badges on the Solana blockchain using Metaplex Bubblegum v2.",
  keywords: "NFT, academic credentials, Solana, blockchain, certificates, verification, Metaplex, Bubblegum",
  authors: [{ name: "GenuineGrads Team" }],
  creator: "GenuineGrads",
  publisher: "GenuineGrads",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://genuinegrads.xyz"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "GenuineGrads - NFT Academic Credentials on Solana",
    description: "Verify academic credentials instantly with NFT-based certificates and achievement badges on the Solana blockchain.",
    url: "https://genuinegrads.xyz",
    siteName: "GenuineGrads",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GenuineGrads - NFT Academic Credentials",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GenuineGrads - NFT Academic Credentials on Solana",
    description: "Verify academic credentials instantly with NFT-based certificates and achievement badges on the Solana blockchain.",
    images: ["/og-image.png"],
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SolanaWalletProvider>
            <ToastProvider>
              <Suspense fallback={null}>
                <NavigationLoader />
              </Suspense>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </ToastProvider>
          </SolanaWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 