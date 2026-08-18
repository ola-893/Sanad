"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Logo } from "@/components/logo"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/hooks/use-auth"
import { UserNav } from "@/components/user-nav"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import { UserRole } from "@/hooks/use-user-role"
import { Menu, X, LayoutDashboard, Search, Briefcase } from "lucide-react"

// Marketing nav — shown to visitors
const marketingNavItems = [
  { href: "/", key: "nav.home" },
  { href: "/about", key: "nav.aboutUs" },
  { href: "/how-it-works", key: "nav.howItWorks" },
  { href: "/ar-rahnu-industry", key: "nav.arRahnuIndustry" },
  { href: "/faq", key: "nav.faq" },
  { href: "/contact", key: "nav.contact" },
]

// Portal nav — shown to logged-in users
const portalNavByRole: Record<string, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  admin: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/sag-listings", label: "SAG Listings", icon: Briefcase },
    { href: "/admin/investors", label: "Investors", icon: Search },
  ],
  pawnshop: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/sag-listings", label: "SAG Listings", icon: Briefcase },
    { href: "/admin/repayment", label: "Repayments", icon: Briefcase },
  ],
  investor: [
    { href: "/investor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/investor/browse", label: "Browse NFTs", icon: Search },
    { href: "/investor/portfolio", label: "Investments", icon: Briefcase },
  ],
}

export function Header() {
  const { t } = useLanguage()
  const { isAuthenticated, logout } = useAuth()
  const [user] = useAtom(userAtom)
  const role = user?.userInfo?.roleId as UserRole
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const loggedIn = isAuthenticated || !!user
  const portalNav = portalNavByRole[role || ""] || []

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

        {/* Pill nav — marketing or portal depending on auth state */}
        <nav className="hidden items-center gap-1 rounded-full bg-white/35 p-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] md:flex">
          {loggedIn
            ? portalNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 transition-all duration-200 ${
                      isActive
                        ? "bg-white/80 text-[#171414] shadow-sm"
                        : "hover:bg-white/50 hover:text-[#171414]"
                    }`}
                  >
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </Link>
                )
              })
            : marketingNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 transition-all duration-200 ${
                      isActive
                        ? "bg-white/80 text-[#171414] shadow-sm"
                        : "hover:bg-white/50 hover:text-[#171414]"
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                )
              })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ModeToggle />

          {loggedIn ? (
            <UserNav user={user} role={role || ""} onLogout={logout} />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden rounded-full text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] hover:bg-white/60 hover:text-[#171414] lg:inline-flex"
                asChild
              >
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <Link
                href="/apply"
                className="flux-pill hidden items-center gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] sm:inline-flex"
              >
                {t("nav.applyNow")}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="absolute left-3 right-3 top-[72px] rounded-2xl border border-[rgba(23,20,20,0.1)] bg-[#F5F5F3] p-2 shadow-[0_24px_64px_rgba(23,20,20,0.12)] md:hidden">
          {loggedIn
            ? portalNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-[#171414] text-[#E1BAC2]"
                      : "text-[#4A4A4A] hover:bg-white/60 hover:text-[#171414]"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              ))
            : marketingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                    pathname === item.href
                      ? "bg-[#171414] text-[#E1BAC2]"
                      : "text-[#4A4A4A] hover:bg-white/60 hover:text-[#171414]"
                  }`}
                >
                  {t(item.key)}
                </Link>
              ))}
          {!loggedIn && (
            <Link
              href="/apply"
              onClick={() => setMobileOpen(false)}
              className="mt-1 block rounded-xl bg-[#171414] px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.1em] text-[#E1BAC2]"
            >
              {t("nav.applyNow")}
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
