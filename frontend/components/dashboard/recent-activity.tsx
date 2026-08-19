"use client"

import { useMemo } from "react"
import { CheckCircle2, CircleDollarSign, Gem, Inbox, Loader2, Lock, type LucideIcon } from "lucide-react"
import { useInvestorNfts } from "@/hooks/use-investor-nfts"
import { EVENT_TYPES, amountOf, useAuditLogs, type AuditLog } from "@/hooks/use-audit-logs"

const eventMeta: Record<string, { label: string; icon: LucideIcon }> = {
  [EVENT_TYPES.COLLATERAL_MINTED]: { label: "Collateral minted", icon: Lock },
  [EVENT_TYPES.LOAN_FUNDED]: { label: "Loan funded", icon: CircleDollarSign },
  [EVENT_TYPES.REPAYMENT_VERIFIED]: { label: "Repayment verified", icon: CheckCircle2 },
  [EVENT_TYPES.SURPLUS_RETURNED]: { label: "Surplus returned", icon: Gem },
}

const formatUSD = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

export function RecentActivity() {
  const { data: nfts = [], isLoading: nftsLoading, isError: nftsError } = useInvestorNfts()
  const { data: logs = [], isLoading: logsLoading } = useAuditLogs()

  const activities = useMemo(() => {
    const ownTokens = new Set(nfts.map((n) => String(n.tokenId)))
    return logs
      .filter((log) => ownTokens.has(String(log.tokenId)))
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6)
  }, [nfts, logs])

  if (nftsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#171414]/10 bg-white/50 p-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#171414]" />
        <span className="ml-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Loading activity...
        </span>
      </div>
    )
  }

  if (nftsError || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#171414]/10 bg-white/50 p-8 text-center">
        <Inbox className="mb-2 h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          On-chain events for your account will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map((activity: AuditLog) => {
        const meta = eventMeta[activity.eventType] ?? { label: activity.eventType, icon: Inbox }
        const Icon = meta.icon
        const amount = amountOf(activity)
        return (
          <div
            key={activity.id}
            className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-muted/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <Icon className="h-4 w-4 text-[#171414]" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium leading-none">{meta.label}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {new Date(activity.timestamp).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {" · Token "}
                {activity.tokenId}
              </p>
            </div>
            {amount !== null && (
              <span className="font-mono text-sm font-medium tabular-nums text-[#171414]">
                {formatUSD(amount)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
