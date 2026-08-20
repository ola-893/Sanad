"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Briefcase, CreditCard, FileText, Home, Settings, Users } from "lucide-react"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import { useAuth } from "@/hooks/use-auth"
import { Logo } from "@/components/logo"
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { UserNav } from "@/components/user-nav"

export function Sidebar() {
  const pathname = usePathname()
  const [user] = useAtom(userAtom)
  const { logout } = useAuth()
  const role = user?.userInfo?.roleId as string

  return (
    <UISidebar>
      <SidebarHeader className="border-b px-6 py-2">
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Dashboard">
              <Link href="/">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/loans"} tooltip="Loans">
              <Link href="/loans">
                <Briefcase className="h-4 w-4" />
                <span>Loans</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/users"} tooltip="Users">
              <Link href="/users">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/auctions"} tooltip="Auctions">
              <Link href="/auctions">
                <CreditCard className="h-4 w-4" />
                <span>Auctions</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/reports"} tooltip="Reports">
              <Link href="/reports">
                <FileText className="h-4 w-4" />
                <span>Reports</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/analytics"} tooltip="Analytics">
              <Link href="/analytics">
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Settings">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <UserNav user={user} role={role as "admin" | "pawnshop" | "investor" | "user"} onLogout={logout} />
      </SidebarFooter>
      <SidebarTrigger />
    </UISidebar>
  )
}
