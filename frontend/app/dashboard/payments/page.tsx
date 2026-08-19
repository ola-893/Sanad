'use client';

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { CalendarClock, CheckCircle2, Clock, ArrowUpRight, Loader2, CircleDollarSign, TrendingUp } from "lucide-react"
import { useInvestorNfts } from "@/hooks/use-investor-nfts"
import { EVENT_TYPES, amountOf, useAuditLogs } from "@/hooks/use-audit-logs"
import Link from "next/link"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

const formatUSD = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

export default function DashboardPaymentsPage() {
  const { data: nfts = [], isLoading: nftsLoading, isError: nftsError } = useInvestorNfts()
  const { data: logs = [], isLoading: logsLoading } = useAuditLogs()

  const ownTokens = useMemo(() => new Set(nfts.map((n) => String(n.tokenId))), [nfts])

  const repayments = useMemo(() => {
    return logs
      .filter((log) => log.eventType === EVENT_TYPES.REPAYMENT_VERIFIED && ownTokens.has(String(log.tokenId)))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [logs, ownTokens])

  const totalRepaid = useMemo(() => {
    return repayments.reduce((sum, log) => sum + (amountOf(log) ?? 0), 0)
  }, [repayments])

  const loading = nftsLoading || logsLoading
  const dataUnavailable = nftsError

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="kicker-gold">Payments</p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
                Payment History
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your upcoming and verified on-chain repayments
              </p>
            </div>
            <Link href="/payment">
              <Button className="rounded-full">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Make Payment
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className={glass}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      Total Repaid
                    </p>
                    <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-[#171414]">
                      {loading ? "—" : formatUSD(totalRepaid)}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={glass}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      Repayments Made
                    </p>
                    <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-[#171414]">
                      {loading ? "—" : repayments.length}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/25">
                    <CheckCircle2 className="h-5 w-5 text-[#171414]" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={glass}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      Upcoming
                    </p>
                    <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-[#171414]">
                      —
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/50">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Payments */}
          <Card className={glass}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                  <CalendarClock className="h-4 w-4 text-[#171414]" />
                </span>
                <p className="font-display text-sm font-bold text-[#171414]">Upcoming Payments</p>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-[#171414]/10 bg-white/50 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted/50">
                  <CalendarClock className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#171414]">No upcoming payments</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    A repayment schedule will appear once your financing is issued on-chain.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verified On-Chain Repayments */}
          <Card className={glass}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                  <CheckCircle2 className="h-4 w-4 text-[#171414]" />
                </span>
                <p className="font-display text-sm font-bold text-[#171414]">Verified On-Chain</p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center rounded-2xl border border-[#171414]/10 bg-white/50 p-10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#171414]" />
                  <span className="ml-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    Loading payments...
                  </span>
                </div>
              ) : dataUnavailable || repayments.length === 0 ? (
                <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-10 text-center">
                  <CircleDollarSign className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-[#171414]">No repayments verified yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Verified repayments will appear here once they are confirmed on the Creditcoin network.
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
                            <Badge variant="outline" className="border-success/20 bg-success/10 text-success text-[10px]">
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
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-sm font-bold tabular-nums text-[#171414]">
                            {amount !== null ? formatUSD(amount) : "—"}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">USD</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
