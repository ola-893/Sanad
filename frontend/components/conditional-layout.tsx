'use client'

import { usePathname } from 'next/navigation'
import { ExternalHeader } from "@/components/external-header"
import { InternalHeader } from "@/components/internal-header"
import { Footer } from "@/components/footer"
import { useState, useEffect } from 'react'
import { BrandedLoader } from "@/components/branded-loader"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

/**
 * Routes that have their own layout with header/sidebar — no global header/footer.
 */
const fullLayoutRoutes = ['/investor', '/pawnshop', '/admin', '/login']

/**
 * Public pages that always show the external (marketing) header + footer,
 * regardless of auth state.
 */
const publicPages = ['/', '/about', '/how-it-works', '/ar-rahnu-industry', '/faq', '/contact', '/register', '/forgot-password']

function isPublicPage(pathname: string) {
  return publicPages.some(p => pathname === p || pathname === p + '/')
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
      const userRaw = localStorage.getItem('authStorage')
      const userStore = userRaw ? JSON.parse(userRaw) : null
      const hasUser = !!userStore?.user?.userInfo
      setAuthed(hasToken && hasUser)
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
    // On public pages, don't flash the loader — just render without header decisions
    if (isPublicPage(pathname)) {
      return (
        <div className="flex flex-col min-h-screen">
          <ExternalHeader />
          <main className="flex-1">{children}</main>
          <Footer />
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
        <Footer />
      </div>
    )
  }

  // Authenticated users on other pages — internal header, no footer
  if (authed) {
    return (
      <div className="flex flex-col min-h-screen">
        <InternalHeader />
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  // Unauthenticated users on other pages — external header + footer
  return (
    <div className="flex flex-col min-h-screen">
      <ExternalHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
