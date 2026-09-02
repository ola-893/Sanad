"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import {
  CircleDollarSign,
  Wallet,
  Gem,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  DollarSign,
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import apiInstance from "@/lib/axios-v1"
import { SEPOLIA_EXPLORER_URL } from "@/lib/contracts/sepolia-gateways"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface Investment {
  id: number
  sag_token_id: string
  amount_usd: number
  eth_amount: number | null
  source_tx_hash: string | null
  cc3_tx_hash: string | null
  status: string
  created_at: string
}

export default function DashboardPage() {
  const { walletAddress, balance: walletBalance } = useWalletAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [investmentsLoading, setInvestmentsLoading] = useState(true)
  const [ethPrice, setEthPrice] = useState(0)

  useEffect(() => {
    apiInstance.get("/investor/investments")
      .then((res) => { if (res.data.success) setInvestments(res.data.data ?? []) })
      .catch(() => {})
      .finally(() => setInvestmentsLoading(false))

    const fetchEthPrice = () => {
      apiInstance.get("/eth-price")
        .then((res) => setEthPrice(res.data?.data?.usd || 0))
        .catch(() => setEthPrice(0))
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
  }, [])

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount_usd), 0)
  const totalEth = investments.reduce((sum, inv) => sum + (inv.eth_amount ? Number(inv.eth_amount) : 0), 0)

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <DashboardHeader />

          {/* Stats Row */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* ETH Balance */}
            <Card className={`${glass} p-5`}>              
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171414]/5">
                  <Wallet className="h-5 w-5 text-[#171414]" />
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">ETH Balance</p>
              </div>
              <p className="text-4xl font-extrabold tabular-nums text-[#171414]">{walletBalance || "0.0000"}</p>
              <p className="text-xs text-emerald-600 font-mono mt-1">Sepolia Testnet</p>
            </Card>

            {/* ETH in USD */}
            <Card className={`${glass} p-5`}>              
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <DollarSign className="h-5 w-5 text-blue-700" />
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">ETH Value</p>
              </div>
              <p className="text-4xl font-extrabold tabular-nums text-[#171414]">
                {ethPrice > 0 && walletBalance ? `$${(Number(walletBalance) * ethPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">@${ethPrice.toLocaleString()}/ETH</p>
            </Card>

            {/* Total Invested */}
            <Card className={`${glass} p-5`}>              
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <CircleDollarSign className="h-5 w-5 text-emerald-700" />
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Total Invested</p>
              </div>
              <p className="text-4xl font-extrabold tabular-nums text-[#171414]">
                {investmentsLoading ? "\u2014" : `$${totalInvested.toLocaleString()}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">~{totalEth.toFixed(4)} ETH deposited</p>
            </Card>

            {/* SAGs Invested */}
            <Card className={`${glass} p-5`}>              
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1BAC2]/20">
                  <Gem className="h-5 w-5 text-[#171414]" />
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">SAGs Invested</p>
              </div>
              <p className="text-4xl font-extrabold tabular-nums text-[#171414]">
                {investmentsLoading ? "\u2014" : String(new Set(investments.map(i => i.sag_token_id)).size)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Gold-backed tokens</p>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {/* Browse SAGs */}
            <Link href="/dashboard/browse" className="group">
              <Card className={`${glass} transition-all duration-300 hover:shadow-lg hover:border-[#171414]/25 overflow-hidden`}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 group-hover:from-amber-200 group-hover:to-amber-100 transition-all">
                        <Gem className="h-6 w-6 text-amber-700" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#171414]">Browse SAG Tokens</p>
                        <p className="text-xs text-muted-foreground">Discover gold-backed investment opportunities</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#171414] group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* My Investments */}
            <Link href="/dashboard/investments" className="group">
              <Card className={`${glass} transition-all duration-300 hover:shadow-lg hover:border-[#171414]/25 overflow-hidden`}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 group-hover:from-emerald-200 group-hover:to-emerald-100 transition-all">
                        <ShieldCheck className="h-6 w-6 text-emerald-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#171414]">My Investments</p>
                          {investments.length > 0 && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              {investments.length}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {investments.length > 0
                            ? `$${totalInvested.toLocaleString()} invested · ~${totalEth.toFixed(4)} ETH`
                            : "Start investing in gold-backed tokens"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#171414] group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Recent Investments (inline, compact) */}
          {!investmentsLoading && investments.length > 0 && (
            <Card className={`${glass}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#171414]" />
                    <p className="text-sm font-bold text-[#171414]">Recent Investments</p>
                  </div>
                  <Link href="/dashboard/investments" className="text-[10px] text-blue-600 hover:underline">
                    View all →
                  </Link>
                </div>
                <div className="space-y-2">
                  {investments.slice(0, 3).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-xl border border-[#171414]/5 bg-white/40 p-3 hover:bg-white/60 transition">
                      <div className="flex items-center gap-3">
                        <div className="gradient-gold flex h-8 w-8 items-center justify-center rounded-lg shrink-0">
                          <Gem className="h-4 w-4 text-[#171414]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[#171414]">SAG #{inv.sag_token_id}</p>
                            <Badge variant="outline" className={
                              inv.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]" :
                              "bg-amber-50 text-amber-700 border-amber-200 text-[9px]"
                            }>{inv.status}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            ${Number(inv.amount_usd).toLocaleString()}
                            {inv.eth_amount ? ` · ~${Number(inv.eth_amount).toFixed(4)} ETH` : ""}
                            {" · "}
                            {new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {inv.source_tx_hash && (
                          <a href={`${SEPOLIA_EXPLORER_URL}/tx/${inv.source_tx_hash}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-600 hover:underline">
                            Sepolia ↗
                          </a>
                        )}
                        {inv.cc3_tx_hash && (
                          <a href={`https://creditcoin-testnet.blockscout.com/tx/${inv.cc3_tx_hash}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-purple-600 hover:underline">
                            CC3 ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


        </div>
      </div>
    </ProtectedRoute>
  )
}
