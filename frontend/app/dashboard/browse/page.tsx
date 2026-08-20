'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/protected-route'
import {
  Gem,
  Loader2,
  ExternalLink,
  Shield,
  Scale,
  Clock,
  TrendingUp,
  X,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react'
import apiInstance from '@/lib/axios-v1'

const glass = 'glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial'

interface SagToken {
  sagId: string
  sagName: string
  sagType: string
  approvalStatus: string
  sagStatus: string
  tokenId: string
  sagProperties: {
    weightG: number
    purity: number
    loan: number
    tenorM: number
    arRahnuName?: string
    loanPurpose?: string
    risk_level?: string
    ltv?: number
    action?: string
    rationale?: string
    eval_id?: string
  }
  createdAt: string
  updatedAt: string
}

const explorerBase = process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || 'https://creditcoin-testnet.blockscout.com'

function propertyOf(sag: SagToken, key: string): string | number | null {
  const props = sag.sagProperties as Record<string, unknown> | null
  const value = props?.[key]
  return value === undefined || value === null ? null : value as string | number
}

const statusColors: Record<string, string> = {
  approved: 'border-success/30 bg-success/10 text-success',
  pending: 'border-warning/30 bg-warning/10 text-warning',
  rejected: 'border-destructive/30 bg-destructive/10 text-destructive',
  active: 'border-success/30 bg-success/10 text-success',
  funded: 'border-primary/30 bg-primary/10 text-primary',
  closed: 'border-muted bg-muted/50 text-muted-foreground',
}

function SagCard({ sag, onClick }: { sag: SagToken; onClick: () => void }) {
  const weight = propertyOf(sag, 'weightG') as number | null
  const purity = propertyOf(sag, 'purity') as number | null
  const loan = propertyOf(sag, 'loan') as number | null
  const tenor = propertyOf(sag, 'tenorM') as number | null
  const risk = propertyOf(sag, 'risk_level') as string | null
  const status = (sag.approvalStatus ?? sag.sagStatus ?? 'pending').toLowerCase()
  const statusColor = statusColors[status] || 'border-muted bg-muted/50 text-muted-foreground'

  const karat = purity != null ? (purity >= 990 ? 24 : purity >= 916 ? 22 : 18) : null

  return (
    <Card
      className={`${glass} group cursor-pointer overflow-hidden transition-all duration-300 hover:bg-white/80 hover:shadow-lg hover:shadow-[#171414]/5 hover:-translate-y-0.5`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Gold gradient header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#E1BAC2]/20 via-[#F5F5F3] to-[#E1BAC2]/10 px-5 pt-5 pb-4">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#E1BAC2]/15" />
          <div className="absolute -left-4 -bottom-4 h-16 w-16 rounded-full bg-[#171414]/5" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="gradient-gold flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm">
                <Gem className="h-5 w-5 text-[#171414]" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#171414]">
                  {sag.sagName || `SAG #${sag.tokenId || sag.sagId}`}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {sag.sagType || 'Conventional'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={`${statusColor} text-[10px] font-mono`}>
              {status}
            </Badge>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 divide-x divide-[#171414]/5 border-t border-[#171414]/8">
          <div className="px-5 py-3.5 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Weight
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#171414]">
              {weight != null ? `${weight}g` : '—'}
            </p>
          </div>
          <div className="px-5 py-3.5 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Karat
            </p>
            <p className="mt-0.5 text-sm font-bold text-[#171414]">
              {karat != null ? `${karat}K` : '—'}
            </p>
          </div>
          <div className="px-5 py-3.5 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Loan
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-primary">
              {loan != null ? `$${Number(loan).toLocaleString()}` : '—'}
            </p>
          </div>
          <div className="px-5 py-3.5 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Tenor
            </p>
            <p className="mt-0.5 text-sm font-bold text-[#171414]">
              {tenor != null ? `${tenor}mo` : '—'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#171414]/8 px-5 py-3">
          <div className="flex items-center gap-1.5">
            {risk && (
              <Badge
                variant="outline"
                className={
                  risk === 'LOW'
                    ? 'border-success/30 bg-success/10 text-success text-[9px]'
                    : risk === 'MEDIUM'
                    ? 'border-warning/30 bg-warning/10 text-warning text-[9px]'
                    : 'border-destructive/30 bg-destructive/10 text-destructive text-[9px]'
                }
              >
                {risk} Risk
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground group-hover:text-[#171414] transition-colors">
            Details
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SagDetailModal({ sag, onClose }: { sag: SagToken; onClose: () => void }) {
  const weight = propertyOf(sag, 'weightG') as number | null
  const purity = propertyOf(sag, 'purity') as number | null
  const loan = propertyOf(sag, 'loan') as number | null
  const tenor = propertyOf(sag, 'tenorM') as number | null
  const risk = propertyOf(sag, 'risk_level') as string | null
  const ltv = propertyOf(sag, 'ltv') as number | null
  const rationale = propertyOf(sag, 'rationale') as string | null
  const arRahnuName = propertyOf(sag, 'arRahnuName') as string | null
  const loanPurpose = propertyOf(sag, 'loanPurpose') as string | null
  const status = (sag.approvalStatus ?? sag.sagStatus ?? 'pending').toLowerCase()
  const karat = purity != null ? (purity >= 990 ? 24 : purity >= 916 ? 22 : 18) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#171414]/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-[#171414]/15 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#E1BAC2]/20 via-[#F5F5F3] to-[#E1BAC2]/10 px-6 pt-6 pb-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#E1BAC2]/15" />
          <div className="absolute -left-6 -bottom-6 h-20 w-20 rounded-full bg-[#171414]/5" />

          <div className="relative">
            <button
              onClick={onClose}
              className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-[#4A4A4A] transition-colors hover:bg-white/80 hover:text-[#171414]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="gradient-gold flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm">
                <Gem className="h-6 w-6 text-[#171414]" />
              </div>
              <div>
                <h2 className="font-display text-xl font-extrabold text-[#171414]">
                  {sag.sagName || `SAG #${sag.tokenId || sag.sagId}`}
                </h2>
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  {sag.sagType || 'Conventional'} &middot; {status}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 px-6 py-5">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
              <div className="flex items-center gap-2">
                <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  Weight
                </p>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#171414]">
                {weight != null ? `${weight}g` : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
              <div className="flex items-center gap-2">
                <Gem className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  Purity
                </p>
              </div>
              <p className="mt-1 text-lg font-bold text-[#171414]">
                {purity != null ? `${purity}‰ (${karat}K)` : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  Loan Amount
                </p>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-primary">
                {loan != null ? `$${Number(loan).toLocaleString()}` : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  Tenor
                </p>
              </div>
              <p className="mt-1 text-lg font-bold text-[#171414]">
                {tenor != null ? `${tenor} months` : '—'}
              </p>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-2">
            {ltv != null && (
              <div className="flex items-center justify-between rounded-xl border border-[#171414]/8 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Loan-to-Value (LTV)</span>
                <span className="text-sm font-bold tabular-nums text-[#171414]">{ltv}%</span>
              </div>
            )}
            {risk && (
              <div className="flex items-center justify-between rounded-xl border border-[#171414]/8 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Risk Level</span>
                <Badge
                  variant="outline"
                  className={
                    risk === 'LOW'
                      ? 'border-success/30 bg-success/10 text-success text-[10px]'
                      : risk === 'MEDIUM'
                      ? 'border-warning/30 bg-warning/10 text-warning text-[10px]'
                      : 'border-destructive/30 bg-destructive/10 text-destructive text-[10px]'
                  }
                >
                  {risk}
                </Badge>
              </div>
            )}
            {arRahnuName && (
              <div className="flex items-center justify-between rounded-xl border border-[#171414]/8 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Ar-Rahnu Partner</span>
                <span className="text-sm font-medium text-[#171414]">{arRahnuName}</span>
              </div>
            )}
            {loanPurpose && (
              <div className="flex items-center justify-between rounded-xl border border-[#171414]/8 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Loan Purpose</span>
                <span className="text-sm font-medium text-[#171414]">{loanPurpose}</span>
              </div>
            )}
            {sag.tokenId && (
              <div className="flex items-center justify-between rounded-xl border border-[#171414]/8 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Token ID</span>
                <a
                  href={`${explorerBase}/token/erc721/${sag.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {sag.tokenId.slice(0, 12)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* AI Evaluation */}
          {rationale && (
            <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  AI Evaluation
                </p>
              </div>
              <p className="text-sm leading-relaxed text-[#4A4A4A]">{rationale}</p>
            </div>
          )}

          {/* Created date */}
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Created {new Date(sag.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BrowsePage() {
  const [sags, setSags] = useState<SagToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSag, setSelectedSag] = useState<SagToken | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    apiInstance
      .get('/sag/')
      .then((res) => {
        if (res.data.success) {
          setSags(res.data.data ?? [])
        }
      })
      .catch((err) => {
        console.error('Failed to fetch SAGs:', err)
        setError('Failed to load SAG tokens')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = sags.filter((sag) => {
    const matchesSearch =
      !searchQuery ||
      sag.sagName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sag.tokenId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sag.sagId?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      filterStatus === 'all' ||
      (sag.approvalStatus ?? sag.sagStatus ?? '').toLowerCase() === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div>
            <p className="kicker-gold">Invest</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
              Browse SAG Tokens
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Shariah-compliant gold collateral financing on Creditcoin
            </p>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or token ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-[#171414]/10 bg-white/60 py-2.5 pl-10 pr-4 text-sm text-[#171414] placeholder:text-muted-foreground focus:border-[#171414]/25 focus:outline-none focus:ring-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {['all', 'approved', 'pending', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                    filterStatus === status
                      ? 'bg-[#171414] text-[#E1BAC2]'
                      : 'bg-white/60 text-[#4A4A4A] hover:bg-white/80'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-[#171414]/10 bg-white/40 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#171414]" />
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                Loading SAG tokens...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-[#171414]/10 bg-white/40 py-20">
              <Gem className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-[#171414]">{error}</p>
              <p className="mt-1 text-xs text-muted-foreground">Please try again later</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-[#171414]/10 bg-white/40 py-20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#E1BAC2]/15">
                <Gem className="h-8 w-8 text-[#E1BAC2]" />
              </div>
              <p className="text-sm font-medium text-[#171414]">
                {searchQuery || filterStatus !== 'all' ? 'No matching SAG tokens' : 'No SAG tokens yet'}
              </p>
              <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Gold collateral NFTs will appear here once they are created on-chain'}
              </p>
            </div>
          ) : (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {filtered.length} token{filtered.length !== 1 ? 's' : ''} available
              </p>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((sag) => (
                  <SagCard
                    key={sag.sagId}
                    sag={sag}
                    onClick={() => setSelectedSag(sag)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSag && (
        <SagDetailModal sag={selectedSag} onClose={() => setSelectedSag(null)} />
      )}
    </ProtectedRoute>
  )
}
