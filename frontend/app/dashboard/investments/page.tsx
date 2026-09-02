'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/protected-route'
import {
  Wallet,
  ExternalLink,
  Gem,
  Loader2,
  ArrowLeft,
  TrendingUp,
  Clock,
  Calendar,
} from 'lucide-react'
import apiInstance from '@/lib/axios-v1'

const glass = 'glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial'

const sepoliaExplorer = process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER_URL || 'https://sepolia.etherscan.io'
const creditcoinExplorer = process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || 'https://creditcoin-testnet.blockscout.com'

interface Investment {
  id: number
  sag_token_id: string
  amount_usd: number
  eth_amount: number | null
  source_tx_hash: string | null
  cc3_tx_hash: string | null
  source_chain: string | null
  status: string
  created_at: string
  updated_at: string
  pr_sag_token_id: string | null
  investment_target_usd: string | null
  investment_filled_usd: string | null
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiInstance.get('/investor/investments')
      .then(res => { if (res.data.success) setInvestments(res.data.data ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount_usd), 0)
  const totalEth = investments.reduce((sum, inv) => sum + (inv.eth_amount ? Number(inv.eth_amount) : 0), 0)
  const completedCount = investments.filter(inv => inv.status === 'completed').length

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Back link */}
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-[#171414] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>

          {/* Header */}
          <div>
            <p className="kicker-gold">Portfolio</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
              My Investments
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your deposit history with on-chain proof links
            </p>
          </div>

          {/* Stats */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className={`${glass} border-l-4 border-l-emerald-500`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">Total Invested</p>
                </div>
                <p className="text-2xl font-bold text-[#171414]">${totalInvested.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">~{totalEth.toFixed(6)} ETH</p>
              </CardContent>
            </Card>
            <Card className={`${glass} border-l-4 border-l-blue-500`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gem className="h-4 w-4 text-blue-600" />
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">Investments</p>
                </div>
                <p className="text-2xl font-bold text-[#171414]">{investments.length}</p>
                <p className="text-xs text-muted-foreground">{completedCount} completed</p>
              </CardContent>
            </Card>
            <Card className={`${glass} border-l-4 border-l-purple-500`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">Avg. per SAG</p>
                </div>
                <p className="text-2xl font-bold text-[#171414]">
                  {investments.length > 0 ? `$${Math.round(totalInvested / investments.length).toLocaleString()}` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">gold-backed</p>
              </CardContent>
            </Card>
          </div>

          {/* Investment list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-[#171414]/10 bg-white/40 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#171414]" />
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                Loading investments...
              </p>
            </div>
          ) : investments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-[#171414]/10 bg-white/40 py-20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#E1BAC2]/15">
                <Wallet className="h-8 w-8 text-[#E1BAC2]" />
              </div>
              <p className="text-sm font-medium text-[#171414]">No investments yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Browse SAG tokens to start investing</p>
              <Link href="/dashboard/browse" className="mt-4">
                <button className="rounded-xl bg-[#171414] px-5 py-2 text-xs font-bold text-[#E1BAC2] hover:bg-black transition">
                  Browse SAG Tokens
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {investments.map(inv => (
                <Card key={inv.id} className={`${glass} overflow-hidden`}>
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Left: Investment info */}
                      <div className="flex-1 p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard/browse/${inv.sag_token_id}`} className="flex items-center gap-2 hover:opacity-80 transition">
                              <div className="gradient-gold flex h-8 w-8 items-center justify-center rounded-lg">
                                <Gem className="h-4 w-4 text-[#171414]" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#171414]">SAG #{inv.sag_token_id}</p>
                                <p className="text-[10px] text-muted-foreground">Token #{inv.sag_token_id}</p>
                              </div>
                            </Link>
                          </div>
                          <Badge variant="outline" className={
                            inv.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            inv.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }>
                            {inv.status}
                          </Badge>
                        </div>

                        {/* Amounts */}
                        <div className="flex items-baseline gap-4">
                          <div>
                            <p className="text-2xl font-bold text-[#171414]">${Number(inv.amount_usd).toLocaleString()}</p>
                            {inv.eth_amount && (
                              <p className="text-xs text-emerald-600 font-mono">~{Number(inv.eth_amount).toFixed(6)} ETH</p>
                            )}
                          </div>
                          {inv.investment_target_usd && (
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground">of ${Number(inv.investment_target_usd).toLocaleString()} target</p>
                              {inv.investment_filled_usd && (
                                <p className="text-[10px] text-muted-foreground">{Math.round((Number(inv.investment_filled_usd) / Number(inv.investment_target_usd)) * 100)}% filled</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {/* Tx links */}
                        <div className="flex flex-wrap items-center gap-3">
                          {inv.source_tx_hash && (
                            <a
                              href={`${sepoliaExplorer}/tx/${inv.source_tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/50 px-2.5 py-1 text-[10px] text-blue-700 hover:bg-blue-100 transition"
                            >
                              <span className="font-mono">Sepolia: {inv.source_tx_hash.slice(0, 8)}...{inv.source_tx_hash.slice(-4)}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                          {inv.cc3_tx_hash && (
                            <a
                              href={`${creditcoinExplorer}/tx/${inv.cc3_tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/50 px-2.5 py-1 text-[10px] text-purple-700 hover:bg-purple-100 transition"
                            >
                              <span className="font-mono">CC3: {inv.cc3_tx_hash.slice(0, 8)}...{inv.cc3_tx_hash.slice(-4)}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
