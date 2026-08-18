"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, Menu, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import { useAuth } from "@/hooks/use-auth"

export function PageHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [user] = useAtom(userAtom)
  const { logout } = useAuth()
  const role = user?.userInfo?.roleId as "admin" | "pawnshop" | "investor" | "user"

  return (
    <header className="site-header sticky top-0 z-50 w-full px-3 pt-3">
      <div className="mx-auto flex h-14 max-w-7xl items-center rounded-full border border-white/45 bg-white/55 px-3 shadow-[0_18px_50px_rgba(30,30,30,0.08)] backdrop-blur-xl">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="mr-2 md:hidden">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <MobileNav />
          </SheetContent>
        </Sheet>
        <Link href="/" className="mr-6">
          <Logo asLink={false} />
        </Link>
        <div className="hidden md:flex">
          <MainNav />
        </div>
        <div className="ml-auto flex items-center space-x-2">
          {isSearchOpen ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-[200px] pl-8 md:w-[300px] lg:w-[400px]"
                autoFocus
                onBlur={() => setIsSearchOpen(false)}
              />
            </div>
          ) : (
            <Button variant="outline" size="icon" onClick={() => setIsSearchOpen(true)}>
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Button>
          )}
          <Button variant="outline" size="icon">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>
          <ModeToggle />
          <UserNav user={user} role={role} onLogout={logout} />
        </div>
      </div>
    </header>
  )
}

function MobileNav() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <Link href="/" className="px-4">
        <Logo asLink={false} />
      </Link>
      <div className="px-4 py-2">
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span>CEO Dashboard</span>
        </div>
      </div>
      <nav className="grid gap-1 px-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-all hover:bg-accent"
        >
          Dashboard
        </Link>
        <Link
          href="/loans"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          Loans
        </Link>
        <Link
          href="/users"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          Users
        </Link>
        <Link
          href="/auctions"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          Auctions
        </Link>
        <Link
          href="/reports"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          Reports
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          Settings
        </Link>
      </nav>
    </div>
  )
}
