"use client"

import { useAtomValue } from "jotai"
import { userAtom } from "@/store/atoms"

export function DashboardHeader() {
  const user = useAtomValue(userAtom)
  const firstName =
    user?.userInfo?.userFirstName ||
    user?.profile?.userFirstName ||
    user?.name?.split(" ")[0] ||
    "Investor"

  return (
    <div>
      <p className="kicker-gold mb-2">Investor Portal</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
        Welcome back, {firstName}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Your investment overview at a glance</p>
    </div>
  )
}
