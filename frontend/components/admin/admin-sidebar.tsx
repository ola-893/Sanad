"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Shield,
  FileText,
  CreditCard,
  LogOut,
  ChevronDown,
  Store,
  Scale,
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import { truncateAddress } from "@/lib/web3"

/* ─── Only pages that actually work ─── */
const sidebarItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "KYC Review",
    href: "/admin/kyc",
    icon: Shield,
  },
  {
    title: "SAG Listings",
    href: "/admin/sag-listings",
    icon: FileText,
    children: [
      { title: "All Listings", href: "/admin/sag-listings" },
      { title: "Pending Approval", href: "/admin/sag-listings/pending" },
      { title: "Completed", href: "/admin/sag-listings/completed" },
    ],
  },
  {
    title: "Pawnshops",
    href: "/admin/pawnshops",
    icon: Store,
  },
  {
    title: "Repayments",
    href: "/admin/repayment",
    icon: CreditCard,
  },
  {
    title: "Compliance",
    href: "/admin/compliance",
    icon: Scale,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [openItems, setOpenItems] = useState<string[]>([])
  const [user] = useAtom(userAtom)

  const firstName = user?.userInfo?.userFirstName || "Admin"
  const lastName = user?.userInfo?.userLastName || ""
  const wallet = user?.userInfo?.accountId || user?.wallet?.address || ""
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()

  const handleLogout = () => {
    try {
      const { disconnectWallet } = require("@/lib/web3")
      disconnectWallet()
    } catch {}
    localStorage.removeItem("authState")
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("userRole")
    router.push("/admin/login")
  }

  const toggleItem = (href: string) => {
    setOpenItems((prev) => (prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]))
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-[#171414]/10 bg-[#FAFAF8]">
      {/* ─── Logo ─── */}
      <div className="flex h-16 items-center gap-3 px-6">
        <Image
          src="/images/logo.png"
          alt="Sanad Protocol"
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
          priority
        />
        <div>
          <div className="font-display text-base font-bold leading-none text-[#171414]">Sanad</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[#E1BAC2]">
            Admin Panel
          </div>
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="flex-1 space-y-1 px-4 pt-4 pb-4">
        {sidebarItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.children ? item.children.some((c) => pathname === c.href) : pathname.startsWith(item.href + "/"))
          const isOpen = openItems.includes(item.href)
          const Icon = item.icon

          if (item.children) {
            return (
              <Collapsible key={item.href} open={isOpen} onOpenChange={() => toggleItem(item.href)}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all",
                      isActive
                        ? "bg-[#171414] font-display font-bold text-[#E1BAC2]"
                        : "font-display font-medium text-[#171414]/70 hover:bg-[#171414]/5 hover:text-[#171414]"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pl-4 mt-1">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-all",
                          childActive
                            ? "bg-[#E1BAC2]/15 font-display font-bold text-[#171414]"
                            : "font-display font-medium text-[#4A4A4A] hover:bg-[#171414]/5 hover:text-[#171414]"
                        )}
                      >
                        <span
                          className={cn(
                            "mr-2.5 h-1 w-1 rounded-full",
                            childActive ? "bg-[#E1BAC2]" : "bg-[#171414]/20"
                          )}
                        />
                        {child.title}
                      </Link>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "bg-[#171414] font-display font-bold text-[#E1BAC2]"
                  : "font-display font-medium text-[#171414]/70 hover:bg-[#171414]/5 hover:text-[#171414]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* ─── Back to site ─── */}
      <div className="px-4 pb-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-display font-medium text-[#171414]/50 hover:bg-[#171414]/5 hover:text-[#171414] transition-all"
        >
          ← Back to Site
        </Link>
      </div>

      {/* ─── User & Logout ─── */}
      <div className="border-t border-[#171414]/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171414]">
            <span className="text-xs font-bold text-[#E1BAC2]">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-[#171414] truncate">
              {firstName} {lastName}
            </p>
            {wallet && (
              <p className="font-mono text-[10px] text-[#4A4A4A] truncate">
                {truncateAddress(wallet)}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-display font-medium text-red-500/80 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  )
}
