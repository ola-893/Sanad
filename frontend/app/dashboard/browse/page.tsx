'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { toast } from 'sonner'
import {
  Gem,
  Loader2,
  Clock,
  TrendingUp,
  Wallet,
  ExternalLink,
  Search,
  Filter,
  X,
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
    assetType?: string
    karat?: number
    weightG: number
    purity: number
    loan: number
    tenorM: number
    investorRoiPercentage?: number
    investmentTargetUsd?: number
    minInvestmentUsd?: number
    investmentFilledUsd?: number
    loanDurationMonths?: number
    imageUrl?: string[]
    borrowerWallet?: string
    pawnshopWallet?: string
  }
  createdAt: string
  updatedAt: string
}

const explorerBase = process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || 'https://creditcoin-testnet.blockscout.com'

function SagCard({ sag, ethPrice, onInvest }: { sag: SagToken; ethPrice: number; onInvest: (sag: SagToken) => void }) {
  const props = sag.sagProperties
  const weight = props?.weightG || 0
  const karat = props?.karat || (props?.purity >= 990 ? 24 : props?.purity >= 916 ? 22 : 18)
  const loan = props?.loan || 0
  const investmentTarget = props?.investmentTargetUsd || loan
  const investmentFilled = props?.investmentFilledUsd || 0
  const remaining = investmentTarget - investmentFilled
  const progress = investmentTarget > 0 ? (investmentFilled / investmentTarget) * 100 : 0
  const roi = props?.investorRoiPercentage || 12
  const duration = props?.loanDurationMonths || Math.round((props?.tenorM || 90) / 30)
  const ethAmount = ethPrice > 0 ? (investmentTarget / ethPrice).toFixed(4) : '---'
  const status = (sag.approvalStatus ?? sag.sagStatus ?? 'pending').toLowerCase()
  const isFunded = remaining <= 0

  return (
    <Card className={`${glass} overflow-hidden transition-all duration-300 hover:shadow-lg`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#171414]/5">
          <div className="flex items-center gap-3">
            <div className="gradient-gold flex h-10 w-10 items-center justify-center rounded-xl">
              <Gem className="h-5 w-5 text-[#171414]" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#171414]">
                {sag.sagName || `SAG #${sag.tokenId}`}
              </h3>
              <p className="text-[10px] text-muted-foreground">Token #{sag.tokenId}</p>
            </div>
          </div>
          <Badge variant="outline" className={isFunded ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
            {isFunded ? 'Funded' : 'Open'}
          </Badge>
        </div>

        {/* Investment Target */}
        <div className="px-5 py-4">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Investment Target</p>
              <p className="text-2xl font-bold text-[#171414]">${investmentTarget.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-emerald-600 font-mono">~{ethAmount} ETH</p>
              <p className="text-[10px] text-muted-foreground">@${ethPrice.toLocaleString()}/ETH</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">${investmentFilled.toLocaleString()} funded</span>
              <span className="text-muted-foreground">${remaining.toLocaleString()} left</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[9px] text-muted-foreground">Weight</p>
              <p className="text-xs font-bold">{weight}g</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[9px] text-muted-foreground">Karat</p>
              <p className="text-xs font-bold">{karat}K</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[9px] text-muted-foreground">ROI/mo</p>
              <p className="text-xs font-bold text-emerald-600">{roi}%</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[9px] text-muted-foreground">Duration</p>
              <p className="text-xs font-bold">{duration}mo</p>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4">
            {isFunded ? (
              <div className="text-center">
                <p className="text-xs text-emerald-600 font-medium">Target investment reached</p>
                <Button disabled className="w-full mt-2 rounded-xl bg-gray-300 text-gray-500 cursor-not-allowed">
                  Fully Funded
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => onInvest(sag)}
                className="w-full rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
              >
                <Wallet className="h-4 w-4" /> Invest Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function BrowsePage() {
  const [sags, setSags] = useState<SagToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [ethPrice, setEthPrice] = useState(0)
  const [investModal, setInvestModal] = useState<SagToken | null>(null)
  const [investAmount, setInvestAmount] = useState('')
  const [processing, setProcessing] = useState(false)

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

    apiInstance.get('/eth-price')
      .then((res) => setEthPrice(res.data?.data?.usd || 0))
      .catch(() => setEthPrice(4500))
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

  const openInvestModal = (sag: SagToken) => {
    setInvestModal(sag)
    const target = sag.sagProperties?.investmentTargetUsd || sag.sagProperties?.loan || 0
    const filled = sag.sagProperties?.investmentFilledUsd || 0
    const remaining = target - filled
    setInvestAmount(String(Math.min(remaining, 1000)))
  }

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
              Invest in gold-backed collateral tokens and earn returns
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
                    ethPrice={ethPrice}
                    onInvest={openInvestModal}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Invest Modal */}
      {investModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Invest in {investModal.sagName}</h3>
                <button onClick={() => { setInvestModal(null); setInvestAmount('') }}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              
              <div className="rounded-xl bg-muted p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Target: <span className="font-medium">${(investModal.sagProperties?.investmentTargetUsd || investModal.sagProperties?.loan || 0).toLocaleString()}</span></div>
                  <div>ROI: <span className="font-medium text-emerald-600">{investModal.sagProperties?.investorRoiPercentage || 12}%/mo</span></div>
                  <div>Weight: <span className="font-medium">{investModal.sagProperties?.weightG}g</span></div>
                  <div>Duration: <span className="font-medium">{investModal.sagProperties?.loanDurationMonths || 3} months</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Investment Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    className="rounded-xl pl-7"
                    min={investModal.sagProperties?.minInvestmentUsd || 100}
                  />
                </div>
                {ethPrice > 0 && investAmount && (
                  <p className="text-xs text-muted-foreground">~{(Number(investAmount) / ethPrice).toFixed(4)} ETH</p>
                )}
                <p className="text-[10px] text-muted-foreground">Min: ${investModal.sagProperties?.minInvestmentUsd || 100}</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setInvestModal(null); setInvestAmount('') }} disabled={processing}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!investModal || !investAmount) return
                    setProcessing(true)
                    try {
                      await apiInstance.post('/investor/invest', {
                        sagTokenId: investModal.tokenId,
                        amountUsd: Number(investAmount),
                      })
                      toast.success('Investment recorded!')
                      setInvestModal(null)
                      setInvestAmount('')
                      // Refresh
                      const res = await apiInstance.get('/sag/')
                      if (res.data.success) setSags(res.data.data ?? [])
                    } catch (err: any) {
                      toast.error(err.response?.data?.error || 'Investment failed')
                    } finally {
                      setProcessing(false)
                    }
                  }}
                  disabled={processing || !investAmount}
                  className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record Investment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  )
}
