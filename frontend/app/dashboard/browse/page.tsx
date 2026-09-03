'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
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
  CheckCircle2,
  AlertCircle,
  Send,
  Weight,
} from 'lucide-react'
import apiInstance from '@/lib/axios-v1'
import { useProofProgress } from '@/store/proof-progress'
import {
  SEPOLIA_INVESTOR_VAULT_ADDRESS,
  INVESTOR_VAULT_ABI,
  SEPOLIA_EXPLORER_URL,
  switchOrAddSepoliaNetwork,
  SEPOLIA_CHAIN_ID,
  checkEip7702Delegation,
} from '@/lib/contracts/sepolia-gateways'

const glass = 'glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial'

/**
 * Convert a full image URL (e.g. http://localhost:5002/uploads/xxx.jpg)
 * to the Next.js proxy path (/api/uploads/xxx.jpg)
 */
function formatDuration(months: number): string {
  if (months <= 0) return "1 day"
  if (months < 1) return "1 day"
  if (months === 1) return "1 month"
  if (months === 12) return "1 year"
  return `${months} months`
}

function getImageUrl(url: string): string {
  if (!url) return ''
  // Already a proxy path
  if (url.startsWith('/api/uploads/')) return url
  // Extract filename from full URL or path
  const filename = url.split('/').pop() || url
  return `/api/uploads/${filename}`
}

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
    originationDate?: string
    maturityDate?: string
  }
  createdAt: string
  updatedAt: string
}

interface ActiveJob {
  jobId: string
  sagName: string
  sagTokenId: string
  depositTxHash: string
  amountUsd: number
  ethAmount: number
  progress: number
  message: string
  status: 'queued' | 'proving' | 'completed' | 'failed'
  cc3TxHash?: string
  error?: string
  startedAt: number
}

const getProofStageMessage = (progress: number) => {
  if (progress >= 100) return 'Proof verified on CC3!'
  if (progress >= 75) return 'Submitting proof to CC3 LiquidityPool...'
  if (progress >= 45) return 'Generating Attestcoin cryptographic proof...'
  if (progress >= 15) return 'Resolving block height on Sepolia...'
  return 'Queuing proof verification...'
}

function SagCard({ sag, ethPrice, onInvest }: { sag: SagToken; ethPrice: number; onInvest: (e: React.MouseEvent, sag: SagToken) => void }) {
  const router = useRouter()
  const props = sag.sagProperties
  const weight = props?.weightG || 0
  const karat = props?.karat || (props?.purity >= 990 ? 24 : props?.purity >= 916 ? 22 : 18)
  const loan = props?.loan || 0
  const investmentTarget = props?.investmentTargetUsd || loan
  const minInvestment = Math.round(investmentTarget * 0.1)
  const investmentFilled = props?.investmentFilledUsd || 0
  const remaining = investmentTarget - investmentFilled
  const progressPct = investmentTarget > 0 ? (investmentFilled / investmentTarget) * 100 : 0
  const roi = props?.investorRoiPercentage || 2
  const duration = props?.loanDurationMonths || Math.round((props?.tenorM || 90) / 30)
  const durationLabel = formatDuration(duration)
  const ethAmount = ethPrice > 0 ? (minInvestment / ethPrice).toFixed(4) : '---'
  const status = (sag.approvalStatus ?? sag.sagStatus ?? 'pending').toLowerCase()
  const isFunded = remaining <= 0
  const hasImage = props?.imageUrl && props.imageUrl.length > 0

  // Timeline & prorated returns
  // Always compute REAL duration from originationDate + loanDurationMonths (ignore test-mode maturityDate)
  const originationDate = props?.originationDate ? new Date(props.originationDate) : new Date(sag.createdAt)
  const realMaturityDate = new Date(originationDate.getTime() + duration * 30 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const totalDays = Math.max(1, duration * 30)
  const elapsedDays = Math.max(0, Math.min(totalDays, (now.getTime() - originationDate.getTime()) / (1000 * 60 * 60 * 24)))
  const remainingDays = Math.max(0, totalDays - elapsedDays)
  const remainingMonths = remainingDays / 30
  const isExpired = now > realMaturityDate
  const proratedRoiTotal = roi * remainingMonths
  const elapsedPct = Math.min(100, (elapsedDays / totalDays) * 100)
  const formatTimeLeft = () => {
    if (isExpired) return 'Expired'
    const months = Math.floor(remainingDays / 30)
    const d = Math.floor(remainingDays % 30)
    if (months > 0) return `${months}mo ${d}d left`
    return `${Math.floor(remainingDays)}d left`
  }

  return (
    <Card
      className={`${glass} overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer group`}
      onClick={(e) => {
        // Don't navigate if clicking the invest button
        if ((e.target as HTMLElement).closest('[data-invest-btn]')) return
        router.push(`/dashboard/browse/${sag.tokenId}`)
      }}
    >
      <CardContent className="p-0">
        {/* Gold image thumbnail */}
        {hasImage && (
          <div className="relative h-36 overflow-hidden">
            <img
              src={getImageUrl(props!.imageUrl![0])}
              alt={sag.sagName}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute top-3 right-3 flex gap-1.5">
              <Badge variant="outline" className={isFunded ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-amber-500/90 text-white border-amber-400'}>
                {isFunded ? 'Funded' : 'Open'}
              </Badge>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-white drop-shadow-sm">
                  {sag.sagName || `SAG #${sag.tokenId}`}
                </h3>
                <p className="text-[10px] text-white/80">Token #{sag.tokenId}</p>
              </div>
              <p className="text-lg font-bold text-white drop-shadow-sm">${minInvestment.toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Header (only if no image) */}
          {!hasImage && (
            <div className="flex items-center justify-between">
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={isFunded ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                  {isFunded ? 'Funded' : 'Open'}
                </Badge>
              </div>
            </div>
          )}

          {/* Minimum Investment + ETH */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Minimum Investment</p>
              <p className="text-2xl font-bold text-[#171414]">${minInvestment.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-emerald-600 font-mono">~{ethAmount} ETH</p>
              <p className="text-[10px] text-muted-foreground">@${ethPrice.toLocaleString()}/ETH</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">${investmentFilled.toLocaleString()} funded</span>
              <span className="text-muted-foreground">${remaining.toLocaleString()} left</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="rounded-lg bg-muted/50 p-2">
              <Weight className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
              <p className="text-xs font-bold">{weight}g</p>
              <p className="text-[9px] text-muted-foreground">Weight</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <Gem className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
              <p className="text-xs font-bold">{karat}K</p>
              <p className="text-[9px] text-muted-foreground">Karat</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
              <TrendingUp className="h-3 w-3 mx-auto text-emerald-500 mb-0.5" />
              <p className="text-xs font-bold text-emerald-600">{proratedRoiTotal.toFixed(1)}%</p>
              <p className="text-[9px] text-emerald-600">Return now</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <Clock className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
              <p className="text-xs font-bold">{formatTimeLeft()}</p>
              <p className="text-[9px] text-muted-foreground">{durationLabel} term</p>
            </div>
          </div>

          {/* Timeline bar */}
          <div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${elapsedPct}%` }} />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
              <span>Minted {originationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>Exp {realMaturityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Action */}
          {isFunded ? (
            <div className="text-center pt-1">
              <p className="text-xs text-emerald-600 font-medium mb-2">Target investment reached</p>
              <Button disabled className="w-full rounded-xl bg-gray-300 text-gray-500 cursor-not-allowed">
                Fully Funded
              </Button>
            </div>
          ) : (
            <Button
              data-invest-btn
              onClick={(e) => onInvest(e, sag)}
              className="w-full rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
            >
              <Wallet className="h-4 w-4" /> Invest Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ActiveJobCard({ job, onDismiss }: { job: ActiveJob; onDismiss: () => void }) {
  const elapsed = Math.floor((Date.now() - job.startedAt) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <Card className="border border-purple-200 bg-purple-50/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {job.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : job.status === 'failed' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-purple-600 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-[#171414]">
                {job.status === 'completed' ? 'Investment Complete' : job.status === 'failed' ? 'Proof Failed' : 'Processing Investment'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {job.sagName} · ${job.amountUsd} · ~{job.ethAmount.toFixed(6)} ETH
              </p>
            </div>
          </div>
          {(job.status === 'completed' || job.status === 'failed') && (
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <a
          href={`${SEPOLIA_EXPLORER_URL}/tx/${job.depositTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mb-2"
        >
          Sepolia: {job.depositTxHash.slice(0, 10)}...{job.depositTxHash.slice(-6)} <ExternalLink className="h-2.5 w-2.5" />
        </a>

        {job.status !== 'failed' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">{job.message || getProofStageMessage(job.progress)}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{mins}m {secs.toString().padStart(2, '0')}s</p>
            </div>
            <Progress value={job.progress} className="h-1.5" />
          </div>
        )}

        {job.cc3TxHash && (
          <a
            href={`https://creditcoin-testnet.blockscout.com/tx/${job.cc3TxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-purple-600 hover:underline flex items-center gap-1 mt-2"
          >
            CC3: {job.cc3TxHash.slice(0, 10)}...{job.cc3TxHash.slice(-6)} <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}

        {job.error && (
          <p className="text-[10px] text-rose-600 mt-1">{job.error}</p>
        )}
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
  const { addJob: addProofJob } = useProofProgress()
  const [investModal, setInvestModal] = useState<SagToken | null>(null)
  const [investAmount, setInvestAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [depositError, setDepositError] = useState('')

  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('sanad-active-invest-jobs')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const activeJobsRef = useRef<ActiveJob[]>([])
  activeJobsRef.current = activeJobs
  const recordedJobsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    try { localStorage.setItem('sanad-active-invest-jobs', JSON.stringify(activeJobs)) } catch {}
  }, [activeJobs])

  // Poll active jobs
  useEffect(() => {
    const pending = activeJobsRef.current.filter(j => j.status === 'queued' || j.status === 'proving')
    if (pending.length === 0) return

    const interval = setInterval(async () => {
      for (const job of pending) {
        try {
          const res = await apiInstance.get(`/investor/deposit/status/${job.jobId}`)
          if (res.data?.success && res.data?.data) {
            const { state, result, error: err, progress } = res.data.data

            if (state === 'COMPLETED' && result) {
              if (!recordedJobsRef.current.has(job.jobId)) {
                recordedJobsRef.current.add(job.jobId)
                const cc3Hash = result.transactionHash || result.cc3TxHash || ''
                setActiveJobs(prev => prev.map(j =>
                  j.jobId === job.jobId
                    ? { ...j, status: 'completed' as const, progress: 100, message: 'Proof verified on CC3!', cc3TxHash: cc3Hash }
                    : j
                ))
                toast.success(`CC3 proof verified for ${job.sagName}!`)
                apiInstance.post('/investor/invest', {
                  sagTokenId: job.sagTokenId,
                  amountUsd: job.amountUsd,
                  sourceTxHash: job.depositTxHash,
                  cc3TxHash: cc3Hash,
                  ethAmount: job.ethAmount,
                }).then(() => {
                  toast.success(`Investment recorded for ${job.sagName}!`)
                  apiInstance.get('/sag/').then(r => {
                    if (r.data.success) setSags(r.data.data ?? [])
                  })
                }).catch(() => {
                  toast.error(`Failed to record investment for ${job.sagName}. Click retry.`)
                })
              }
            } else if (state === 'FAILED') {
              if (!recordedJobsRef.current.has(job.jobId)) {
                recordedJobsRef.current.add(job.jobId)
                setActiveJobs(prev => prev.map(j =>
                  j.jobId === job.jobId
                    ? { ...j, status: 'failed' as const, error: err || 'Proof failed' }
                    : j
                ))
              }
            } else {
              setActiveJobs(prev => prev.map(j =>
                j.jobId === job.jobId
                  ? { ...j, status: 'proving' as const, progress: progress || j.progress, message: getProofStageMessage(progress || j.progress) }
                  : j
              ))
            }
          }
        } catch {}
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [activeJobs.length])

  useEffect(() => {
    apiInstance
      .get('/sag/')
      .then((res) => {
        if (res.data.success) setSags(res.data.data ?? [])
      })
      .catch((err) => {
        console.error('Failed to fetch SAGs:', err)
        setError('Failed to load SAG tokens')
      })
      .finally(() => setLoading(false))

    const fetchEthPrice = () => {
      apiInstance.get('/eth-price')
        .then((res) => {
          const price = res.data?.data?.usd
          if (price && price > 0) setEthPrice(price)
        })
        .catch(() => {})
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
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

  const openInvestModal = (e: React.MouseEvent, sag: SagToken) => {
    e.stopPropagation()
    setInvestModal(sag)
    setInvestAmount('')
    setDepositError('')
  }

  const dismissJob = (jobId: string) => {
    setActiveJobs(prev => prev.filter(j => j.jobId !== jobId))
  }

  const retryJob = async (job: ActiveJob) => {
    recordedJobsRef.current.delete(job.jobId)
    setActiveJobs(prev => prev.map(j =>
      j.jobId === job.jobId ? { ...j, status: 'proving' as const, error: undefined, progress: 0, message: 'Retrying...' } : j
    ))
    try {
      const proveRes = await apiInstance.post('/investor/deposit/prove', {
        sourceTxHash: job.depositTxHash,
        chainKey: 1,
      })
      if (!proveRes.data?.success) throw new Error(proveRes.data?.error || 'Failed to queue proof')
      const { jobId: newJobId } = proveRes.data.data
      setActiveJobs(prev => prev.map(j =>
        j.jobId === job.jobId ? { ...j, jobId: newJobId, status: 'proving' as const, progress: 0, message: 'Proof job re-queued...' } : j
      ))
    } catch (err: any) {
      setActiveJobs(prev => prev.map(j =>
        j.jobId === job.jobId ? { ...j, status: 'failed' as const, error: err.message || 'Retry failed' } : j
      ))
    }
  }

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <p className="kicker-gold">Invest</p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
                Browse SAG Tokens
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Invest in gold-backed collateral tokens and earn returns
              </p>
            </div>
            <Link href="/dashboard/investments" className="text-xs text-blue-600 hover:underline font-medium">
              My Investments →
            </Link>
          </div>

          {/* Active Jobs Banner */}
          {activeJobs.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-purple-600">
                {activeJobs.filter(j => j.status === 'proving' || j.status === 'queued').length} active proof{activeJobs.filter(j => j.status === 'proving' || j.status === 'queued').length !== 1 ? 's' : ''}
              </p>
              <div className="grid gap-2">
                {activeJobs.map(job => (
                  <ActiveJobCard
                    key={job.jobId}
                    job={job}
                    onDismiss={() => dismissJob(job.jobId)}
                  />
                ))}
              </div>
            </div>
          )}

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
                <button onClick={() => { setInvestModal(null); setInvestAmount(''); setDepositError(''); }} disabled={processing}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="rounded-xl bg-muted p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Min Investment: <span className="font-medium">${Math.round((investModal.sagProperties?.investmentTargetUsd || investModal.sagProperties?.loan || 0) * 0.1) || 100}</span></div>
                  <div>ROI: <span className="font-medium text-emerald-600">{investModal.sagProperties?.investorRoiPercentage || 2}%/mo</span></div>
                  <div>Weight: <span className="font-medium">{investModal.sagProperties?.weightG}g</span></div>
                  <div>Duration: <span className="font-medium">{formatDuration(investModal.sagProperties?.loanDurationMonths || 3)}</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Investment Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    className="rounded-xl pl-7"
                    disabled={processing}
                    min={Math.round((investModal.sagProperties?.investmentTargetUsd || investModal.sagProperties?.loan || 0) * 0.1) || 100}
                  />
                </div>
                {ethPrice > 0 && investAmount && (
                  <p className="text-xs text-muted-foreground">~{(Number(investAmount) / ethPrice).toFixed(6)} ETH @ ${ethPrice.toLocaleString()}/ETH</p>
                )}
                <p className="text-[10px] text-muted-foreground">Min: ${Math.round((investModal.sagProperties?.investmentTargetUsd || investModal.sagProperties?.loan || 0) * 0.1) || 100}</p>
              </div>

              {depositError && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-50 p-3 text-xs text-rose-950">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] break-all">{depositError}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setInvestModal(null); setInvestAmount(''); setDepositError(''); }} disabled={processing}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!investModal || !investAmount || ethPrice <= 0) return
                    setProcessing(true)
                    setDepositError('')
                    try {
                      const usdAmount = Number(investAmount)
                      const ethAmount = usdAmount / ethPrice
                      const weiAmount = ethers.parseEther(ethAmount.toFixed(18))

                      toast.info(`Depositing ${ethAmount.toFixed(6)} ETH to InvestorVault...`)

                      if (typeof window === 'undefined' || !(window as any).ethereum) {
                        throw new Error('No EVM wallet detected. Please install MetaMask.')
                      }

                      const provider = new ethers.BrowserProvider((window as any).ethereum)
                      const network = await provider.getNetwork()
                      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
                        toast.info('Switching wallet to Ethereum Sepolia...')
                        await switchOrAddSepoliaNetwork()
                      }

                      const signer = await provider.getSigner()
                      const userAddress = await signer.getAddress()

                      const delegation = await checkEip7702Delegation(provider, userAddress)
                      if (delegation.isDelegated) {
                        throw new Error(
                          `EIP-7702 Delegation Detected: Your wallet (${userAddress.slice(0, 8)}...) has active delegation to ${delegation.delegatedAddress?.slice(0, 8)}... ` +
                          `Transactions are routed through a DelegationManager with 0 wei value, which prevents CC3 proof verification. ` +
                          `Please revoke EIP-7702 delegation or use a standard EOA wallet.`
                        )
                      }

                      const vaultContract = new ethers.Contract(
                        SEPOLIA_INVESTOR_VAULT_ADDRESS,
                        INVESTOR_VAULT_ABI,
                        signer
                      )

                      // Use fundLoan() instead of deposit() so loanPawnshops[tokenId] is recorded on-chain
                      const sagTokenId = Number(investModal.tokenId)
                      const pawnshopWallet = investModal.sagProperties?.pawnshopWallet || investModal.sagProperties?.borrowerWallet || '0x0000000000000000000000000000000000000000'
                      const appraisedValueUSD = Math.round((investModal.sagProperties?.investmentTargetUsd || investModal.sagProperties?.loan || 0) / 0.7)

                      const tx = await vaultContract.fundLoan(sagTokenId, pawnshopWallet, appraisedValueUSD, { value: weiAmount })
                      toast.info('Waiting for Sepolia confirmation...')
                      const receipt = await tx.wait(1)

                      if (receipt.status !== 1) {
                        throw new Error('Transaction reverted on-chain. The deposit did not go through.')
                      }

                      toast.success('Sepolia deposit confirmed! Proof processing in background...')

                      const proveRes = await apiInstance.post('/investor/deposit/prove', {
                        sourceTxHash: tx.hash,
                        chainKey: 1,
                      })

                      const jobId = proveRes.data?.data?.jobId || `deposit-${tx.hash.toLowerCase()}`

                      const newJob: ActiveJob = {
                        jobId,
                        sagName: investModal.sagName || `SAG #${investModal.tokenId}`,
                        sagTokenId: investModal.tokenId,
                        depositTxHash: tx.hash,
                        amountUsd: usdAmount,
                        ethAmount,
                        progress: 0,
                        message: 'Proof job queued...',
                        status: 'queued',
                        startedAt: Date.now(),
                      }
                      setActiveJobs(prev => [newJob, ...prev])
                      addProofJob({
                        type: 'invest',
                        jobId,
                        sagName: investModal.sagName || `SAG #${investModal.tokenId}`,
                        sagTokenId: investModal.tokenId,
                        amountUsd: usdAmount,
                        ethAmount: ethAmount.toFixed(6),
                        sourceTxHash: tx.hash,
                      })

                      setInvestModal(null)
                      setInvestAmount('')
                      setDepositError('')
                    } catch (err: any) {
                      const backendError = err?.response?.data?.error || err?.response?.data?.message || ''
                      const msg = err?.message || ''
                      let friendly = 'Deposit failed'
                      if (msg.includes('user-rejected') || msg.includes('User denied') || msg.includes('ACTION_REJECTED') || err?.code === 4001) {
                        friendly = 'Transaction cancelled. You rejected the request in MetaMask.'
                      } else if (msg.includes('insufficient funds')) {
                        friendly = 'Insufficient ETH balance in your wallet.'
                      } else if (msg.includes('network') || msg.includes('chain')) {
                        friendly = 'Network error. Please make sure you are on Sepolia.'
                      } else if (backendError) {
                        friendly = backendError
                      } else {
                        friendly = msg
                      }
                      setDepositError(friendly)
                      toast.error(friendly)
                    } finally {
                      setProcessing(false)
                    }
                  }}
                  disabled={processing || !investAmount || ethPrice <= 0}
                  className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                >
                  {processing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Invest</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  )
}
