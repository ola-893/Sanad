"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import {
  Wallet,
  Gem,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  type LucideIcon,
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { CreditScoreCard } from "@/components/credit-score-card"
import apiInstance from "@/lib/axios-v1"

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

async function getETHBalance(address: string): Promise<string> {
  if (!window.ethereum) return "0"
  const hex = await window.ethereum.request({
    method: "eth_getBalance",
    params: [address, "latest"],
  })
  return (parseInt(hex, 16) / 1e18).toFixed(4)
}

export default function BorrowerDashboardPage() {
  const { walletAddress } = useWalletAuth()
  const [ethBalance, setEthBalance] = useState("0.0000")
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (walletAddress) {
      getETHBalance(walletAddress).then(setEthBalance).catch(() => setEthBalance("0"))
    }
  }, [walletAddress])

  useEffect(() => {
    // Fetch borrower's SAG loans
    apiInstance.get("/sag")
      .then((res) => setLoans(res.data.data || []))
      .catch(() => setLoans([]))
      .finally(() => setLoading(false))
  }, [])

  const activeLoans = loans.filter(l => l.status === 'active' || l.approvalStatus === 'approved')
  const pendingLoans = loans.filter(l => l.status === 'pending' || l.approvalStatus === 'pending')
  const completedLoans = loans.filter(l => l.status === 'completed' || l.approvalStatus === 'closed')

  return (
    <ProtectedRoute requiredRole="borrower">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <DashboardHeader portal="Borrower Portal" subtitle="Your gold financing overview" />

          {/* Stats Row */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="ETH Balance"
              value={`${ethBalance} ETH`}
              sub="Sepolia Testnet"
              icon={Wallet}
            />
            <StatCard
              label="Active Loans"
              value={loading ? "—" : String(activeLoans.length)}
              sub="Gold-backed financing"
              icon={CreditCard}
            />
            <StatCard
              label="Pending Applications"
              value={loading ? "—" : String(pendingLoans.length)}
              sub="Awaiting approval"
              icon={Clock}
            />
            <StatCard
              label="Completed Loans"
              value={loading ? "—" : String(completedLoans.length)}
              sub="Successfully repaid"
              icon={CheckCircle2}
            />
          </div>

          {/* Credit Score + Quick Actions */}
          <div className="grid gap-4 lg:grid-cols-7">
            <div className="lg:col-span-3">
              <CreditScoreCard walletAddress={walletAddress ?? undefined} />
              <Link href="/dashboard/borrower/credit" className="mt-2 block">
                <Button variant="ghost" className="w-full rounded-xl font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#171414] hover:bg-[#E1BAC2]/10">
                  View Full Credit Profile →
                </Button>
              </Link>
            </div>
            <Card className={`${glass} lg:col-span-4`}>
              <CardHeader>
                <p className="kicker-gold">Quick Actions</p>
                <CardTitle className="font-display">Gold Financing</CardTitle>
                <CardDescription>Apply for Shariah-compliant gold-backed loans</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/dashboard/borrower/apply" className="block">
                  <Button className="w-full justify-start gap-3 rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black">
                    <Plus className="h-4 w-4" />
                    Apply for New Loan
                  </Button>
                </Link>
                <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                  <p className="text-xs font-medium text-[#171414] mb-2">How it works:</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Select a pawnshop and submit your gold details</li>
                    <li>Pawnshop reviews and accepts your request</li>
                    <li>Meet physically for gold assessment</li>
                    <li>Funds disbursed and SAG NFT minted</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Loans */}
          <Card className={glass}>
            <CardHeader>
              <p className="kicker-gold">Loans</p>
              <CardTitle className="font-display">Your Gold Financing</CardTitle>
              <CardDescription>Active and recent SAG loan applications</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading loans...</div>
              ) : loans.length === 0 ? (
                <div className="text-center py-8">
                  <Gem className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No loans yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Apply for your first gold-backed loan to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {loans.slice(0, 5).map((loan) => (
                    <div key={loan.sagId} className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          loan.approvalStatus === 'approved' ? "bg-emerald-100" :
                          loan.approvalStatus === 'pending' ? "bg-amber-100" : "bg-slate-100"
                        }`}>
                          {loan.approvalStatus === 'approved' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
                           loan.approvalStatus === 'pending' ? <Clock className="h-5 w-5 text-amber-600" /> :
                           <AlertCircle className="h-5 w-5 text-slate-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#171414]">{loan.sagName || 'Gold Collateral'}</p>
                          <p className="text-xs text-muted-foreground">
                            {loan.sagProperties?.weightG || 0}g • {loan.sagProperties?.purity || 999} purity
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#171414]">
                          {(loan.sagProperties?.loan || 0).toLocaleString()} MYR
                        </p>
                        <Badge variant="outline" className={`text-[9px] font-mono ${
                          loan.approvalStatus === 'approved' ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                          loan.approvalStatus === 'pending' ? "border-amber-200 bg-amber-50 text-amber-700" :
                          "border-slate-200 bg-slate-50 text-slate-600"
                        }`}>
                          {loan.approvalStatus || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </ProtectedRoute>
  )
}
