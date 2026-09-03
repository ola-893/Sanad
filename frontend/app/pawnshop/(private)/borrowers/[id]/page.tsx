"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import apiInstance from "@/lib/axios-v1"
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Coins,
  Loader2,
  ShieldCheck,
  Copy,
  Scale,
  User,
  Wallet,
  FileText,
  TrendingUp,
  Calendar,
  Banknote,
  Plus,
} from "lucide-react"

const SEPOLIA_EXPLORER = "https://eth-sepolia.blockscout.com"
const CC3_EXPLORER = "https://creditcoin-testnet.blockscout.com"

interface PledgeRequest {
  id: string
  borrowerId: string
  borrowerWallet: string
  borrowerFirstName: string
  borrowerLastName: string
  borrowerEmail: string
  pawnshopId: string
  pawnshopWallet: string
  goldDetails: any
  requestedAmount: string
  status: string
  pawnshopNotes: string
  borrowerCreditScore: number
  borrowerCreditTier: string
  borrowerEvents: any[]
  borrowerTransactionLinks: any[]
  goldImages: string[]
  verificationStatus: string
  verificationNotes: string
  verifiedWeightG: string
  verifiedKarat: number
  verifiedPurity: string
  verifiedAppraisedValueUsd: string
  paymentAmountUsd: string
  paymentTxHash: string
  paymentCc3TxHash: string
  paymentStatus: string
  paidAt: string
  sagTokenId: string
  sagMintedAt: string
  pawnshopContactName: string
  pawnshopContactPhone: string
  pawnshopLocation: string
  loanDurationMonths: number
  loanMaturityDate: string
  investmentTargetUsd: string
  investmentFilledUsd: string
  minInvestmentUsd: string
  createdAt: string
  updatedAt: string
}

interface Investment {
  id: number
  userId: string
  sagTokenId: string
  amountUsd: string
  ethAmount: string
  sourceTxHash: string
  sourceChain: string
  cc3TxHash: string
  status: string
  investorFirstName: string
  investorLastName: string
  investorWallet: string
  createdAt: string
}

interface Repayment {
  id: number
  pledgeRequestId: string
  borrowerId: string
  pawnshopId: string
  amountUsd: string
  txHash: string
  cc3TxHash: string
  notes: string
  status: string
  createdAt: string
  borrowerFirstName: string
  borrowerLastName: string
}

interface BorrowerDetail {
  requests: PledgeRequest[]
  investments: Investment[]
  repayments: Repayment[]
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  accepted: { label: "Accepted", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
  gold_verified: { label: "Gold Verified", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: ShieldCheck },
  funded: { label: "Funded", color: "bg-violet-100 text-violet-800 border-violet-200", icon: Coins },
  sag_minted: { label: "SAG Minted", color: "bg-[#e1bac2]/30 text-[#8c5a63] border-[#e1bac2]", icon: Coins },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  repaid: { label: "Repaid", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  defaulted: { label: "Defaulted", color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
}

const LIFECYCLE_STAGES = [
  { key: "pending", label: "Applied" },
  { key: "accepted", label: "Accepted" },
  { key: "gold_verified", label: "Gold Verified" },
  { key: "funded", label: "Funded" },
  { key: "sag_minted", label: "SAG Minted" },
]

function truncateAddress(addr: string): string {
  if (!addr) return "—"
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatDateTime(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getTimeRemaining(maturityDate: string): string {
  const now = new Date()
  const maturity = new Date(maturityDate)
  if (now > maturity) {
    const diff = now.getTime() - maturity.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    return `${days}d overdue`
  }
  const diff = maturity.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const months = Math.floor(days / 30)
  const remainingDays = days % 30
  if (months > 0) return `${months}mo ${remainingDays}d left`
  return `${days}d left`
}

function getImageUrl(url: string): string {
  if (!url) return ""
  const parts = url.split("/")
  const filename = parts[parts.length - 1]
  return `/api/uploads/${filename}`
}

export default function BorrowerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const borrowerId = params.id as string

  const [detail, setDetail] = useState<BorrowerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchDetail()
  }, [borrowerId])

  const fetchDetail = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await apiInstance.get(`/pledge-requests/borrowers/${borrowerId}`)
      if (res.data.success) {
        setDetail(res.data.data)
      } else {
        setError("Borrower not found")
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load borrower details")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-[#e1bac2]" />
        </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-400" />
          <p className="text-lg font-bold text-[#171414]">{error || "Borrower not found"}</p>
          <Button onClick={() => router.back()} className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
    )
  }

  const { requests, investments, repayments } = detail
  const latestRequest = requests[0]
  const gold = latestRequest?.goldDetails || {}
  const loanStatus = latestRequest?.status || "pending"
  const cfg = statusConfig[loanStatus] || statusConfig.pending
  const StatusIcon = cfg.icon
  // Compute REAL maturity from origination + duration (ignore test-mode loanMaturityDate)
  const originationDate = latestRequest?.createdAt ? new Date(latestRequest.createdAt) : new Date()
  const durationMonths = latestRequest?.loanDurationMonths || 3
  const realMaturityDate = new Date(originationDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000)
  const isExpired = new Date() > realMaturityDate

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amountUsd || 0), 0)
  const investmentTarget = Number(latestRequest?.investmentTargetUsd || 0)
  const investmentFilled = Number(latestRequest?.investmentFilledUsd || 0)
  const fundingPct = investmentTarget > 0 ? Math.min(100, (investmentFilled / investmentTarget) * 100) : 0

  // Lifecycle progress
  const currentStageIdx = LIFECYCLE_STAGES.findIndex((s) => s.key === loanStatus)
  const lifecycleProgress = currentStageIdx >= 0 ? ((currentStageIdx + 1) / LIFECYCLE_STAGES.length) * 100 : 0

  return (
    <div className="max-w-5xl space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-[#4A4A4A] hover:text-[#171414] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Borrowers
        </button>

        {/* Hero Card: Borrower + Loan Status */}
        <Card className="mb-6 border-white/60 bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#171414] text-lg font-bold text-[#e1bac2]">
                  {latestRequest.borrowerFirstName?.[0] || "?"}
                  {latestRequest.borrowerLastName?.[0] || ""}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-[#171414]">
                    {latestRequest.borrowerFirstName} {latestRequest.borrowerLastName}
                  </h1>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(latestRequest.borrowerWallet)}
                      className="flex items-center gap-1 font-mono text-xs text-[#4A4A4A]/60 hover:text-[#171414]"
                    >
                      {truncateAddress(latestRequest.borrowerWallet)}
                      <Copy className="h-3 w-3" />
                    </button>
                    <a
                      href={`${SEPOLIA_EXPLORER}/address/${latestRequest.borrowerWallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4A4A4A]/40 hover:text-[#e1bac2]"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {latestRequest.borrowerEmail && (
                    <p className="mt-1 text-xs text-[#4A4A4A]/50">{latestRequest.borrowerEmail}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`${cfg.color} border text-xs font-bold`}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {cfg.label}
                </Badge>
                {isExpired && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Maturity Passed
                  </Badge>
                )}
              </div>
            </div>

            {/* Lifecycle Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/60">
                {LIFECYCLE_STAGES.map((stage, i) => (
                  <div key={stage.key} className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold transition-colors ${
                        i <= currentStageIdx
                          ? "bg-[#171414] text-[#e1bac2]"
                          : "bg-[#171414]/10 text-[#4A4A4A]/40"
                      }`}
                    >
                      {i <= currentStageIdx ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={i <= currentStageIdx ? "text-[#171414]" : ""}>{stage.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#171414]/5">
                <div
                  className="h-full rounded-full bg-[#e1bac2] transition-all duration-500"
                  style={{ width: `${lifecycleProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Gold & Loan Details */}
            <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#171414]">
                  <Scale className="h-4 w-4 text-[#e1bac2]" />
                  Gold & Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Asset", value: `${gold.assetType || "Gold"} ${latestRequest.verifiedKarat || gold.karat}K` },
                    { label: "Weight", value: `${latestRequest.verifiedWeightG || gold.weightG}g` },
                    { label: "Purity", value: latestRequest.verifiedPurity || gold.purity || "—" },
                    { label: "Appraised Value", value: `$${Number(latestRequest.verifiedAppraisedValueUsd || gold.estimatedValue || 0).toLocaleString()}` },
                    { label: "Loan Amount", value: `$${Number(latestRequest.paymentAmountUsd || 0).toLocaleString()}` },
                    { label: "Duration", value: latestRequest.loanDurationMonths ? `${latestRequest.loanDurationMonths} months` : "—" },
                    { label: "Maturity Date", value: formatDate(realMaturityDate.toISOString()) },
                    { label: "Time Remaining", value: getTimeRemaining(realMaturityDate.toISOString()) },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">{item.label}</span>
                      <span className="mt-0.5 text-sm font-bold text-[#171414]">{item.value}</span>
                    </div>
                  ))}
                </div>
                {latestRequest.pawnshopNotes && (
                  <div className="mt-3 rounded-lg bg-[#171414]/3 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Pawnshop Notes</p>
                    <p className="mt-1 text-xs text-[#4A4A4A]">{latestRequest.pawnshopNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credit Profile */}
            <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#171414]">
                  <ShieldCheck className="h-4 w-4 text-[#e1bac2]" />
                  Credit Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Credit Score</span>
                    <span className={`mt-1 text-2xl font-extrabold ${
                      latestRequest.borrowerCreditScore >= 700 ? "text-emerald-600" :
                      latestRequest.borrowerCreditScore >= 500 ? "text-amber-600" :
                      latestRequest.borrowerCreditScore > 0 ? "text-red-500" : "text-[#4A4A4A]/40"
                    }`}>
                      {latestRequest.borrowerCreditScore || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Tier</span>
                    <Badge variant="outline" className="mt-1 w-fit border-[#e1bac2] bg-[#e1bac2]/10 text-[#8c5a63]">
                      {latestRequest.borrowerCreditTier || "Unscored"}
                    </Badge>
                  </div>
                </div>
                {latestRequest.borrowerEvents && latestRequest.borrowerEvents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Proven DeFi Events ({latestRequest.borrowerEvents.length})</p>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {latestRequest.borrowerEvents.map((evt: any, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-[#171414]/3 p-2 text-xs">
                          <div>
                            <span className="font-bold text-[#171414]">{evt.protocol}</span>
                            <span className="ml-2 text-[#4A4A4A]">{evt.eventType}</span>
                          </div>
                          <span className="text-[#4A4A4A]/60">${Number(evt.volumeUSD || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Loan Funding */}
            {latestRequest.sagTokenId && (
              <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#171414]">
                    <Coins className="h-4 w-4 text-[#e1bac2]" />
                    Loan Funding (SAG #{latestRequest.sagTokenId})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#4A4A4A]">
                      <span className="font-bold">${investmentFilled.toLocaleString()} funded</span>
                      <span className="font-bold">${investmentTarget.toLocaleString()} target</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#171414]/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#e1bac2] to-[#d4949e] transition-all duration-500"
                        style={{ width: `${fundingPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] font-bold text-[#4A4A4A]/50">{fundingPct.toFixed(0)}% filled</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Details */}
            {latestRequest.paymentTxHash && (
              <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#171414]">
                    <Wallet className="h-4 w-4 text-[#e1bac2]" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Amount Paid</span>
                      <span className="mt-1 text-lg font-extrabold text-[#171414]">
                        ${Number(latestRequest.paymentAmountUsd || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Paid On</span>
                      <span className="mt-1 text-sm font-bold text-[#171414]">
                        {formatDateTime(latestRequest.paidAt)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Sepolia Tx</span>
                    <a
                      href={`${SEPOLIA_EXPLORER}/tx/${latestRequest.paymentTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs font-mono text-[#e1bac2] hover:underline"
                    >
                      {truncateAddress(latestRequest.paymentTxHash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {latestRequest.paymentCc3TxHash && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">CC3 Proof Tx</span>
                      <a
                        href={`${CC3_EXPLORER}/tx/${latestRequest.paymentCc3TxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs font-mono text-[#e1bac2] hover:underline"
                      >
                        {truncateAddress(latestRequest.paymentCc3TxHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Info (if shared) */}
            {latestRequest.pawnshopContactName && (
              <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#171414]">
                    <User className="h-4 w-4 text-[#e1bac2]" />
                    Meeting Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#4A4A4A]/60">Contact</span>
                      <span className="font-bold text-[#171414]">{latestRequest.pawnshopContactName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4A4A4A]/60">Phone</span>
                      <span className="font-bold text-[#171414]">{latestRequest.pawnshopContactPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4A4A4A]/60">Location</span>
                      <span className="font-bold text-[#171414]">{latestRequest.pawnshopLocation}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Repayment Tracker */}
            {latestRequest.paymentAmountUsd && (
              <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#171414]">
                    <Banknote className="h-4 w-4 text-[#e1bac2]" />
                    Repayment Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const loanAmount = Number(latestRequest.paymentAmountUsd || 0)
                    const totalRepaid = repayments.reduce((sum, r) => sum + Number(r.amountUsd || 0), 0)
                    const remaining = Math.max(0, loanAmount - totalRepaid)
                    const pct = loanAmount > 0 ? Math.min(100, (totalRepaid / loanAmount) * 100) : 0
                    const isFullyRepaid = remaining <= 0
                    const isOverdue = new Date() > realMaturityDate && !isFullyRepaid

                    return (
                      <>
                        {/* Progress bar */}
                        <div>
                          <div className="flex items-center justify-between text-xs text-[#4A4A4A]">
                            <span className="font-bold">${totalRepaid.toLocaleString()} repaid</span>
                            <span className="font-bold">${loanAmount.toLocaleString()} total</span>
                          </div>
                          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#171414]/5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFullyRepaid ? "bg-emerald-500" : "bg-gradient-to-r from-[#e1bac2] to-[#d4949e]"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#4A4A4A]/50">{pct.toFixed(0)}% repaid</span>
                            {isFullyRepaid && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Fully Repaid
                              </Badge>
                            )}
                            {isOverdue && !isFullyRepaid && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">
                                <AlertTriangle className="mr-1 h-3 w-3" /> Overdue — ${remaining.toLocaleString()} remaining
                              </Badge>
                            )}
                            {!isFullyRepaid && !isOverdue && (
                              <span className="text-[10px] font-bold text-[#4A4A4A]/50">${remaining.toLocaleString()} remaining</span>
                            )}
                          </div>
                        </div>

                        {/* Repayment history */}
                        {repayments.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">
                              Payment History ({repayments.length})
                            </p>
                            {repayments.map((r) => (
                              <div key={r.id} className="flex items-center justify-between rounded-lg bg-[#171414]/3 p-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-[#171414]">${Number(r.amountUsd).toLocaleString()}</p>
                                    <p className="text-[10px] text-[#4A4A4A]/50">
                                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    {r.txHash && (
                                      <a
                                        href={`https://eth-sepolia.blockscout.com/tx/${r.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 font-mono text-[10px] text-[#e1bac2] hover:underline"
                                        title="Sepolia TX"
                                      >
                                        Sepolia ↗
                                      </a>
                                    )}
                                    {r.cc3TxHash && (
                                      <a
                                        href={`https://creditcoin-testnet.blockscout.com/tx/${r.cc3TxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 font-mono text-[10px] text-[#e1bac2] hover:underline"
                                        title="CC3 Proof TX"
                                      >
                                        CC3 ↗
                                      </a>
                                    )}
                                  </div>
                                  {r.notes && <p className="mt-0.5 text-[10px] text-[#4A4A4A]/50">{r.notes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-[#171414]/10 bg-[#171414]/3 p-4 text-center">
                            <Banknote className="mx-auto mb-2 h-6 w-6 text-[#4A4A4A]/20" />
                            <p className="text-xs font-bold text-[#4A4A4A]/60">No repayments recorded yet</p>
                            <p className="mt-1 text-[10px] text-[#4A4A4A]/40">
                              Repayments will appear here once the borrower starts paying back the loan.
                            </p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Gold Images */}
            {latestRequest.goldImages && latestRequest.goldImages.length > 0 && (
              <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#171414]">
                    <FileText className="h-4 w-4 text-[#e1bac2]" />
                    Gold Photos ({latestRequest.goldImages.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {latestRequest.goldImages.map((url: string, i: number) => (
                      <img
                        key={i}
                        src={getImageUrl(url)}
                        alt={`Gold photo ${i + 1}`}
                        className="aspect-square w-full rounded-lg object-cover border border-white/60"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Investments Table */}
        {investments.length > 0 && (
          <Card className="mt-6 border-white/60 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#171414]">
                <TrendingUp className="h-4 w-4 text-[#e1bac2]" />
                Investors ({investments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#171414]/5 text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">
                      <th className="pb-3 text-left">Investor</th>
                      <th className="pb-3 text-left">Amount</th>
                      <th className="pb-3 text-left">ETH</th>
                      <th className="pb-3 text-left">Date</th>
                      <th className="pb-3 text-left">Status</th>
                      <th className="pb-3 text-left">Source Tx</th>
                      <th className="pb-3 text-left">CC3 Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map((inv) => (
                      <tr key={inv.id} className="border-b border-[#171414]/3">
                        <td className="py-3">
                          <div className="font-bold text-[#171414]">
                            {inv.investorFirstName ? `${inv.investorFirstName} ${inv.investorLastName}` : truncateAddress(inv.investorWallet || inv.userId)}
                          </div>
                        </td>
                        <td className="py-3 font-bold text-[#171414]">${Number(inv.amountUsd).toLocaleString()}</td>
                        <td className="py-3 font-mono text-xs text-[#4A4A4A]">~{Number(inv.ethAmount).toFixed(6)}</td>
                        <td className="py-3 text-xs text-[#4A4A4A]">{formatDate(inv.createdAt)}</td>
                        <td className="py-3">
                          <Badge variant="outline" className={`text-[10px] font-bold ${
                            inv.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <a
                            href={`${SEPOLIA_EXPLORER}/tx/${inv.sourceTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-[#e1bac2] hover:underline"
                          >
                            {truncateAddress(inv.sourceTxHash)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="py-3">
                          {inv.cc3TxHash ? (
                            <a
                              href={`${CC3_EXPLORER}/tx/${inv.cc3TxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-xs text-[#e1bac2] hover:underline"
                            >
                              {truncateAddress(inv.cc3TxHash)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-[#4A4A4A]/40">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request History (if multiple requests) */}
        {requests.length > 1 && (
          <Card className="mt-6 border-white/60 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#171414]">
                <Calendar className="h-4 w-4 text-[#e1bac2]" />
                Request History ({requests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requests.map((req) => {
                  const reqCfg = statusConfig[req.status] || statusConfig.pending
                  const ReqIcon = reqCfg.icon
                  return (
                    <div key={req.id} className="flex items-center justify-between rounded-xl bg-[#171414]/3 p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${reqCfg.color} border text-[10px] font-bold`}>
                          <ReqIcon className="mr-1 h-3 w-3" />
                          {reqCfg.label}
                        </Badge>
                        <span className="text-xs text-[#4A4A4A]">
                          {req.goldDetails?.assetType} {req.verifiedKarat || req.goldDetails?.karat}K — {req.verifiedWeightG || req.goldDetails?.weightG}g
                        </span>
                      </div>
                      <span className="text-xs text-[#4A4A4A]/60">{formatDate(req.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}
