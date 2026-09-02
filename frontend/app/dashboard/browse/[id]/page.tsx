'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Wallet,
  ExternalLink,
  ArrowLeft,
  Clock,
  TrendingUp,
  Weight,
  ShieldCheck,
  X,
  AlertCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import apiInstance from '@/lib/axios-v1'
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
function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('/api/uploads/')) return url
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

export default function SagDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tokenId = params.id as string

  const [sag, setSag] = useState<SagToken | null>(null)
  const [loading, setLoading] = useState(true)
  const [ethPrice, setEthPrice] = useState(0)
  const [myInvestments, setMyInvestments] = useState<Investment[]>([])
  const [currentImage, setCurrentImage] = useState(0)

  // Invest modal state
  const [investAmount, setInvestAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [depositError, setDepositError] = useState('')
  const [showInvestModal, setShowInvestModal] = useState(false)

  // Active job tracking
  const [activeJobs, setActiveJobs] = useState<any[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('sanad-active-invest-jobs')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const activeJobsRef = useRef<any[]>([])
  activeJobsRef.current = activeJobs
  const recordedJobsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    try { localStorage.setItem('sanad-active-invest-jobs', JSON.stringify(activeJobs)) } catch {}
  }, [activeJobs])

  // Poll active jobs
  useEffect(() => {
    const pending = activeJobsRef.current.filter((j: any) => j.status === 'queued' || j.status === 'proving')
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
                setActiveJobs((prev: any[]) => prev.map((j: any) =>
                  j.jobId === job.jobId ? { ...j, status: 'completed', progress: 100, cc3TxHash: cc3Hash } : j
                ))
                toast.success(`CC3 proof verified for ${job.sagName}!`)
                apiInstance.post('/investor/invest', {
                  sagTokenId: job.sagTokenId,
                  amountUsd: job.amountUsd,
                  sourceTxHash: job.depositTxHash,
                  cc3TxHash: cc3Hash,
                  ethAmount: job.ethAmount,
                }).then(() => {
                  toast.success(`Investment recorded!`)
                  loadData()
                }).catch(() => toast.error(`Failed to record investment.`))
              }
            } else if (state === 'FAILED') {
              if (!recordedJobsRef.current.has(job.jobId)) {
                recordedJobsRef.current.add(job.jobId)
                setActiveJobs((prev: any[]) => prev.map((j: any) =>
                  j.jobId === job.jobId ? { ...j, status: 'failed', error: err || 'Proof failed' } : j
                ))
              }
            } else {
              setActiveJobs((prev: any[]) => prev.map((j: any) =>
                j.jobId === job.jobId ? { ...j, status: 'proving', progress: progress || j.progress } : j
              ))
            }
          }
        } catch {}
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [activeJobs.length])

  const loadData = () => {
    apiInstance.get('/sag/').then(res => {
      if (res.data.success) {
        const found = (res.data.data ?? []).find((s: SagToken) => String(s.tokenId) === String(tokenId))
        setSag(found || null)
      }
    }).catch(() => {}).finally(() => setLoading(false))

    apiInstance.get('/investor/investments').then(res => {
      if (res.data.success) setMyInvestments(res.data.data ?? [])
    }).catch(() => {})
  }

  useEffect(() => {
    loadData()
    const fetchEthPrice = () => {
      apiInstance.get('/eth-price')
        .then(res => setEthPrice(res.data?.data?.usd || 0))
        .catch(() => setEthPrice(0))
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
  }, [tokenId])

  if (loading) {
    return (
      <ProtectedRoute requiredRole="investor">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#171414]" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!sag) {
    return (
      <ProtectedRoute requiredRole="investor">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <Gem className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">SAG token not found</p>
          <Link href="/dashboard/browse">
            <Button variant="outline" className="rounded-xl gap-2"><ArrowLeft className="h-4 w-4" /> Back to Browse</Button>
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  const props = sag.sagProperties
  const images = props?.imageUrl || []
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
  const isFunded = remaining <= 0
  const status = (sag.approvalStatus ?? sag.sagStatus ?? 'pending').toLowerCase()

  // Timeline calculations
  const originationDate = props?.originationDate ? new Date(props.originationDate) : new Date(sag.createdAt)
  const maturityDate = props?.maturityDate ? new Date(props.maturityDate) : new Date(originationDate.getTime() + duration * 30 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const totalDays = Math.max(1, (maturityDate.getTime() - originationDate.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.max(0, Math.min(totalDays, (now.getTime() - originationDate.getTime()) / (1000 * 60 * 60 * 24)))
  const remainingDays = Math.max(0, totalDays - elapsedDays)
  const remainingMonths = remainingDays / 30
  const isExpired = now > maturityDate
  const isStarted = now >= originationDate
  const elapsedPct = Math.min(100, (elapsedDays / totalDays) * 100)

  // Prorated return: someone investing TODAY gets returns proportional to remaining months
  const fullRoiTotal = roi * duration  // total % return over full loan (e.g. 12% * 3 = 36%)
  const proratedRoiTotal = roi * remainingMonths  // prorated % return from now
  const formatTimeLeft = () => {
    if (isExpired) return 'Expired'
    const days = Math.floor(remainingDays)
    const months = Math.floor(remainingDays / 30)
    const d = Math.floor(remainingDays % 30)
    if (months > 0) return `${months}mo ${d}d left`
    return `${days}d left`
  }

  const myTotalInvested = myInvestments
    .filter(inv => String(inv.sag_token_id) === String(tokenId) && inv.status === 'completed')
    .reduce((sum, inv) => sum + Number(inv.amount_usd), 0)

  const mySagInvestments = myInvestments.filter(
    inv => String(inv.sag_token_id) === String(tokenId) && inv.status === 'completed'
  )

  const handleInvest = async () => {
    if (!sag || !investAmount || ethPrice <= 0) return
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
          `EIP-7702 Delegation Detected: Your wallet has active delegation to ${delegation.delegatedAddress?.slice(0, 8)}... ` +
          `Please revoke EIP-7702 delegation or use a standard EOA wallet.`
        )
      }

      const vaultContract = new ethers.Contract(SEPOLIA_INVESTOR_VAULT_ADDRESS, INVESTOR_VAULT_ABI, signer)
      const tx = await vaultContract.deposit(weiAmount, { value: weiAmount })
      toast.info('Waiting for Sepolia confirmation...')
      const receipt = await tx.wait(1)
      if (receipt.status !== 1) throw new Error('Transaction reverted on-chain.')

      toast.success('Sepolia deposit confirmed! Proof processing in background...')

      const proveRes = await apiInstance.post('/investor/deposit/prove', {
        sourceTxHash: tx.hash,
        chainKey: 1,
      })
      const jobId = proveRes.data?.data?.jobId || `deposit-${tx.hash.toLowerCase()}`

      setActiveJobs((prev: any[]) => [{
        jobId,
        sagName: sag.sagName || `SAG #${sag.tokenId}`,
        sagTokenId: sag.tokenId,
        depositTxHash: tx.hash,
        amountUsd: usdAmount,
        ethAmount,
        progress: 0,
        message: 'Proof job queued...',
        status: 'queued',
        startedAt: Date.now(),
      }, ...prev])

      setShowInvestModal(false)
      setInvestAmount('')
      setDepositError('')
    } catch (err: any) {
      const msg = err?.message || ''
      let friendly = 'Deposit failed'
      if (msg.includes('user-rejected') || msg.includes('User denied') || msg.includes('ACTION_REJECTED') || err?.code === 4001) {
        friendly = 'Transaction cancelled. You rejected the request in MetaMask.'
      } else if (msg.includes('insufficient funds')) {
        friendly = 'Insufficient ETH balance in your wallet.'
      } else if (msg.includes('network') || msg.includes('chain')) {
        friendly = 'Network error. Please make sure you are on Sepolia.'
      } else {
        friendly = msg
      }
      setDepositError(friendly)
      toast.error(friendly)
    } finally {
      setProcessing(false)
    }
  }

  const getProofStageMessage = (progress: number) => {
    if (progress >= 100) return 'Proof verified on CC3!'
    if (progress >= 75) return 'Submitting proof to CC3 LiquidityPool...'
    if (progress >= 45) return 'Generating Attestcoin cryptographic proof...'
    if (progress >= 15) return 'Resolving block height on Sepolia...'
    return 'Queuing proof verification...'
  }

  const thisSagJobs = activeJobs.filter((j: any) => j.sagTokenId === String(tokenId))

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Back link */}
          <Link href="/dashboard/browse" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-[#171414] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Browse
          </Link>

          {/* Gold Images + Info */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Image gallery */}
            <Card className={`${glass} overflow-hidden`}>
              <CardContent className="p-0">
                {images.length > 0 ? (
                  <div className="relative aspect-square">
                    <img
                      src={getImageUrl(images[currentImage])}
                      alt={sag.sagName}
                      className="h-full w-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImage((c) => (c - 1 + images.length) % images.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCurrentImage((c) => (c + 1) % images.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentImage(i)}
                              className={`h-2 w-2 rounded-full transition ${i === currentImage ? 'bg-white' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-muted/30">
                    <Gem className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Details panel */}
            <div className="space-y-4">
              {/* Title + badges */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={
                    status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }>{status}</Badge>
                  <Badge variant="outline" className={isFunded ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                    {isFunded ? 'Fully Funded' : 'Open'}
                  </Badge>
                </div>
                <h1 className="font-display text-2xl font-extrabold text-[#171414] mt-1">
                  {sag.sagName || `SAG #${sag.tokenId}`}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">Token #{sag.tokenId} · {sag.sagType}</p>
              </div>

              {/* Investment Progress */}
              <Card className="border border-[#171414]/10 bg-white/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">Investment Progress</p>
                      <p className="text-2xl font-bold text-[#171414]">${investmentFilled.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ ${investmentTarget.toLocaleString()}</span></p>
                    </div>
                    <div className="text-right">
                      {ethPrice > 0 && (
                        <>
                          <p className="text-xs text-emerald-600 font-mono">~{(minInvestment / ethPrice).toFixed(6)} ETH</p>
                          <p className="text-[10px] text-muted-foreground">@${ethPrice.toLocaleString()}/ETH</p>
                        </>
                      )}
                    </div>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>${remaining.toLocaleString()} remaining</span>
                    <span>{Math.round(progressPct)}% funded</span>
                  </div>
                </CardContent>
              </Card>

              {/* Properties grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#171414]/10 bg-white/60 p-3 text-center">
                  <Weight className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-[#171414]">{weight}g</p>
                  <p className="text-[10px] text-muted-foreground">Gold Weight</p>
                </div>
                <div className="rounded-xl border border-[#171414]/10 bg-white/60 p-3 text-center">
                  <Gem className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-[#171414]">{karat}K</p>
                  <p className="text-[10px] text-muted-foreground">Purity ({props?.purity || 0}‰)</p>
                </div>
                <div className="rounded-xl border border-[#171414]/10 bg-white/60 p-3 text-center">
                  <TrendingUp className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                  <p className="text-lg font-bold text-emerald-600">{roi}%</p>
                  <p className="text-[10px] text-muted-foreground">ROI / month</p>
                </div>
                <div className="rounded-xl border border-[#171414]/10 bg-white/60 p-3 text-center">
                  <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-[#171414]">{formatTimeLeft()}</p>
                  <p className="text-[10px] text-muted-foreground">{duration}mo duration</p>
                </div>
              </div>

              {/* Loan Timeline */}
              <Card className="border border-[#171414]/10 bg-white/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">Loan Timeline</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-center">
                      <p className="font-medium text-[#171414]">{originationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-[10px] text-muted-foreground">Minted</p>
                    </div>
                    <div className="flex-1 mx-3">
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${elapsedPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                        <span>{Math.round(elapsedPct)}% elapsed</span>
                        <span>{isExpired ? 'Ended' : formatTimeLeft()}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-[#171414]">{maturityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-[10px] text-muted-foreground">Expires</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prorated Expected Returns */}
              {!isExpired && (
                <Card className="border border-emerald-200 bg-emerald-50/40">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-mono uppercase text-emerald-700">Expected Returns (per $1 invested today)</p>
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[9px]">
                        {roi}%/mo · {remainingMonths.toFixed(1)}mo remaining
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white/80 p-3 text-center">
                        <p className="text-xl font-bold text-emerald-600">{proratedRoiTotal.toFixed(1)}%</p>
                        <p className="text-[10px] text-muted-foreground">Total return if invest now</p>
                      </div>
                      <div className="rounded-lg bg-white/80 p-3 text-center">
                        <p className="text-xl font-bold text-[#171414]">${(1 + proratedRoiTotal / 100).toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">You get back per $1</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/60 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Example: invest ${minInvestment} → get back <span className="font-bold text-emerald-600">${(minInvestment * (1 + proratedRoiTotal / 100)).toFixed(2)}</span> ({proratedRoiTotal.toFixed(1)}% return)</p>
                    </div>
                    <p className="text-[10px] text-emerald-600">
                      {isStarted
                        ? `${elapsedDays.toFixed(0)} days elapsed. Returns scale with your investment amount. Invest early for the full ${roi * duration}% return.`
                        : `Loan hasn't started yet. Investing now locks in the full ${roi * duration}% return.`
                      }
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Wallets */}
              <div className="rounded-xl border border-[#171414]/10 bg-white/60 p-3 space-y-2">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">On-Chain Details</p>
                {props?.borrowerWallet && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Borrower</span>
                    <a href={`${SEPOLIA_EXPLORER_URL}/address/${props.borrowerWallet}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono text-[10px]">
                      {props.borrowerWallet.slice(0, 6)}...{props.borrowerWallet.slice(-4)} ↗
                    </a>
                  </div>
                )}
                {props?.pawnshopWallet && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pawnshop</span>
                    <a href={`${SEPOLIA_EXPLORER_URL}/address/${props.pawnshopWallet}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono text-[10px]">
                      {props.pawnshopWallet.slice(0, 6)}...{props.pawnshopWallet.slice(-4)} ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Invest CTA */}
              {!isFunded ? (
                <Button
                  onClick={() => setShowInvestModal(true)}
                  className="w-full rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black h-12"
                >
                  <Wallet className="h-4 w-4" /> Invest in This SAG
                </Button>
              ) : (
                <div className="text-center rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-sm font-medium text-emerald-700">Target investment reached</p>
                </div>
              )}
            </div>
          </div>

          {/* My Investments in this SAG */}
          {mySagInvestments.length > 0 && (
            <Card className={`${glass}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-medium text-[#171414]">Your Investment in This SAG</p>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    ${myTotalInvested.toLocaleString()} total
                  </Badge>
                </div>
                <div className="space-y-2">
                  {mySagInvestments.map(inv => (
                    <div key={inv.id} className="rounded-xl border border-[#171414]/5 bg-white/60 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#171414]">${Number(inv.amount_usd).toLocaleString()}</p>
                          {inv.eth_amount && (
                            <p className="text-xs text-muted-foreground font-mono">~{Number(inv.eth_amount).toFixed(6)} ETH</p>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">{inv.status}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">{new Date(inv.created_at).toLocaleString()}</p>
                      <div className="flex items-center gap-4">
                        {inv.source_tx_hash && (
                          <a href={`${SEPOLIA_EXPLORER_URL}/tx/${inv.source_tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                            Sepolia: {inv.source_tx_hash.slice(0, 10)}...{inv.source_tx_hash.slice(-6)} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {inv.cc3_tx_hash && (
                          <a href={`https://creditcoin-testnet.blockscout.com/tx/${inv.cc3_tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:underline flex items-center gap-1">
                            CC3: {inv.cc3_tx_hash.slice(0, 10)}...{inv.cc3_tx_hash.slice(-6)} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active jobs for this SAG */}
          {thisSagJobs.length > 0 && (
            <div className="space-y-2">
              {thisSagJobs.map((job: any) => (
                <Card key={job.jobId} className="border border-purple-200 bg-purple-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {job.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                       job.status === 'failed' ? <AlertCircle className="h-4 w-4 text-rose-600" /> :
                       <Loader2 className="h-4 w-4 animate-spin text-purple-600" />}
                      <p className="text-xs font-medium">
                        {job.status === 'completed' ? 'Proof Complete' : job.status === 'failed' ? 'Proof Failed' : 'Processing...'}
                      </p>
                      {job.status !== 'failed' && <Progress value={job.progress} className="h-1 flex-1" />}
                    </div>
                    {job.depositTxHash && (
                      <a href={`${SEPOLIA_EXPLORER_URL}/tx/${job.depositTxHash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline">
                        Sepolia: {job.depositTxHash.slice(0, 10)}...{job.depositTxHash.slice(-6)} ↗
                      </a>
                    )}
                    {job.cc3TxHash && (
                      <a href={`https://creditcoin-testnet.blockscout.com/tx/${job.cc3TxHash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:underline block mt-1">
                        CC3: {job.cc3TxHash.slice(0, 10)}...{job.cc3TxHash.slice(-6)} ↗
                      </a>
                    )}
                    {job.error && <p className="text-[10px] text-rose-600 mt-1">{job.error}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invest Modal */}
      {showInvestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Invest in {sag.sagName}</h3>
                <button onClick={() => { setShowInvestModal(false); setInvestAmount(''); setDepositError(''); }} disabled={processing}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="rounded-xl bg-muted p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Min Investment: <span className="font-medium">${minInvestment}</span></div>
                  <div>Weight: <span className="font-medium">{weight}g</span></div>
                  <div>Full ROI: <span className="font-medium text-emerald-600">{roi * duration}%</span></div>
                  <div>Your Return: <span className="font-medium text-emerald-600">{proratedRoiTotal.toFixed(1)}%</span></div>
                </div>
                {!isExpired && (
                  <div className="mt-2 pt-2 border-t border-muted-foreground/10 text-[10px] text-muted-foreground">
                    {remainingMonths.toFixed(1)} months remaining · Invest today for {proratedRoiTotal.toFixed(1)}% total return
                  </div>
                )}
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
                    min={minInvestment}
                  />
                </div>
                {ethPrice > 0 && investAmount && (
                  <p className="text-xs text-muted-foreground">~{(Number(investAmount) / ethPrice).toFixed(6)} ETH @ ${ethPrice.toLocaleString()}/ETH</p>
                )}
                {investAmount && Number(investAmount) >= minInvestment && !isExpired && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Expected return:</span>
                      <span className="font-bold text-emerald-700">${(Number(investAmount) * proratedRoiTotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-600">Total payout:</span>
                      <span className="font-medium text-emerald-600">${(Number(investAmount) * (1 + proratedRoiTotal / 100)).toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] text-emerald-600">Based on {proratedRoiTotal.toFixed(1)}% return ({remainingMonths.toFixed(1)} months remaining)</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">Min: ${minInvestment}</p>
              </div>

              {depositError && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-50 p-3 text-xs text-rose-950">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] break-all">{depositError}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowInvestModal(false); setInvestAmount(''); setDepositError(''); }} disabled={processing}>Cancel</Button>
                <Button
                  onClick={handleInvest}
                  disabled={processing || !investAmount || ethPrice <= 0}
                  className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                >
                  {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><Send className="h-4 w-4" /> Invest</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  )
}
