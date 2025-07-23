import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
