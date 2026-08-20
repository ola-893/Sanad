"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useLanguage } from "@/hooks/use-language"
import { Menu, X } from "lucide-react"

const navItems = [
  { href: "/", key: "nav.home" },
  { href: "/about", key: "nav.aboutUs" },
  { href: "/how-it-works", key: "nav.howItWorks" },
  { href: "/ar-rahnu-industry", key: "nav.arRahnuIndustry" },
  { href: "/faq", key: "nav.faq" },
  { href: "/contact", key: "nav.contact" },
]

export function ExternalHeader() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="site-header sticky top-0 z-50 w-full px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full border border-white/45 bg-white/55 px-2 shadow-[0_18px_50px_rgba(30,30,30,0.08)] backdrop-blur-xl sm:px-3">
        {/* Logo */}
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

        {/* Pill nav */}
        <nav className="hidden items-center gap-1 rounded-full bg-white/35 p-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] md:flex">
          {navItems.map((item) => {
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
          <Button
            variant="ghost"
            size="sm"
            className="hidden rounded-full text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] hover:bg-white/60 hover:text-[#171414] lg:inline-flex"
            asChild
          >
            <Link href="/login">{t("nav.login")}</Link>
          </Button>
          <Link
            href="/login"
            className="flux-pill hidden items-center gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] sm:inline-flex"
          >
            {t("nav.applyNow")}
          </Link>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="absolute left-3 right-3 top-[72px] rounded-2xl border border-[rgba(23,20,20,0.1)] bg-[#F5F5F3] p-2 shadow-[0_24px_64px_rgba(23,20,20,0.12)] md:hidden">
          {navItems.map((item) => (
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
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="mt-1 block rounded-xl bg-[#171414] px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.1em] text-[#E1BAC2]"
          >
            {t("nav.applyNow")}
          </Link>
        </div>
      )}
    </header>
  )
}
