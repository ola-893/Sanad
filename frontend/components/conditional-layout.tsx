'use client'

import { usePathname } from 'next/navigation'
import { ExternalHeader } from "@/components/external-header"
import { Header } from "@/components/header"
import { BorrowerHeader } from "@/components/borrower-header"
import { Footer } from "@/components/footer"
import { useState, useEffect } from 'react'
import { BrandedLoader } from "@/components/branded-loader"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

/**
 * Routes that have their own layout with header/sidebar — no global header/footer.
 */
const fullLayoutRoutes = ['/pawnshop', '/admin', '/login', '/register', '/register/kyc']

/**
 * Public pages that always show the external (marketing) header + footer,
 * regardless of auth state.
 */
const publicPages = ['/', '/about', '/how-it-works', '/ar-rahnu-industry', '/faq', '/contact', '/forgot-password']

/**
 * Routes that show the external header but NO footer.
 * Register/onboarding flows should not duplicate the footer.
 */
const noFooterRoutes = ['/register', '/register/kyc']

function isPublicPage(pathname: string) {
  return publicPages.some(p => pathname === p || pathname === p + '/')
}

function hasNoFooter(pathname: string) {
  return noFooterRoutes.some(p => pathname === p || pathname === p + '/')
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const [authed, setAuthed] = useState<boolean | null>(null)

  // Synchronous check on mount and on route change — read localStorage directly,
  // so the header flips to internal right after a client-side login navigation
  useEffect(() => {
    try {
      const raw = localStorage.getItem('authState')
      const auth = raw ? JSON.parse(raw) : null
      const hasToken = !!auth?.token
      // Only check for token — user data is fetched by ProtectedRoute
      setAuthed(hasToken)
    } catch {
      setAuthed(false)
    }
  }, [pathname])

  // Full layout pages — no global header/footer
  const isFullLayout = fullLayoutRoutes.some(route => pathname.startsWith(route))
  if (isFullLayout) {
    return <div className="min-h-screen">{children}</div>
  }

  // Still loading auth state — show branded loader briefly
  if (authed === null) {
    if (isPublicPage(pathname)) {
      return (
        <div className="flex flex-col min-h-screen">
          <ExternalHeader />
          <main className="flex-1">{children}</main>
          {!hasNoFooter(pathname) && <Footer />}
        </div>
      )
    }
    return <BrandedLoader message="Loading..." />
  }

  // Public pages — always external header + footer, even if logged in
  if (isPublicPage(pathname)) {
    return (
      <div className="flex flex-col min-h-screen">
        <ExternalHeader />
        <main className="flex-1">{children}</main>
        {!hasNoFooter(pathname) && <Footer />}
      </div>
    )
  }

  // Authenticated users on other pages — internal header, no footer
  if (authed) {
    const isBorrowerRoute = pathname.startsWith('/dashboard/borrower')
    return (
      <div className="flex flex-col min-h-screen">
        {isBorrowerRoute ? <BorrowerHeader /> : <Header />}
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  // Unauthenticated users on other pages — external header, footer only if not excluded
  return (
    <div className="flex flex-col min-h-screen">
      <ExternalHeader />
      <main className="flex-1">{children}</main>
      {!hasNoFooter(pathname) && <Footer />}
    </div>
  )
}
