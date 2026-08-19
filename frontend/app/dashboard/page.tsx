'use client';

import { useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { PaymentSchedule } from "@/components/dashboard/payment-schedule"
import { NFTCollateral } from "@/components/dashboard/nft-collateral"
import { Overview } from "@/components/dashboard/overview"
import { ArrowRight, Clock, CircleDollarSign, CreditCard, Gem, type LucideIcon } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useInvestorNfts } from "@/hooks/use-investor-nfts"
import { EVENT_TYPES, amountOf, useAuditLogs } from "@/hooks/use-audit-logs"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: LucideIcon }) {
  return (
    <Card className={`${glass} border-l-4 border-l-accent`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </CardTitle>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
          <Icon className="h-4 w-4 text-[#171414]" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums text-[#171414]">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: nfts = [], isLoading: nftsLoading, isError: nftsError } = useInvestorNfts()
  const { data: logs = [], isLoading: logsLoading, isError: logsError } = useAuditLogs()

  const stats = useMemo(() => {
    const ownTokens = new Set(nfts.map((n) => String(n.tokenId)))
    const myLogs = logs.filter((log) => ownTokens.has(String(log.tokenId)))

    let totalFinanced = 0
    const funded = new Set<string>()
    const closed = new Set<string>()
    for (const log of myLogs) {
      if (log.eventType === EVENT_TYPES.LOAN_FUNDED) {
        totalFinanced += amountOf(log) ?? 0
        funded.add(String(log.tokenId))
      } else if (log.eventType === EVENT_TYPES.SURPLUS_RETURNED) {
        closed.add(String(log.tokenId))
      }
    }
    const activeLoans = [...funded].filter((t) => !closed.has(t)).length
    return { totalFinanced, activeLoans }
  }, [nfts, logs])

  const loading = nftsLoading || logsLoading
  const dataUnavailable = nftsError || logsError
  const usd = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <DashboardHeader />

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Financed"
              value={loading ? "—" : dataUnavailable ? "$0" : usd(stats.totalFinanced)}
              sub="Verified on-chain (USD)"
              icon={CircleDollarSign}
            />
            <StatCard
              label="Active Loans"
              value={loading ? "—" : dataUnavailable ? "0" : String(stats.activeLoans)}
              sub="Funded and not yet settled"
              icon={CreditCard}
            />
            <StatCard
              label="NFT Collateral"
              value={loading ? "—" : dataUnavailable ? "0" : String(nfts.length)}
              sub="Secured on Creditcoin"
              icon={Gem}
            />
            <StatCard
              label="Next Payment"
              value="—"
              sub="No upcoming payments"
              icon={Clock}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className={`${glass} lg:col-span-4`}>
              <CardHeader>
                <p className="kicker-gold">Portfolio</p>
                <CardTitle className="font-display">Cash Flow Overview</CardTitle>
                <CardDescription>Financing vs repayments, last 8 months</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className={`${glass} lg:col-span-3`}>
              <CardHeader>
                <p className="kicker-gold">Activity</p>
                <CardTitle className="font-display">Recent Activity</CardTitle>
                <CardDescription>On-chain events for your account</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className={`${glass} lg:col-span-4`}>
              <CardHeader>
                <p className="kicker-gold">Schedule</p>
                <CardTitle className="font-display">Payment Schedule</CardTitle>
                <CardDescription>Your upcoming and verified repayments</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentSchedule />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full rounded-full">
                  <Link href="/dashboard/payments" className="flex items-center justify-center gap-2">
                    View All Payments <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className={`${glass} lg:col-span-3`}>
              <CardHeader>
                <p className="kicker-gold">Collateral</p>
                <CardTitle className="font-display">NFT Collateral</CardTitle>
                <CardDescription>Your gold secured as on-chain NFTs</CardDescription>
              </CardHeader>
              <CardContent>
                <NFTCollateral />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full rounded-full">
                  <Link href="/dashboard/nfts" className="flex items-center justify-center gap-2">
                    View All NFTs <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
