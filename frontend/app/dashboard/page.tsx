"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Overview } from "@/components/dashboard/overview"
import {
  CircleDollarSign,
  Wallet,
  Gem,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { useInvestorNfts } from "@/hooks/use-investor-nfts"
import { EVENT_TYPES, amountOf, useAuditLogs } from "@/hooks/use-audit-logs"
import apiInstance from "@/lib/axios-v1"


import { LiquidityPoolManager } from "@/components/investor/liquidity-pool-manager"

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
  const { walletAddress, balance: walletBalance } = useWalletAuth()

  const { data: nfts = [], isLoading: nftsLoading, isError: nftsError } = useInvestorNfts()
  const { data: logs = [], isLoading: logsLoading, isError: logsError } = useAuditLogs()

  const [poolData, setPoolData] = useState<{ totalLiquidity: string; userLpBalance: string } | null>(null)

  useEffect(() => {
    apiInstance.get("/investor/pool/data")
      .then((res) => {
        const d = res.data.data
        setPoolData({
          totalLiquidity: d.totalPoolLiquidityCTC || d.totalLiquidity || "0.0000",
          userLpBalance: d.userLpBalanceCTC || d.userLpBalance || "0.0000",
        })
      })
      .catch(() => setPoolData({ totalLiquidity: "0.0000", userLpBalance: "0.0000" }))
  }, [])

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
    return { totalFinanced, nfts: nfts.length }
  }, [nfts, logs])

  const loading = nftsLoading || logsLoading
  const dataUnavailable = nftsError || logsError
  const usd = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <DashboardHeader />

          {/* Stats Row */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="ETH Balance"
              value={`${walletBalance || '0.0000'} ETH`}
              sub="Sepolia Testnet"
              icon={Wallet}
            />
            <StatCard
              label="Pool Stake"
              value={`${poolData?.userLpBalance || "0.0000"} tCTC`}
              sub="Creditcoin CC3 Pool"
              icon={TrendingUp}
            />
            <StatCard
              label="NFT Holdings"
              value={loading ? "\u2014" : dataUnavailable ? "0" : String(stats.nfts)}
              sub="Secured on Creditcoin"
              icon={Gem}
            />
            <StatCard
              label="Total Financed"
              value={loading ? "\u2014" : dataUnavailable ? "$0" : usd(stats.totalFinanced)}
              sub="Verified on-chain (USD)"
              icon={CircleDollarSign}
            />
          </div>

          {/* Native CTC Liquidity Pool Manager */}
          <LiquidityPoolManager />

          {/* Cash Flow + Activity */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={glass}>
              <CardHeader>
                <p className="kicker-gold">Portfolio</p>
                <CardTitle className="font-display">Cash Flow Overview</CardTitle>
                <CardDescription>Deposits vs returns, last 8 months</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>

            <Card className={glass}>
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


        </div>
      </div>
    </ProtectedRoute>
  )
}
