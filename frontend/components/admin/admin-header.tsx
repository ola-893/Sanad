"use client"

import { LogOut, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { truncateAddress } from "@/lib/web3"

export function AdminHeader() {
  const [user] = useAtom(userAtom)
  const { logout } = useAuth()

  const firstName = user?.userInfo?.userFirstName || "Admin"
  const lastName = user?.userInfo?.userLastName || ""
  const wallet = user?.userInfo?.accountId || user?.wallet?.address || ""
  const role = user?.userInfo?.roleId || "ADMIN"

  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()

  const handleLogout = async () => {
    const promise = logout()
    toast.promise(promise, {
      loading: "Logging out...",
      success: () => "Logged out successfully",
      error: "Failed to log out",
    })
  }

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-[#171414]/10 bg-white/80 backdrop-blur-sm">
      {/* Left — spacer (page title lives in page content) */}
      <div />

      {/* Right — User menu only */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 rounded-full px-3 py-1.5 transition-colors hover:bg-[#171414]/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171414]">
              <span className="text-xs font-bold text-[#E1BAC2]">{initials}</span>
            </div>
            <div className="text-left">
              <p className="font-display text-sm font-bold text-[#171414]">
                {firstName} {lastName}
              </p>
              {wallet && (
                <p className="font-mono text-[10px] text-[#4A4A4A]">
                  {truncateAddress(wallet)}
                </p>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-[#4A4A4A]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <div className="px-3 py-2">
            <p className="font-display text-sm font-bold text-[#171414]">
              {firstName} {lastName}
            </p>
            <p className="font-mono text-[10px] text-[#4A4A4A]">{role}</p>
            {wallet && (
              <p className="mt-1 font-mono text-[10px] text-[#4A4A4A] truncate">
                {wallet}
              </p>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="font-display text-sm font-bold">Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
