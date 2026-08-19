"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink, CheckCircle2, CircleDollarSign, Clock, Loader2 } from "lucide-react"
import { useInvestorNfts } from "@/hooks/use-investor-nfts"
import { EVENT_TYPES, amountOf, useAuditLogs } from "@/hooks/use-audit-logs"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const explorerBase = process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"

const formatCTC = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })

export function PaymentHistory() {
  const { data: nfts = [], isLoading: nftsLoading } = useInvestorNfts()
  const { data: logs = [], isLoading: logsLoading } = useAuditLogs()

  const ownTokens = useMemo(() => new Set(nfts.map((n) => String(n.tokenId))), [nfts])
  const payments = [
    {
      id: "P-2025-001",
      loanId: "L-2025-001",
      date: "March 15, 2025",
      amount: 1250,
      method: "Creditcoin Wallet",
      status: "completed",
      transactionId: "TXN-123456",
    },
    {
      id: "P-2025-002",
      loanId: "L-2025-002",
      date: "March 10, 2025",
      amount: 833,
      method: "Bank Transfer",
      status: "completed",
      transactionId: "TXN-123457",
    },
    {
      id: "P-2025-003",
      loanId: "L-2025-001",
      date: "February 15, 2025",
      amount: 1250,
      method: "Creditcoin Wallet",
      status: "completed",
      transactionId: "TXN-123458",
    },
    {
      id: "P-2025-004",
      loanId: "L-2025-002",
      date: "February 10, 2025",
      amount: 833,
      method: "Credit Card",
      status: "completed",
      transactionId: "TXN-123459",
    },
    {
      id: "P-2025-005",
      loanId: "L-2025-001",
      date: "April 15, 2025",
      amount: 1250,
      method: "Pending",
      status: "upcoming",
      transactionId: "-",
    },
    {
      id: "P-2025-006",
      loanId: "L-2025-002",
      date: "April 10, 2025",
      amount: 833,
      method: "Pending",
      status: "upcoming",
      transactionId: "-",
    },
  ]

  const repayments = useMemo(() => {
    return logs
      .filter(
        (log) =>
          log.eventType === EVENT_TYPES.REPAYMENT_VERIFIED &&
          ownTokens.has(String(log.tokenId))
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [logs, ownTokens])

  const totalRepaid = useMemo(() => {
    return repayments.reduce((sum, log) => sum + (amountOf(log) ?? 0), 0)
  }, [repayments])

  const loading = nftsLoading || logsLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#171414]/10 bg-white/50 p-10">
        <Loader2 className="h-5 w-5 animate-spin text-[#171414]" />
        <span className="ml-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Loading payment history...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Total Repaid
          </p>
          <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-[#171414]">
            {formatCTC(totalRepaid)}
            <span className="ml-1 font-mono text-xs font-bold uppercase text-muted-foreground">CTC</span>
          </p>
        </div>
        <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Repayments
          </p>
          <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-[#171414]">
            {repayments.length}
          </p>
        </div>
      </div>

      {/* Repayment List */}
      {repayments.length === 0 ? (
        <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-10 text-center">
          <CircleDollarSign className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-[#171414]">No repayments yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verified repayments will appear here once confirmed on the Creditcoin network.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {repayments.map((payment) => {
            const amount = amountOf(payment)
            return (
              <div
                key={payment.id}
                className="flex items-center gap-4 rounded-2xl border border-[#171414]/10 bg-white/50 p-4 transition-all hover:bg-white/80"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#171414]">Repayment verified</p>
                    <Badge
                      variant="outline"
                      className="border-success/20 bg-success/10 text-success text-[10px]"
                    >
                      Confirmed
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      Token #{payment.tokenId}
                    </p>
                    <p className="text-[10px] text-muted-foreground">·</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {payment.transactionHash && (
                    <a
                      href={`${explorerBase}/tx/${payment.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      {payment.transactionHash.slice(0, 10)}...
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold tabular-nums text-[#171414]">
                    {amount !== null ? formatCTC(amount) : "—"}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">CTC</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
