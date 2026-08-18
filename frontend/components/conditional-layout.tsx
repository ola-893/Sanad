'use client'

import { usePathname } from 'next/navigation'
import { Header } from "@/components/header"
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
  
  // Routes that should not show header/footer (full layout pages)
  // These have their own layout with header/sidebar
  const fullLayoutRoutes = [
    '/investor',
    '/pawnshop',
    '/admin',
  ]
  
  // Check if current path starts with any of the full layout routes
  const isFullLayout = fullLayoutRoutes.some(route => pathname.startsWith(route))
  
  if (isFullLayout) {
    // For full layout pages (investor, admin, pawnshop), render children without header/footer
    return <div className="min-h-screen">{children}</div>
  }
  
  // For authenticated users on non-layout routes: header only, no footer
  if (loggedIn) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    )
  }
  
  // For regular pages (visitors), render with header and footer
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
