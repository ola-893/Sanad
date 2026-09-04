"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useAuth } from "@/hooks/use-auth"
import { Menu, X, LayoutDashboard, Inbox, FileText, User, LogOut, Loader2, CreditCard, TrendingUp, Users, DollarSign } from "lucide-react"

const pawnshopNav = [
  { href: "/pawnshop/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pawnshop/requests", label: "Requests", icon: Inbox },
  { href: "/pawnshop/payments", label: "Payments", icon: CreditCard },
  { href: "/pawnshop/repayments", label: "Loans", icon: TrendingUp },
  { href: "/pawnshop/returns", label: "Returns", icon: DollarSign },
  { href: "/pawnshop/borrowers", label: "Borrowers", icon: Users },
  { href: "/pawnshop/nfts", label: "NFTs", icon: FileText },
  { href: "/pawnshop/profile", label: "Profile", icon: User },
]

export function PawnshopHeader() {
  const { logout } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="site-header sticky top-0 z-50 w-full px-2 pt-2 sm:px-3 sm:pt-3 lg:px-5 lg:pt-4">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between rounded-full border border-white/45 bg-white/55 px-1.5 shadow-[0_18px_50px_rgba(30,30,30,0.08)] backdrop-blur-xl sm:h-14 sm:px-3">
        {/* Logo — always visible, scales down on mobile */}
        <Link
          href="/"
          className="flex shrink-0 items-center justify-center rounded-full bg-[#171414] p-1 text-[#F5F5F3] transition-colors hover:bg-black sm:p-1.5"
          aria-label="Sanad home"
        >
          <Logo asLink={false} surface="dark" />
        </Link>

        {/* Desktop/tablet nav — scrollable on tablet, full on desktop */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-1 py-1 md:flex lg:gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {pawnshopNav.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] transition-all duration-200 lg:gap-1.5 lg:px-4 lg:py-2 lg:text-[10px] lg:tracking-[0.15em] ${
                  isActive
                    ? "bg-[#171414] text-[#E1BAC2] shadow-sm"
                    : "hover:bg-white/50 hover:text-[#171414]"
                }`}
              >
                <item.icon className="h-3 w-3 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side: Sign out (desktop) + hamburger (mobile) */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#4A4A4A] hover:bg-white/50 hover:text-[#171414] sm:flex lg:px-3 lg:text-[10px]"
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
          >
            {signingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            <span className="hidden lg:inline">{signingOut ? "Signing out..." : "Sign Out"}</span>
          </Button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#171414] hover:bg-white/60 md:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="absolute left-2 right-2 top-[60px] rounded-2xl border border-[rgba(23,20,20,0.1)] bg-[#F5F5F3] p-2 shadow-[0_24px_64px_rgba(23,20,20,0.12)] md:hidden sm:left-3 sm:right-3 sm:top-[68px]">
          {pawnshopNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                pathname === item.href
                  ? "bg-[#171414] text-[#E1BAC2]"
                  : "text-[#4A4A4A] hover:bg-white/60 hover:text-[#171414]"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => { setMobileOpen(false); handleSignOut() }}
            disabled={signingOut}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-[#171414]/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#4A4A4A] transition-all hover:bg-[#171414]/5 hover:text-[#171414]"
          >
            {signingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      )}
    </header>
  )
}
