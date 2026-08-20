'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, TrendingUp, AlertTriangle, Award, Loader2 } from 'lucide-react'
import { useCreditProfile, type CreditProfile } from '@/hooks/use-credit-profile'

const glass = 'glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial'

const tierConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Gold: { label: 'Gold', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  Silver: { label: 'Silver', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
  Bronze: { label: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  HighRisk: { label: 'High Risk', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  Unscored: { label: 'Unscored', color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-muted' },
}

function ScoreGauge({ score }: { score: number }) {
  const percentage = Math.min(100, Math.max(0, (score / 1000) * 100))
  const getScoreColor = (s: number) => {
    if (s >= 750) return 'text-emerald-600'
    if (s >= 500) return 'text-[#171414]'
    if (s >= 300) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="text-center">
      <div className={`text-5xl font-black tracking-tight tabular-nums font-display ${getScoreColor(score)}`}>
        {score}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        out of 1000
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#171414]/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#E1BAC2] to-[#171414] transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[9px] font-mono text-muted-foreground">
        <span>0</span>
        <span>500</span>
        <span>1000</span>
      </div>
    </div>
  )
}

export function CreditScoreCard({ walletAddress }: { walletAddress?: string }) {
  const { data: profile, isLoading, isError } = useCreditProfile(walletAddress)

  if (isLoading) {
    return (
      <Card className={glass}>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#171414]" />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Loading credit profile...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isError || !profile) {
    return (
      <Card className={glass}>
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/50">
              <ShieldCheck className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#171414]">No Credit Score Yet</p>
              <p className="text-xs text-muted-foreground">
                Your on-chain credit profile will appear after DeFi activity is verified
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const tier = tierConfig[profile.tier] || tierConfig.Unscored

  return (
    <Card className={glass}>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Credit Score
            </p>
          </div>
          <Badge
            variant="outline"
            className={`${tier.bg} ${tier.color} ${tier.border} text-[10px] font-mono`}
          >
            {tier.label} Tier
          </Badge>
        </div>

        {/* Score */}
        <ScoreGauge score={profile.score} />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Verified Repaid
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#171414]">
              ${Number(profile.totalRepaidUSD).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Clean Repayments
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-600">
              {profile.cleanRepaymentCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Proven Events
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#171414]">
              {profile.provenEventsCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Liquidations
            </p>
            <p className={`mt-0.5 text-sm font-bold tabular-nums ${profile.liquidationCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {profile.liquidationCount}
            </p>
          </div>
        </div>

        {/* Verified badge */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Verified on Creditcoin CC3 via Attestcoin Protocol
        </div>
      </CardContent>
    </Card>
  )
}
