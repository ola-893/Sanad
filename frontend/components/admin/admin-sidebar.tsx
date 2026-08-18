"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Clock,
  AlertTriangle,
  TrendingUp,
  Building2,
  Wallet,
  Shield,
  BarChart3,
  Settings,
  Bell,
  HelpCircle,
  Wrench,
  ArrowLeft,
  LogOut,
  ChevronDown,
  Brain,
} from "lucide-react"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { UserRole } from "@/hooks/use-user-role"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"

const sidebarItems = [
  {
    title: "admin.dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    role: "admin,pawnshop",
  },
  {
    title: "AI Risk & Compliance",
    href: "/admin/ai-risk-compliance",
    role: "admin,pawnshop",
    icon: Brain,
    children: [
      { title: "Risk Dashboard", href: "/admin/ai-risk-compliance" },
      { title: "KYC & AML Intelligence", href: "/admin/ai-risk-compliance/kyc-aml" },
      { title: "SAG Risk Evaluation", href: "/admin/ai-risk-compliance/sag-risk" },
      { title: "Wallet Monitoring", href: "/admin/ai-risk-compliance/wallet-monitoring" },
      { title: "Default Prediction", href: "/admin/ai-risk-compliance/default-prediction" },
      { title: "Compliance Bot", href: "/admin/ai-risk-compliance/compliance-bot" },
      { title: "Automated Reporting", href: "/admin/ai-risk-compliance/reporting" },
      { title: "Audit Logs", href: "/admin/ai-risk-compliance/audit-logs" },
      { title: "Risk Evaluation", href: "/admin/ai-risk-compliance/risk-evaluation" },
    ],
  },
  {
    title: "admin.kyc",
    href: "/admin/kyc",
    icon: Users,
    role: "admin",
  },
  {
    title: "admin.sag",
    href: "/admin/sag-listings",
    icon: FileText,
    children: [
      { title: "Active Listings", href: "/admin/sag-listings" },
      { title: "Pending Approval", href: "/admin/sag-listings/pending" },
      { title: "Completed", href: "/admin/sag-listings/completed" },
    ],
    role: "admin,pawnshop",
  },
  {
    title: "admin.repayment",
    href: "/admin/repayment",
    icon: CreditCard,
    role: "admin,pawnshop",
  },
  {
    title: "admin.extensions",
    href: "/admin/extensions",
    icon: Clock,
    role: "admin",
  },
  {
    title: "admin.defaults",
    href: "/admin/defaults",
    icon: AlertTriangle,
    role: "admin",
  },
  {
    title: "admin.investors",
    href: "/admin/investors",
    icon: TrendingUp,
    role: "admin",
  },
  {
    title: "admin.branches",
    href: "/admin/branches",
    icon: Building2,
  },
  {
    title: "admin.wallets",
    href: "/admin/wallets",
    icon: Wallet,
    role: "admin",
  },
  {
    title: "admin.compliance",
    href: "/admin/compliance",
    icon: Shield,
    role: "admin",
  },
  {
    title: "admin.analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    role: "admin",
  },
  {
    title: "admin.settings",
    href: "/admin/settings",
    icon: Settings,
    role: "admin",
  },
  {
    title: "admin.notifications",
    href: "/admin/notifications",
    icon: Bell,
    role: "admin",
  },
  {
    title: "admin.support",
    href: "/admin/support",
    icon: HelpCircle,
    role: "admin",
  },
  {
    title: "admin.tools",
    href: "/admin/tools",
    icon: Wrench,
    role: "admin",
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const [openItems, setOpenItems] = useState<string[]>([])
  const [user] = useAtom(userAtom)
  const rawRole = user?.userInfo?.roleId as string
  // Normalize backend role names (SUPER_ADMIN, COMPANY_ADMIN → admin, etc.)
  const roleMap: Record<string, string> = {
    SUPER_ADMIN: 'admin',
    COMPANY_ADMIN: 'admin',
    PAWNSHOP: 'pawnshop',
    INVESTOR: 'investor',
    BORROWER: 'investor',
  }
  const role = roleMap[rawRole] || (rawRole || '').toLowerCase()

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("userRole")
    router.push("/admin/login")
  }

  const toggleItem = (href: string) => {
    setOpenItems((prev) => (prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]))
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-accent/70">
          <span className="h-2 w-2 rotate-45 bg-accent" aria-hidden />
        </span>
        <div>
          <div className="font-display text-base font-medium leading-none">Sanad</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-accent">
            Admin Panel
          </div>
        </div>
      </div>

      {/* Back to Main Site */}
      <div className="p-4">
        <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("admin.backToMain")}
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 pb-4">
        {sidebarItems.filter((item) => item.role?.includes(role || '')).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const isOpen = openItems.includes(item.href)
          const Icon = item.icon

          if (item.children) {
            return (
              <Collapsible key={item.href} open={isOpen} onOpenChange={() => toggleItem(item.href)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn("w-full justify-between", isActive && "bg-accent/10 font-medium text-accent-foreground")}
                  >
                    <div className="flex items-center">
                      <Icon className="mr-2 h-4 w-4" />
                      {item.title.startsWith("admin.") ? t(item.title) : item.title}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-6">
                  {item.children.map((child) => (
                    <Button
                      key={child.href}
                      variant={pathname === child.href ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start",
                        pathname === child.href && "bg-accent/10 font-medium text-accent-foreground",
                      )}
                      asChild
                    >
                      <Link href={child.href}>{child.title}</Link>
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )
          }

          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start", isActive && "bg-accent/10 font-medium text-accent-foreground")}
              asChild
            >
              <Link href={item.href}>
                <Icon className="mr-2 h-4 w-4" />
                {item.title.startsWith("admin.") ? t(item.title) : item.title}
              </Link>
            </Button>
          )
        })}
      </nav>

      {/* User Role & Logout */}
      <div className="border-t p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Role:</span>
          <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent-foreground">
            {role === 'pawnshop' ? 'Ar Rahnu' : role}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("admin.logout")}
        </Button>
      </div>
    </div>
  )
}
