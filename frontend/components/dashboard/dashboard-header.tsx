"use client"

import { Button } from "@/components/ui/button"
import { Calendar, User } from "lucide-react"
import Link from "next/link"
import { useAtomValue } from "jotai"
import { userAtom } from "@/store/atoms"

export function DashboardHeader() {
  const user = useAtomValue(userAtom)
  const firstName =
    user?.userInfo?.userFirstName ||
    user?.profile?.userFirstName ||
    user?.name?.split(" ")[0] ||
    "Investor"
  const lastName =
    user?.userInfo?.userLastName ||
    user?.profile?.userLastName ||
    user?.name?.split(" ")[1] ||
    ""
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  return (
    <div className="flex flex-col items-start justify-between space-y-4 md:flex-row md:items-end md:space-y-0">
      <div>
        <p className="kicker-gold mb-2">Investor Portal</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Your financing overview at a glance</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[#171414]/10 bg-white/60 px-4 py-2 text-muted-foreground backdrop-blur">
          <Calendar className="h-4 w-4" />
          <span className="font-mono text-xs uppercase tracking-[0.1em]">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <Button asChild variant="outline" className="rounded-full" size="icon">
          <Link href="/profile" className="flex items-center justify-center" title="View Profile">
            <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-gold font-display text-sm font-bold text-[#171414]">
              {initials}
            </span>
          </Link>
        </Button>
        <Button asChild className="rounded-full">
          <Link href="/apply">Apply for Financing</Link>
        </Button>
      </div>
    </div>
  )
}
