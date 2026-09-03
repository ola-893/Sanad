import type React from "react"
import type { Metadata } from "next"
import { Hanken_Grotesk, JetBrains_Mono, Manrope } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/hooks/use-language"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { EnhancedChatWidget } from "@/components/ai-chat/enhanced-chat-widget"
import { Toaster } from "@/components/ui/sonner"
import { ConditionalLayout } from "@/components/conditional-layout"
import { QueryProvider } from "@/components/query-client-provider"
import { AuthProvider } from "@/components/auth/auth-provider"
import { ProofBanner } from "@/components/proof-banner"

const hankenGrotesk = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans" })
const manrope = Manrope({ subsets: ["latin"], variable: "--font-display" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Sanad - Shariah-Compliant Gold Financing on Creditcoin",
  description:
    "Decentralized Ar-Rahnu gold financing network bridging microfinance operators to global liquidity on Creditcoin 3",
  generator: 'v0.app',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" as="video" type="video/webm" href="/video/hero_2.webm" />
      </head>
      <body className={`${hankenGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable} font-sans`}>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
            <LanguageProvider>
              <AuthProvider>
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
                <EnhancedChatWidget />
                <ProofBanner />
                <Toaster />
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
