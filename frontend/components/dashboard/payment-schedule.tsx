"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, Loader2 } from "lucide-react"
import { useInvestorNfts } from "@/hooks/use-investor-nfts"
import { EVENT_TYPES, amountOf, useAuditLogs } from "@/hooks/use-audit-logs"

interface PaymentScheduleProps {
  showAll?: boolean
}

const formatUSD = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

export function PaymentSchedule({ showAll = false }: PaymentScheduleProps) {
  const { data: nfts = [], isLoading: nftsLoading, isError: nftsError } = useInvestorNfts()
  const { data: logs = [], isLoading: logsLoading } = useAuditLogs()

  const history = useMemo(() => {
    const ownTokens = new Set(nfts.map((n) => String(n.tokenId)))
    return logs
      .filter((log) => log.eventType === EVENT_TYPES.REPAYMENT_VERIFIED && ownTokens.has(String(log.tokenId)))
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [nfts, logs])

  const displayHistory = showAll ? history : history.slice(0, 4)

  if (nftsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#171414]/10 bg-white/50 p-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#171414]" />
        <span className="ml-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Loading payments...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Upcoming
        </p>
        <div className="flex items-center gap-3 rounded-2xl border border-[#171414]/10 bg-white/50 p-4">
          <CalendarClock className="h-5 w-5 shrink-0 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium text-[#171414]">No upcoming payments</p>
            <p className="text-xs text-muted-foreground">
              A repayment schedule will appear once your financing is issued on-chain.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Verified on-chain
        </p>
        {nftsError || displayHistory.length === 0 ? (
          <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-4 text-center text-sm text-muted-foreground">
            No repayments verified yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayHistory.map((payment) => {
              const amount = amountOf(payment)
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      Token #{payment.tokenId}
                    </p>
                    <p className="text-sm font-medium text-[#171414]">Repayment verified on-chain</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.timestamp).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="font-mono text-sm font-bold tabular-nums text-[#171414]">
                      {amount !== null ? formatUSD(amount) : "—"}
                    </span>
                    <Badge variant="outline" className="border-success/20 bg-success/10 text-success">
                      Paid
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
