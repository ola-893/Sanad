"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/auth/protected-route"
import {
  ArrowLeft,
  Gem,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  CreditCard,
  Camera,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface PledgeRequest {
  id: string
  borrowerId: string
  borrowerWallet: string
  pawnshopId: string
  goldDetails: {
    assetType: string
    karat: number
    weightG: number
    purity: number
    estimatedValue: number
    description?: string
  }
  requestedAmount: string
  status: string
  pawnshopNotes: string
  createdAt: string
  updatedAt: string
  goldImages?: string[]
  borrowerCreditScore?: number
  borrowerCreditTier?: string
  verificationStatus?: string
  verificationNotes?: string
  verifiedWeightG?: number
  verifiedKarat?: number
  paymentAmountUsd?: number
  paymentTxHash?: string
  paymentCc3TxHash?: string
  sagTokenId?: string
  pawnshopContactName?: string
  pawnshopContactPhone?: string
  pawnshopLocation?: string
  loanDurationMonths?: number
  loanMaturityDate?: string
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bgColor: string; label: string; description: string }> = {
  pending: { icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100", label: "Pending Review", description: "Waiting for pawnshop to review your request" },
  accepted: { icon: CheckCircle2, color: "text-blue-600", bgColor: "bg-blue-100", label: "Accepted", description: "Pawnshop accepted! Check contact details and schedule a meeting" },
  gold_verified: { icon: Camera, color: "text-purple-600", bgColor: "bg-purple-100", label: "Gold Verified", description: "Pawnshop verified your gold. Payment is being processed" },
  funded: { icon: CreditCard, color: "text-emerald-600", bgColor: "bg-emerald-100", label: "Funded", description: "Payment received! SAG token will be minted soon" },
  sag_minted: { icon: Gem, color: "text-[#E1BAC2]", bgColor: "bg-[#E1BAC2]/20", label: "SAG Minted", description: "SAG token minted. Investors can now fund this loan" },
  rejected: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100", label: "Rejected", description: "Pawnshop declined your request" },
}

const STATUS_STEPS = ["pending", "accepted", "gold_verified", "funded", "sag_minted"]

export default function BorrowerApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<PledgeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/pledge-requests/mine")
      setApplications(res.data.data || [])
    } catch {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter)

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <ProtectedRoute requiredRole="borrower">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/borrower")}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="kicker-gold">Applications</p>
              <h1 className="text-3xl font-display font-bold text-[#171414]">
                My Pledge Requests
              </h1>
              <p className="text-muted-foreground mt-1">
                Track all your gold pledge applications and their status
              </p>
            </div>
            <Button variant="outline" onClick={fetchApplications} disabled={loading} className="rounded-xl gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "accepted", "gold_verified", "funded", "rejected"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-[#171414] text-[#E1BAC2]"
                    : "bg-[#171414]/5 text-muted-foreground hover:bg-[#171414]/10"
                }`}
              >
                {f === "all" ? "All" : f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>

          {/* Applications List */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading applications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className={glass}>
              <CardContent className="p-12 text-center">
                <Gem className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No {filter !== "all" ? filter.replace(/_/g, " ") : ""} applications</p>
                <Link href="/dashboard/borrower/apply">
                  <Button className="mt-4 rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black">
                    Apply for a Loan
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((app) => {
                const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
                const Icon = config.icon
                const currentStepIndex = STATUS_STEPS.indexOf(app.status)

                return (
                  <Card key={app.id} className={glass}>
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor}`}>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#171414]">
                              {app.goldDetails?.assetType} {app.goldDetails?.karat}K Gold
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {app.goldDetails?.weightG}g &bull; {formatTime(app.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#171414]">
                            ${(app.goldDetails?.estimatedValue || 0).toLocaleString()}
                          </p>
                          <Badge variant="outline" className={`text-[10px] font-mono ${config.color} border-current`}>
                            {config.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress Steps */}
                      {app.status !== "rejected" && (
                        <div className="flex items-center gap-1 mb-4">
                          {STATUS_STEPS.map((step, i) => {
                            const isCompleted = i <= currentStepIndex
                            const isCurrent = i === currentStepIndex
                            return (
                              <div key={step} className="flex items-center gap-1 flex-1">
                                <div className={`h-1.5 flex-1 rounded-full ${
                                  isCompleted ? "bg-[#171414]" : "bg-[#171414]/10"
                                }`} />
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Status Description */}
                      <div className="rounded-xl bg-[#FAFAF8] border border-[#171414]/10 p-3 mb-4">
                        <p className="text-xs text-[#171414]">{config.description}</p>
                      </div>

                      {/* Pawnshop Contact (if accepted) */}
                      {app.status === "accepted" && app.pawnshopContactName && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 mb-4">
                          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Pawnshop Contact</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{app.pawnshopContactName}</span></div>
                            <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{app.pawnshopContactPhone}</span></div>
                            <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{app.pawnshopLocation}</span></div>
                          </div>
                        </div>
                      )}

                      {/* Gold Photos */}
                      {app.goldImages && app.goldImages.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">Gold Photos</p>
                          <div className="flex gap-2 overflow-x-auto">
                            {app.goldImages.map((url: string, i: number) => {
                              const filename = url.split('/').pop() || url.replace('/uploads/', '')
                              const imgSrc = `/api/uploads/${filename}`
                              return (
                                <img key={i} src={imgSrc} alt={`Gold ${i + 1}`} className="h-20 w-20 rounded-lg object-cover shrink-0 border border-[#171414]/10" />
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Verification Result */}
                      {app.verificationStatus && app.verificationStatus !== "pending" && (
                        <div className={`rounded-xl p-3 mb-4 ${
                          app.verificationStatus === "verified" ? "border border-purple-200 bg-purple-50" : "border border-red-200 bg-red-50"
                        }`}>
                          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Gold Verification</p>
                          <div className="flex items-center gap-2 text-xs">
                            {app.verificationStatus === "verified" ? (
                              <><CheckCircle2 className="h-3 w-3 text-purple-600" /> <span className="font-medium">Verified</span>                            {app.loanDurationMonths && <span className="ml-2 text-purple-700">Loan: {app.loanDurationMonths} min (test)</span>}</>
                            ) : (
                              <><XCircle className="h-3 w-3 text-red-600" /> <span className="font-medium">Rejected</span></>
                            )}
                            {app.verifiedWeightG && <span className="text-muted-foreground">| Weight: {app.verifiedWeightG}g</span>}
                          </div>
                          {app.verificationNotes && <p className="text-[11px] text-muted-foreground mt-1 italic">"{app.verificationNotes}"</p>}
                        </div>
                      )}

                      {/* Payment Info */}
                      {app.paymentTxHash && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 mb-4">
                          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Payment Received</p>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-medium">${app.paymentAmountUsd?.toLocaleString()} USD</span>
                            <a href={`https://eth-sepolia.blockscout.com/tx/${app.paymentTxHash}`} target="_blank" rel="noopener noreferrer"
                              className="text-cyan-600 hover:underline flex items-center gap-1">
                              Source Tx <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                            {app.paymentCc3TxHash && (
                              <a href={`https://creditcoin-testnet.blockscout.com/tx/${app.paymentCc3TxHash}`} target="_blank" rel="noopener noreferrer"
                                className="text-[#171414] hover:underline flex items-center gap-1">
                                CC3 Proof <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SAG Minted */}
                      {app.sagTokenId && (
                        <div className="rounded-xl border border-[#E1BAC2]/30 bg-[#E1BAC2]/5 p-3 mb-4">
                          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">SAG Token Minted</p>
                          <p className="text-xs font-mono font-medium text-[#171414]">Token ID: {app.sagTokenId}</p>
                        </div>
                      )}

                      {/* Pawnshop Notes */}
                      {app.pawnshopNotes && (
                        <div className="rounded-xl bg-[#FAFAF8] border border-[#171414]/10 p-3 mb-4">
                          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Pawnshop Notes</p>
                          <p className="text-xs text-[#171414] italic">"{app.pawnshopNotes}"</p>
                        </div>
                      )}

                      {/* Gold Details */}
                      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        <span className="rounded-full bg-[#171414]/5 px-2 py-0.5">{app.goldDetails?.purity} purity</span>
                        {app.requestedAmount && <span className="rounded-full bg-[#171414]/5 px-2 py-0.5">Loan: ${Number(app.requestedAmount).toLocaleString()}</span>}
                        {app.loanDurationMonths && (
                          <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5">
                            {app.loanDurationMonths} min (test){app.loanMaturityDate ? ` - due ${new Date(app.loanMaturityDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </span>
                        )}
                        {app.borrowerCreditScore !== undefined && app.borrowerCreditScore > 0 && (
                          <span className="rounded-full bg-[#171414]/5 px-2 py-0.5 flex items-center gap-1">
                            <Shield className="h-2.5 w-2.5" /> Score: {app.borrowerCreditScore}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
