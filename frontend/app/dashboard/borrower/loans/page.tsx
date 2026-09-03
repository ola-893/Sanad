"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import apiInstance from "@/lib/axios-v1"
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Coins,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ExternalLink,
  Copy,
  Scale,
  Banknote,
  Calendar,
  TrendingUp,
  Zap,
} from "lucide-react"
import { useProofProgress } from "@/store/proof-progress"

interface Loan {
  id: string
  borrowerId: string
  borrowerWallet: string
  pawnshopId: string
  pawnshopWallet: string
  goldDetails: any
  status: string
  pawnshopNotes: string
  borrowerCreditScore: number
  verifiedWeightG: string
  verifiedKarat: number
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
  totalRepaid: number
  repaymentCount: number
  createdAt: string
  updatedAt: string
}

interface Repayment {
  id: number
  amountUsd: string
  txHash: string
  cc3TxHash: string
  notes: string
  status: string
  createdAt: string
}

const SEPOLIA_EXPLORER = "https://eth-sepolia.blockscout.com"
const CC3_EXPLORER = "https://creditcoin-testnet.blockscout.com"

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Awaiting Review", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  accepted: { label: "Accepted — Schedule Meeting", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
  gold_verified: { label: "Gold Verified — Awaiting Payment", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: ShieldCheck },
  funded: { label: "Funded — SAG Minting", color: "bg-violet-100 text-violet-800 border-violet-200", icon: Coins },
  sag_minted: { label: "Active Loan", color: "bg-[#e1bac2]/30 text-[#8c5a63] border-[#e1bac2]", icon: TrendingUp },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
}

const LIFECYCLE_STAGES = [
  { key: "pending", label: "Applied" },
  { key: "accepted", label: "Accepted" },
  { key: "gold_verified", label: "Verified" },
  { key: "funded", label: "Funded" },
  { key: "sag_minted", label: "Active" },
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

function getTimeRemaining(maturityDate: string): { text: string; isOverdue: boolean } {
  const now = new Date()
  const maturity = new Date(maturityDate)
  if (now > maturity) {
    const diff = now.getTime() - maturity.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    return { text: `${days}d overdue`, isOverdue: true }
  }
  const diff = maturity.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const months = Math.floor(days / 30)
  const remainingDays = days % 30
  if (months > 0) return { text: `${months}mo ${remainingDays}d left`, isOverdue: false }
  return { text: `${days}d left`, isOverdue: false }
}

export default function BorrowerLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null)
  const [repayments, setRepayments] = useState<Record<string, Repayment[]>>({})
  const [loadingRepayments, setLoadingRepayments] = useState<string | null>(null)

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/pledge-requests/my-loans")
      if (res.data.success) setLoans(res.data.data ?? [])
    } catch (e: any) {
      console.error("Failed to fetch loans:", e)
    } finally {
      setLoading(false)
    }
  }

  const fetchRepayments = async (loanId: string) => {
    if (repayments[loanId]) return // Already loaded
    setLoadingRepayments(loanId)
    try {
      const res = await apiInstance.get(`/pledge-requests/${loanId}/repayments`)
      if (res.data.success) {
        setRepayments((prev) => ({ ...prev, [loanId]: res.data.data ?? [] }))
      }
    } catch (e: any) {
      console.error("Failed to fetch repayments:", e)
    } finally {
      setLoadingRepayments(null)
    }
  }

  const toggleExpand = (loanId: string) => {
    if (expandedLoan === loanId) {
      setExpandedLoan(null)
    } else {
      setExpandedLoan(loanId)
      fetchRepayments(loanId)
    }
  }

  // Separate active and past loans
  const activeLoans = loans.filter((l) => ["sag_minted", "funded", "gold_verified", "accepted", "pending"].includes(l.status))
  const pastLoans = loans.filter((l) => ["rejected"].includes(l.status))

  return (
    <div className="mx-auto max-w-4xl space-y-0 pt-2">
        {/* Header */}
        <div className="mb-8">
          <p className="kicker mb-2">Borrower</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            My Loans
          </h1>
          <p className="mt-2 text-sm text-[#4A4A4A]">
            Track your loan status, repayment progress, and maturity dates
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#e1bac2]" />
          </div>
        ) : loans.length === 0 ? (
          <div className="py-20 text-center">
            <Coins className="mx-auto mb-4 h-12 w-12 text-[#4A4A4A]/20" />
            <p className="text-lg font-bold text-[#171414]">No loans yet</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">
              Apply for a loan to get started.
            </p>
            <Link href="/dashboard/borrower/apply">
              <Button className="mt-4 rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black">
                Apply for Loan
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Loans */}
            {activeLoans.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#4A4A4A]/60">
                  Active Loans ({activeLoans.length})
                </h2>
                <div className="space-y-4">
                  {activeLoans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      isExpanded={expandedLoan === loan.id}
                      onToggle={() => toggleExpand(loan.id)}
                      repayments={repayments[loan.id] || []}
                      loadingRepayments={loadingRepayments === loan.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Loans */}
            {pastLoans.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#4A4A4A]/60">
                  Past Loans ({pastLoans.length})
                </h2>
                <div className="space-y-4">
                  {pastLoans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      isExpanded={expandedLoan === loan.id}
                      onToggle={() => toggleExpand(loan.id)}
                      repayments={repayments[loan.id] || []}
                      loadingRepayments={loadingRepayments === loan.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
}

function ProofProgressSection({ sagTokenId }: { sagTokenId: string }) {
  const { jobs } = useProofProgress()
  const matchingJobs = jobs.filter(
    (j) => j.type === "repay" && j.sagTokenId === sagTokenId && (j.status === "queued" || j.status === "proving")
  )

  if (matchingJobs.length === 0) return null

  return (
    <div className="rounded-xl bg-[#e1bac2]/10 border border-[#e1bac2]/20 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-3.5 w-3.5 text-[#e1bac2]" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8c5a63]">
          CC3 Proof in Progress ({matchingJobs.length})
        </p>
      </div>
      {matchingJobs.map((job) => (
        <div key={job.id} className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-[#e1bac2]" />
            <span className="text-xs text-[#171414]">{job.message}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 overflow-hidden rounded-full bg-[#171414]/5">
              <div
                className="h-full rounded-full bg-[#e1bac2] transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            {job.cc3TxHash && (
              <a
                href={`https://creditcoin-testnet.blockscout.com/tx/${job.cc3TxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-[#e1bac2] hover:underline"
              >
                CC3 ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function LoanCard({
  loan,
  isExpanded,
  onToggle,
  repayments,
  loadingRepayments,
}: {
  loan: Loan
  isExpanded: boolean
  onToggle: () => void
  repayments: Repayment[]
  loadingRepayments: boolean
}) {
  const gold = loan.goldDetails || {}
  const cfg = statusConfig[loan.status] || statusConfig.pending
  const StatusIcon = cfg.icon
  const loanAmount = Number(loan.paymentAmountUsd || 0)
  const totalRepaid = Number(loan.totalRepaid || 0)
  const remaining = Math.max(0, loanAmount - totalRepaid)
  const pct = loanAmount > 0 ? Math.min(100, (totalRepaid / loanAmount) * 100) : 0
  const isFullyRepaid = remaining <= 0
  const isActive = ["sag_minted", "funded", "gold_verified", "accepted", "pending"].includes(loan.status)

  // Compute REAL maturity from origination + duration (ignore test-mode loanMaturityDate)
  const originationDate = loan.createdAt ? new Date(loan.createdAt) : new Date()
  const durationMonths = loan.loanDurationMonths || 3
  const realMaturityDate = new Date(originationDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000)
  const timeInfo = getTimeRemaining(realMaturityDate.toISOString())
  const lifecycleIdx = LIFECYCLE_STAGES.findIndex((s) => s.key === loan.status)
  const lifecyclePct = lifecycleIdx >= 0 ? ((lifecycleIdx + 1) / LIFECYCLE_STAGES.length) * 100 : 0

  return (
    <Card className="border-white/60 bg-white/70 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Main card - always visible */}
        <button
          onClick={onToggle}
          className="w-full p-5 text-left transition-colors hover:bg-[#171414]/2"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left: Gold info */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171414]/5 text-sm font-bold text-[#171414]">
                <Scale className="h-5 w-5 text-[#e1bac2]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#171414]">
                  {gold.assetType || "Gold"} {loan.verifiedKarat || gold.karat}K — {loan.verifiedWeightG || gold.weightG}g
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-[#4A4A4A]/60">
                  <span>Loan: ${loanAmount.toLocaleString()}</span>
                  {loan.loanDurationMonths && (
                    <>
                      <span>•</span>
                      <span>{loan.loanDurationMonths}mo term</span>
                    </>
                  )}
                  {loan.loanMaturityDate && (
                    <>
                      <span>•</span>
                      <span className={timeInfo?.isOverdue ? "text-red-500 font-bold" : ""}>
                        {timeInfo?.text}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Status + Repay + expand */}
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`${cfg.color} border text-[10px] font-bold`}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {cfg.label}
              </Badge>
              {loan.status === "sag_minted" && !isFullyRepaid && (
                <Link
                  href="/dashboard/borrower/repay"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg bg-[#171414] px-3 py-1.5 text-[10px] font-bold text-[#e1bac2] transition-colors hover:bg-black"
                >
                  Repay
                </Link>
              )}
              <ArrowRight
                className={`h-4 w-4 text-[#4A4A4A]/30 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            </div>
          </div>

          {/* Lifecycle progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#4A4A4A]/40">
              {LIFECYCLE_STAGES.map((stage, i) => (
                <div key={stage.key} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold ${
                      i <= lifecycleIdx
                        ? "bg-[#171414] text-[#e1bac2]"
                        : "bg-[#171414]/10 text-[#4A4A4A]/30"
                    }`}
                  >
                    {i <= lifecycleIdx ? <CheckCircle2 className="h-2.5 w-2.5" /> : i + 1}
                  </div>
                  <span className={i <= lifecycleIdx ? "text-[#171414]" : ""}>{stage.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#171414]/5">
              <div
                className="h-full rounded-full bg-[#e1bac2] transition-all duration-500"
                style={{ width: `${lifecyclePct}%` }}
              />
            </div>
          </div>

          {/* Repayment progress (only for active funded/sag_minted loans) */}
          {isActive && loanAmount > 0 && loan.status !== "pending" && loan.status !== "accepted" && (
            <div className="mt-4 rounded-xl bg-[#171414]/3 p-3">
              <div className="flex items-center justify-between text-xs text-[#4A4A4A]">
                <span className="font-bold">${totalRepaid.toLocaleString()} repaid</span>
                <span className="font-bold">${loanAmount.toLocaleString()} total</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#171414]/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isFullyRepaid ? "bg-emerald-500" : "bg-gradient-to-r from-[#e1bac2] to-[#d4949e]"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#4A4A4A]/50">{pct.toFixed(0)}% repaid</span>
                {isFullyRepaid ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Fully Repaid
                  </Badge>
                ) : (
                  <span className="text-[10px] font-bold text-[#4A4A4A]/50">${remaining.toLocaleString()} remaining</span>
                )}
              </div>
            </div>
          )}
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-[#171414]/5 px-5 pb-5 pt-4 space-y-4">
            {/* Pawnshop info */}
            {loan.pawnshopContactName && (
              <div className="rounded-xl bg-[#171414]/3 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50 mb-2">Pawnshop Contact</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[#4A4A4A]/50">Name</span>
                    <p className="font-bold text-[#171414]">{loan.pawnshopContactName}</p>
                  </div>
                  <div>
                    <span className="text-[#4A4A4A]/50">Phone</span>
                    <p className="font-bold text-[#171414]">{loan.pawnshopContactPhone}</p>
                  </div>
                  <div>
                    <span className="text-[#4A4A4A]/50">Location</span>
                    <p className="font-bold text-[#171414]">{loan.pawnshopLocation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment info (if funded) */}
            {loan.paymentTxHash && (
              <div className="rounded-xl bg-[#171414]/3 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50 mb-2">Payment Received</p>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-[#4A4A4A]/50">Amount</span>
                    <p className="font-bold text-[#171414]">${loanAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[#4A4A4A]/50">Date</span>
                    <p className="font-bold text-[#171414]">{formatDate(loan.paidAt)}</p>
                  </div>
                  <div>
                    <span className="text-[#4A4A4A]/50">Sepolia Tx</span>
                    <a
                      href={`${SEPOLIA_EXPLORER}/tx/${loan.paymentTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-[#e1bac2] hover:underline"
                    >
                      {truncateAddress(loan.paymentTxHash)} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {loan.paymentCc3TxHash && (
                    <div>
                      <span className="text-[#4A4A4A]/50">CC3 Proof</span>
                      <a
                        href={`${CC3_EXPLORER}/tx/${loan.paymentCc3TxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-[#e1bac2] hover:underline"
                      >
                        {truncateAddress(loan.paymentCc3TxHash)} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loan details */}
            <div className="rounded-xl bg-[#171414]/3 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50 mb-2">Loan Details</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#4A4A4A]/50">Appraised Value</span>
                  <p className="font-bold text-[#171414]">${Number(loan.verifiedAppraisedValueUsd || gold.estimatedValue || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[#4A4A4A]/50">Loan Amount (70% LTV)</span>
                  <p className="font-bold text-[#171414]">${loanAmount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[#4A4A4A]/50">Duration</span>
                  <p className="font-bold text-[#171414]">{loan.loanDurationMonths ? `${loan.loanDurationMonths} months` : "—"}</p>
                </div>
                <div>
                  <span className="text-[#4A4A4A]/50">Maturity Date</span>
                  <p className={`font-bold ${timeInfo?.isOverdue ? "text-red-500" : "text-[#171414]"}`}>
                    {formatDate(realMaturityDate.toISOString())}
                  </p>
                </div>
                {loan.sagTokenId && (
                  <div>
                    <span className="text-[#4A4A4A]/50">SAG Token</span>
                    <p className="font-bold text-[#171414]">#{loan.sagTokenId}</p>
                  </div>
                )}
                <div>
                  <span className="text-[#4A4A4A]/50">Pawnshop Wallet</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(loan.pawnshopWallet) }}
                    className="flex items-center gap-1 font-mono text-[#e1bac2] hover:underline"
                  >
                    {truncateAddress(loan.pawnshopWallet)} <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active CC3 Proof Jobs */}
            {loan.status === "sag_minted" && (
              <ProofProgressSection sagTokenId={loan.sagTokenId} />
            )}

            {/* Repayment history */}
            {loan.status === "sag_minted" && (
              <div className="rounded-xl bg-[#171414]/3 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50 mb-2">
                  Repayment History {repayments.length > 0 && `(${repayments.length})`}
                </p>
                {loadingRepayments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-[#e1bac2]" />
                  </div>
                ) : repayments.length > 0 ? (
                  <div className="space-y-2">
                    {repayments.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#171414]">${Number(r.amountUsd).toLocaleString()}</p>
                            <p className="text-[10px] text-[#4A4A4A]/50">{formatDateTime(r.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.txHash && (
                            <a
                              href={`${SEPOLIA_EXPLORER}/tx/${r.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-[#e1bac2] hover:underline"
                            >
                              Sepolia ↗
                            </a>
                          )}
                          {r.cc3TxHash && (
                            <a
                              href={`${CC3_EXPLORER}/tx/${r.cc3TxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-[#e1bac2] hover:underline"
                            >
                              CC3 ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <Banknote className="mx-auto mb-2 h-6 w-6 text-[#4A4A4A]/20" />
                    <p className="text-xs text-[#4A4A4A]/60">No repayments recorded yet</p>
                    <p className="mt-1 text-[10px] text-[#4A4A4A]/40">
                      Contact your pawnshop to make a repayment.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
