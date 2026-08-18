"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "@/components/logo"
import { useAuth } from "@/hooks/use-auth"
import { Menu, X, LayoutDashboard, Wallet, CreditCard, Briefcase, LogOut } from "lucide-react"

const portalNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/nfts", label: "NFT Collateral", icon: Briefcase },
]

export function InternalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <header className="site-header sticky top-0 z-50 w-full px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full border border-white/45 bg-white/55 px-2 shadow-[0_18px_50px_rgba(30,30,30,0.08)] backdrop-blur-xl sm:px-3">
        {/* Logo — dark ink pill */}
        <Link
          href="/"
          className="hidden items-center rounded-full bg-[#171414] py-1.5 pl-1.5 pr-5 text-[#F5F5F3] transition-colors hover:bg-black sm:flex"
          aria-label="Sanad home"
        >
          <Logo asLink={false} surface="dark" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#171414] hover:bg-white/60 sm:hidden"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Pill nav — portal links */}
        <nav className="hidden items-center gap-1 rounded-full bg-white/35 p-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] md:flex">
          {portalNav.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 transition-all duration-200 ${
                  isActive
                    ? "bg-[#171414] text-[#E1BAC2] shadow-sm"
                    : "hover:bg-white/50 hover:text-[#171414]"
                }`}
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#4A4A4A] transition-colors hover:bg-white/60 hover:text-[#171414]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="absolute left-3 right-3 top-[72px] rounded-2xl border border-[rgba(23,20,20,0.1)] bg-[#F5F5F3] p-2 shadow-[0_24px_64px_rgba(23,20,20,0.12)] md:hidden">
          {portalNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                (item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(item.href + "/"))
                  ? "bg-[#171414] text-[#E1BAC2]"
                  : "text-[#4A4A4A] hover:bg-white/60 hover:text-[#171414]"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setMobileOpen(false)
              handleLogout()
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#4A4A4A] hover:bg-white/60 hover:text-[#171414]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </header>
  )
}
