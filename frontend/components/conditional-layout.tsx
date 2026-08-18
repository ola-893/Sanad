'use client'

import { usePathname } from 'next/navigation'
import { ExternalHeader } from "@/components/external-header"
import { InternalHeader } from "@/components/internal-header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/hooks/use-auth"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [user] = useAtom(userAtom)
  const loggedIn = isAuthenticated || !!user
  
  // Routes that have their own layout with header/sidebar
  const fullLayoutRoutes = [
    '/investor',
    '/pawnshop',
    '/admin',
  ]
  
  const isFullLayout = fullLayoutRoutes.some(route => pathname.startsWith(route))
  
  // Full layout pages — no global header/footer
  if (isFullLayout) {
    return <div className="min-h-screen">{children}</div>
  }
  
  // Landing page — always show external header + footer
  const isLanding = pathname === "/"
  if (isLanding) {
    return (
      <div className="flex flex-col min-h-screen">
        <ExternalHeader />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    )
  }
  
  // Authenticated users on other pages — internal header, no footer
  if (loggedIn) {
    return (
      <div className="flex flex-col min-h-screen">
        <InternalHeader />
        <main className="flex-1">{children}</main>
      </div>
    )
  }
  
  // Visitors on other public pages — external header + footer
  return (
    <div className="flex flex-col min-h-screen">
      <ExternalHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
