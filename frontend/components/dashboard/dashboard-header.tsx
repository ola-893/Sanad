"use client"

import { useAtomValue } from "jotai"
import { userAtom } from "@/store/atoms"

interface DashboardHeaderProps {
  portal?: string
  subtitle?: string
}

export function DashboardHeader({ portal = "Investor Portal", subtitle = "Your investment overview at a glance" }: DashboardHeaderProps) {
  const user = useAtomValue(userAtom)
  const firstName =
    user?.userInfo?.userFirstName ||
    user?.profile?.userFirstName ||
    user?.name?.split(" ")[0] ||
    "User"

  return (
    <div>
      <p className="kicker-gold mb-2">{portal}</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
        Welcome back, {firstName}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}
