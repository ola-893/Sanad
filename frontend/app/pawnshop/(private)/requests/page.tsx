"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { toast } from "sonner"
import {
  Gem,
  Clock,
  CheckCircle2,
  XCircle,
  Store,
  Weight,
  Sparkles,
  Loader2,
  RefreshCw,
  FileText,
  Shield,
  Link2,
  ExternalLink,
  AlertTriangle,
  Camera,
  CreditCard,
  MapPin,
  Phone,
  User,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

// Convert loan duration (in months) to test-mode minutes
// Real: 1 day=1d, 1mo=30d, etc. Test: scaled down for quick testing
function getTestDurationMinutes(months: number): number {
  if (months <= 0) return 1
  return Math.round(months * 5) // 1mo=5min, 2mo=10min, 3mo=15min, 6mo=30min, 12mo=60min
}

// Format loan duration for display
function formatDuration(months: number): string {
  if (months <= 0) return "1 day"
  if (months < 1) return "1 day"
  if (months === 1) return "1 month"
  if (months === 12) return "1 year"
  return `${months} months`
}

interface GoldDetails {
  assetType: string
  karat: number
  weightG: number
  purity: number
  estimatedValue: number
  description?: string
}

interface ProvenEvent {
  sourceTxHash: string
  blockHeight: number
  protocol: string
  eventType: string
  volumeUSD: string
  timestamp: number
  cc3TxHash?: string
}

interface TxLink {
  label: string
  sepoliaUrl: string
  cc3Url?: string
  sourceTxHash: string
  cc3TxHash?: string
}

interface PledgeRequest {
  id: string
  borrowerId: string
  borrowerWallet: string
  pawnshopId: string
  pawnshopWallet: string
  goldDetails: GoldDetails
  requestedAmount: string
  status: string
  pawnshopNotes: string
  sagId: string | null
  createdAt: string
  updatedAt: string
  // V2 fields
  borrowerCreditScore?: number
  borrowerCreditTier?: string
  borrowerEvents?: ProvenEvent[]
  borrowerTransactionLinks?: TxLink[]
  goldImages?: string[]
  verificationStatus?: string
  verificationNotes?: string
  verifiedWeightG?: number
  verifiedKarat?: number
  verifiedPurity?: number
  verifiedAppraisedValueUsd?: number
  paymentAmountUsd?: number
  paymentTxHash?: string
  paymentCc3TxHash?: string
  paymentStatus?: string
  sagTokenId?: string
  pawnshopContactName?: string
  pawnshopContactPhone?: string
  pawnshopLocation?: string
  loanDurationMonths?: number
  loanMaturityDate?: string
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: "border-amber-200 bg-amber-50 text-amber-700", label: "Pending Review" },
  accepted: { color: "border-blue-200 bg-blue-50 text-blue-700", label: "Accepted - Meeting Needed" },
  gold_verified: { color: "border-purple-200 bg-purple-50 text-purple-700", label: "Gold Verified" },
  funded: { color: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "Funded" },
  sag_minted: { color: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "SAG Minted" },
  rejected: { color: "border-red-200 bg-red-50 text-red-700", label: "Rejected" },
}

const PROTOCOL_NAMES: Record<number, string> = {
  0: "Aave v3", 1: "Compound v3", 2: "Morpho Blue", 3: "Spark Protocol",
  4: "MakerDAO", 5: "Euler v2", 6: "Fluid", 7: "Maple Finance",
  8: "Goldfinch", 9: "Fraxlend",
}

const EVENT_TYPE_NAMES: Record<number, string> = {
  0: "Clean Repayment", 1: "Liquidation", 2: "Default",
  3: "Collateral Supply", 4: "Active Borrow",
}

export default function PawnshopRequestsPage() {
  const [requests, setRequests] = useState<PledgeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Accept modal
  const [acceptModal, setAcceptModal] = useState<string | null>(null)
  const [acceptNotes, setAcceptNotes] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [location, setLocation] = useState("")
  const [processing, setProcessing] = useState(false)

  // Reject modal
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState("")

  // Verify gold modal
  const [verifyModal, setVerifyModal] = useState<PledgeRequest | null>(null)
  const [verifyStatus, setVerifyStatus] = useState<"verified" | "rejected">("verified")
  const [verifyNotes, setVerifyNotes] = useState("")
  const [verifyWeight, setVerifyWeight] = useState("")
  const [verifyKarat, setVerifyKarat] = useState("")
  const [verifyPurity, setVerifyPurity] = useState("")
  const [verifyValue, setVerifyValue] = useState("")
  const [verifyDuration, setVerifyDuration] = useState("")

  // Payment modal
  const [payModal, setPayModal] = useState<PledgeRequest | null>(null)
  const [payTxHash, setPayTxHash] = useState("")
  const [payCc3Hash, setPayCc3Hash] = useState("")
  const [payAmount, setPayAmount] = useState("")

  // SAG mint modal
  const [sagModal, setSagModal] = useState<PledgeRequest | null>(null)
  const [sagModalDuration, setSagModalDuration] = useState<number>(3)
  const [sagTokenId, setSagTokenId] = useState("")

  // Pawnshop profile for pre-filling accept modal
  const [pawnshopProfile, setPawnshopProfile] = useState<any>(null)

  useEffect(() => {
    apiInstance.get("/pawnshop/profile")
      .then((res) => setPawnshopProfile(res.data?.data || res.data))
      .catch(() => {})
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = filter !== "all" ? `?status=${filter}` : ""
      const res = await apiInstance.get(`/pledge-requests/mine${params}`)
      const fetchedRequests = res.data.data || []
      setRequests(fetchedRequests)

      // Refresh credit scores in background for pending requests
      for (const req of fetchedRequests) {
        if (req.status === 'pending' && req.id) {
          apiInstance.patch(`/pledge-requests/${req.id}/refresh-credit`)
            .then((refreshRes) => {
              if (refreshRes.data?.data) {
                setRequests(prev => prev.map(r =>
                  r.id === req.id ? { ...r, ...refreshRes.data.data } : r
                ))
              }
            })
            .catch(() => {})
        }
      }
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [filter])

  // Open accept modal with prefilled profile data
  const openAcceptModal = (requestId: string) => {
    setAcceptModal(requestId)
    if (pawnshopProfile) {
      const p = pawnshopProfile
      setContactName(p.businessName || "")
      setContactPhone(p.businessPhone || "")
      const addr = [p.addressLine1, p.city, p.state].filter(Boolean).join(", ")
      setLocation(addr || "")
    }
  }

  // Accept request
  const handleAccept = async () => {
    if (!acceptModal) return
    setProcessing(true)
    try {
      await apiInstance.patch(`/pledge-requests/${acceptModal}/accept`, {
        notes: acceptNotes || undefined,
        contactName: contactName || undefined,
        contactPhone: contactPhone || undefined,
        location: location || undefined,
      })
      toast.success("Request accepted! Borrower has been notified with your contact details.")
      setAcceptModal(null)
      setAcceptNotes("")
      setContactName("")
      setContactPhone("")
      setLocation("")
      fetchRequests()
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Action failed")
    } finally {
      setProcessing(false)
    }
  }

  // Reject request
  const handleReject = async () => {
    if (!rejectModal) return
    setProcessing(true)
    try {
      await apiInstance.patch(`/pledge-requests/${rejectModal}/reject`, {
        notes: rejectNotes || undefined,
      })
      toast.success("Request rejected. Borrower has been notified.")
      setRejectModal(null)
      setRejectNotes("")
      fetchRequests()
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Action failed")
    } finally {
      setProcessing(false)
    }
  }

  // Verify gold
  const handleVerifyGold = async () => {
    if (!verifyModal) return
    setProcessing(true)
    try {
      await apiInstance.patch(`/pledge-requests/${verifyModal.id}/verify-gold`, {
        verificationStatus: verifyStatus,
        verificationNotes: verifyNotes || undefined,
        verifiedWeightG: verifyWeight ? Number(verifyWeight) : undefined,
        verifiedKarat: verifyKarat ? Number(verifyKarat) : undefined,
        verifiedPurity: verifyPurity ? Number(verifyPurity) : undefined,
        verifiedAppraisedValueUsd: verifyValue ? Number(verifyValue) : undefined,
        loanDurationMonths: verifyDuration ? Number(verifyDuration) : undefined,
      })
      toast.success(
        verifyStatus === "verified"
          ? "Gold verified! Borrower has been notified. You can now record payment."
          : "Gold rejected. Borrower has been notified."
      )
      setVerifyModal(null)
      setVerifyDuration("")
      fetchRequests()
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Verification failed")
    } finally {
      setProcessing(false)
    }
  }

  // Record payment with auto CC3 attestation
  const handleRecordPayment = async () => {
    if (!payModal || !payTxHash || !payAmount) return
    setProcessing(true)
    try {
      let cc3Hash = payCc3Hash

      // Auto-prove on CC3 if no CC3 hash provided (Async BullMQ Queue + Polling)
      if (!cc3Hash) {
        toast.info("Queuing payment proof job on CC3 via Attestcoin...")
        try {
          const proofRes = await apiInstance.post("/credit-oracle/prove-pawnshop-payment", {
            sourceTxHash: payTxHash,
            chainKey: 1,
            borrowerAddress: payModal.borrowerWallet,
          })
          if (proofRes.data?.success && proofRes.data?.data?.jobId) {
            const { jobId } = proofRes.data.data
            // Poll for completion
            const maxAttempts = 150
            let attempts = 0
            while (attempts < maxAttempts) {
              await new Promise((r) => setTimeout(r, 2500))
              attempts++
              try {
                const statRes = await apiInstance.get(`/credit-oracle/proof/status/${jobId}`)
                if (statRes.data?.success && statRes.data?.data) {
                  const { state, result, error } = statRes.data.data
                  if (state === "COMPLETED" && result) {
                    cc3Hash = result.transactionHash || result.cc3TxHash || ""
                    break
                  } else if (state === "FAILED") {
                    throw new Error(error || "Attestation failed")
                  }
                }
              } catch (pErr: any) {
                if (pErr.message && !pErr.message.includes("Network Error") && pErr.response?.status !== 404) {
                  throw pErr
                }
              }
            }
          }
          if (cc3Hash) {
            toast.success("CC3 attestation proof verified!")
          }
        } catch (proofErr: any) {
          console.warn("CC3 auto-proof failed, recording payment without proof:", proofErr?.message)
          toast.warning("CC3 proof could not be generated. Payment recorded without proof.")
        }
      }

      await apiInstance.patch(`/pledge-requests/${payModal.id}/record-payment`, {
        paymentTxHash: payTxHash,
        paymentCc3TxHash: cc3Hash || undefined,
        paymentAmountUsd: Number(payAmount),
      })
      toast.success("Payment recorded with CC3 attestation! You can now mint the SAG token.")
      setPayModal(null)
      setPayTxHash("")
      setPayCc3Hash("")
      setPayAmount("")
      fetchRequests()
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Payment recording failed")
    } finally {
      setProcessing(false)
    }
  }

  // Mint SAG
  const handleMintSag = async () => {
    if (!sagModal || !sagTokenId) return
    setProcessing(true)
    try {
      await apiInstance.patch(`/pledge-requests/${sagModal.id}/mint-sag`, {
        sagTokenId,
      })
      toast.success("SAG token recorded! Investors can now fund this loan.")
      setSagModal(null)
      setSagTokenId("")
      fetchRequests()
    } catch (err: any) {
      toast.error(err.response?.data?.error || "SAG mint recording failed")
    } finally {
      setProcessing(false)
    }
  }

  const pending = requests.filter((r) => r.status === "pending")
  const accepted = requests.filter((r) => r.status === "accepted")
  const others = requests.filter((r) => r.status !== "pending" && r.status !== "accepted")

  const formatVolume = (v: string | number) => {
    const n = typeof v === "string" ? Number(v) : v
    if (!n) return "—"
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
    return `$${n.toLocaleString()}`
  }

  return (
    <ProtectedRoute requiredRole="pawnshop">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="kicker-gold">Pawnshop Portal</p>
              <h1 className="text-3xl font-display font-bold text-[#171414]">Pledge Requests</h1>
              <p className="text-muted-foreground mt-1">
                Review borrower credit profiles, gold details, and manage the full lending lifecycle
              </p>
            </div>
            <Button variant="outline" onClick={fetchRequests} disabled={loading} className="rounded-xl gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-4 grid-cols-3">
            <Card className={`${glass} border-l-4 border-l-amber-400`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-[#171414]">{pending.length}</p>
                  </div>
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={`${glass} border-l-4 border-l-emerald-400`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Accepted</p>
                    <p className="text-2xl font-bold text-[#171414]">{accepted.length}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={`${glass} border-l-4 border-l-slate-300`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Other</p>
                    <p className="text-2xl font-bold text-[#171414]">{others.length}</p>
                  </div>
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "accepted", "gold_verified", "funded", "sag_minted", "rejected"].map((f) => (
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

          {/* Request List */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <Card className={glass}>
              <CardContent className="p-12 text-center">
                <Gem className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No {filter !== "all" ? filter.replace(/_/g, " ") : ""} requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const isExpanded = expandedId === req.id
                const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending

                return (
                  <Card key={req.id} className={`${glass} overflow-hidden`}>
                    <CardContent className="p-0">
                      {/* Top: Photo + Status Bar */}
                      <div className="flex items-center justify-between px-6 pt-5 pb-3">
                        <div className="flex items-center gap-3">
                          {req.goldImages && req.goldImages.length > 0 ? (
                            <div className="relative">
                              {(() => {
                                const filename = req.goldImages[0].split('/').pop() || req.goldImages[0].replace('/uploads/', '')
                                return <img src={`/api/uploads/${filename}`} alt="Gold" className="h-14 w-14 rounded-xl object-cover border border-[#171414]/10" />
                              })()}
                              {req.goldImages.length > 1 && (
                                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#171414] text-[9px] font-bold text-[#E1BAC2]">
                                  +{req.goldImages.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#E1BAC2]/15">
                              <Gem className="h-6 w-6 text-[#E1BAC2]" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-display text-base font-bold text-[#171414]">
                                {req.goldDetails.assetType} {req.goldDetails.karat}K Gold
                              </p>
                              <Badge variant="outline" className={`text-[10px] font-mono ${statusCfg.color}`}>
                                {statusCfg.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {req.borrowerWallet.slice(0, 6)}...{req.borrowerWallet.slice(-4)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-[#171414]/15 px-3 py-2 text-xs font-medium text-[#171414] hover:bg-[#171414]/5 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isExpanded ? "Less" : "Review"}
                        </button>
                      </div>

                      {/* Gold Details Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[#171414]/5 mx-6 rounded-xl overflow-hidden">
                        {[
                          { label: "Weight", value: `${req.goldDetails.weightG}g` },
                          { label: "Purity", value: `${req.goldDetails.purity}` },
                          { label: "Karat", value: `${req.goldDetails.karat}K` },
                          { label: "Est. Value", value: `$${req.goldDetails.estimatedValue?.toLocaleString()}`, bold: true },
                          { label: "Loan", value: req.requestedAmount ? `$${Number(req.requestedAmount).toLocaleString()}` : "—", bold: true },
                        ].map((item, i) => (
                          <div key={i} className="bg-white px-4 py-3">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{item.label}</p>
                            <p className={`text-sm mt-0.5 ${item.bold ? "font-bold text-[#171414]" : "font-medium text-[#171414]"}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Credit Score + Actions Row */}
                      <div className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-4">
                          {req.borrowerCreditScore !== undefined && req.borrowerCreditScore > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Shield className="h-3.5 w-3.5 text-[#171414]/50" />
                              <span className="text-xs font-mono font-bold text-[#171414]">{req.borrowerCreditScore}</span>
                              <span className="text-[10px] text-muted-foreground">/ 1000</span>
                              {req.borrowerCreditTier && (
                                <span className="text-[10px] font-mono text-muted-foreground">({req.borrowerCreditTier})</span>
                              )}
                            </div>
                          )}
                          {req.borrowerEvents && req.borrowerEvents.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {req.borrowerEvents.length} verified event{req.borrowerEvents.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {req.goldDetails.description && (
                          <p className="text-[10px] text-muted-foreground italic max-w-[200px] truncate">
                            "{req.goldDetails.description}"
                          </p>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-6 pb-6 mt-6 space-y-5 border-t border-[#171414]/10 pt-5">
                          {/* V2: Borrower Credit Profile */}
                          {req.borrowerCreditScore !== undefined && (
                            <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                                Borrower Credit Profile
                              </p>
                              <div className="flex items-center gap-4 mb-3">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-5 w-5 text-[#171414]" />
                                  <span className="text-lg font-bold text-[#171414]">{req.borrowerCreditScore}/1000</span>
                                </div>
                                <Badge className="bg-[#171414]/5 text-[#171414] text-[9px]">
                                  {req.borrowerCreditTier || "Unscored"}
                                </Badge>
                              </div>
                              {req.borrowerEvents && req.borrowerEvents.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-mono text-muted-foreground mb-1">Verified DeFi Events:</p>
                                  {req.borrowerEvents.map((evt, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                      <span className="text-muted-foreground">
                                        {typeof evt.eventType === "number"
                                          ? EVENT_TYPE_NAMES[evt.eventType]
                                          : evt.eventType}
                                      </span>
                                      <span className="text-muted-foreground">on</span>
                                      <span className="font-medium text-[#171414]">{evt.protocol}</span>
                                      <span className="text-muted-foreground ml-auto">{formatVolume(evt.volumeUSD)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* V2: Transaction Links */}
                          {req.borrowerTransactionLinks && req.borrowerTransactionLinks.length > 0 && (
                            <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                                Transaction Links (Attestcoin Proofs)
                              </p>
                              <div className="space-y-2">
                                {req.borrowerTransactionLinks.map((link, i) => (
                                  <div key={i} className="flex items-center gap-3 text-xs">
                                    <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="text-[#171414] font-mono truncate">
                                      {link.sourceTxHash?.slice(0, 16)}...
                                    </span>
                                    <div className="flex gap-2 ml-auto shrink-0">
                                      <a
                                        href={link.sepoliaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-blue-700"
                                      >
                                        Sepolia <ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                      {link.cc3Url && (
                                        <a
                                          href={link.cc3Url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 rounded-full bg-[#171414] px-2 py-0.5 text-[9px] font-bold text-[#E1BAC2] hover:bg-black"
                                        >
                                          CC3 Proof <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* V2: Gold Photos */}
                          {req.goldImages && req.goldImages.length > 0 && (
                            <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                                Gold Photos ({req.goldImages.length})
                              </p>
                              <div className="flex gap-3 overflow-x-auto">
                                {req.goldImages.map((url, i) => {
                                  // Extract filename from URL and proxy through Next.js
                                  const filename = url.split('/').pop() || url.replace('/uploads/', '')
                                  const imgSrc = `/api/uploads/${filename}`
                                  return (
                                    <img
                                      key={i}
                                      src={imgSrc}
                                      alt={`Gold ${i + 1}`}
                                      className="h-28 w-28 rounded-lg object-cover shrink-0 border border-[#171414]/10"
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Gold Description */}
                          {req.goldDetails.description && (
                            <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                                Borrower Notes
                              </p>
                              <p className="text-sm text-[#171414] italic">"{req.goldDetails.description}"</p>
                            </div>
                          )}

                          {/* V2: Physical Verification Result */}
                          {req.verificationStatus && req.verificationStatus !== "pending" && (
                            <div className={`rounded-xl border p-4 ${
                              req.verificationStatus === "verified"
                                ? "border-purple-200 bg-purple-50"
                                : "border-red-200 bg-red-50"
                            }`}>
                              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                                Physical Verification Result
                              </p>
                              <div className="flex items-center gap-2 mb-2">
                                {req.verificationStatus === "verified" ? (
                                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="text-sm font-medium text-[#171414]">
                                  {req.verificationStatus === "verified" ? "Gold Verified" : "Gold Rejected"}
                                </span>
                              </div>
                              {req.verifiedWeightG && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>Verified Weight: <span className="font-medium">{req.verifiedWeightG}g</span></div>
                                  {req.verifiedKarat && <div>Verified Karat: <span className="font-medium">{req.verifiedKarat}K</span></div>}
                                  {req.verifiedPurity && <div>Verified Purity: <span className="font-medium">{req.verifiedPurity}</span></div>}
                                  {req.verifiedAppraisedValueUsd && (
                                    <div>Appraised Value: <span className="font-medium">${req.verifiedAppraisedValueUsd.toLocaleString()}</span></div>
                                  )}
                                </div>
                              )}
                              {req.verificationNotes && (
                                <p className="text-xs text-muted-foreground mt-2 italic">"{req.verificationNotes}"</p>
                              )}
                              {req.loanDurationMonths && (
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                  <span className="font-medium">Loan Duration: {formatDuration(req.loanDurationMonths)}</span>
                                  {req.loanMaturityDate && (
                                    <span className="text-muted-foreground">(Due: {new Date(req.loanMaturityDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* V2: Payment Status */}
                          {req.paymentStatus && req.paymentStatus !== "pending" && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                                Payment Record
                              </p>
                              <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium text-[#171414]">
                                  ${req.paymentAmountUsd?.toLocaleString()} USD paid
                                </span>
                              </div>
                              {req.paymentTxHash && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">Source:</span>
                                  <a
                                    href={`https://eth-sepolia.blockscout.com/tx/${req.paymentTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-blue-600 hover:underline"
                                  >
                                    {req.paymentTxHash.slice(0, 16)}...
                                  </a>
                                  {req.paymentCc3TxHash && (
                                    <>
                                      <span className="text-muted-foreground">| CC3 Proof:</span>
                                      <a
                                        href={`https://creditcoin-testnet.blockscout.com/tx/${req.paymentCc3TxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-[#171414] hover:underline"
                                      >
                                        {req.paymentCc3TxHash.slice(0, 16)}...
                                      </a>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* V2: Pawnshop Contact (shown after acceptance) */}
                          {req.status === "accepted" && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                                Your Contact Details (shared with borrower)
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-blue-600" />
                                  <span className="text-[#171414]">{req.pawnshopContactName || "Not set"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-blue-600" />
                                  <span className="text-[#171414]">{req.pawnshopContactPhone || "Not set"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3 text-blue-600" />
                                  <span className="text-[#171414]">{req.pawnshopLocation || "Not set"}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Pawnshop Notes */}
                          {req.pawnshopNotes && (
                            <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                                Your Notes
                              </p>
                              <p className="text-xs text-[#171414]">{req.pawnshopNotes}</p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            {req.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRejectModal(req.id)}
                                  className="rounded-lg gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <XCircle className="h-3 w-3" /> Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => openAcceptModal(req.id)}
                                  className="rounded-lg gap-1 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                                >
                                  <CheckCircle2 className="h-3 w-3" /> Accept & Share Contact
                                </Button>
                              </>
                            )}
                            {req.status === "accepted" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setVerifyModal(req)
                                  setVerifyWeight(String(req.goldDetails.weightG))
                                  setVerifyKarat(String(req.goldDetails.karat))
                                  setVerifyPurity(String(req.goldDetails.purity))
                                  setVerifyValue("")
                                }}
                                className="rounded-lg gap-1 bg-purple-600 text-white hover:bg-purple-700"
                              >
                                <Camera className="h-3 w-3" /> Verify Gold (After Meeting)
                              </Button>
                            )}
                            {req.status === "gold_verified" && (
                              <a href="/pawnshop/payments">
                                <Button
                                  size="sm"
                                  className="rounded-lg gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  <CreditCard className="h-3 w-3" /> Go to Payments
                                </Button>
                              </a>
                            )}
                            {req.status === "funded" && (
                              <Button
                                size="sm"
                                onClick={() => { setSagModal(req); setSagModalDuration(req.loanDurationMonths || 3) }}
                                className="rounded-lg gap-1 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                              >
                                <Gem className="h-3 w-3" /> Mint SAG Token
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Accept Modal - with contact details */}
      {acceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="font-display">Accept Request</CardTitle>
              <CardDescription>
                Share your contact details so the borrower can schedule a physical meeting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    placeholder="e.g., Emeka (Branch Manager)"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="e.g., +234 801 234 5678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location / Address</Label>
                <Input
                  placeholder="e.g., 15 Marina Lagos, Nigeria"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes for Borrower (optional)</Label>
                <Textarea
                  placeholder="e.g., Open 9am-5pm, bring original ID. Ask for Emeka at the counter."
                  value={acceptNotes}
                  onChange={(e) => setAcceptNotes(e.target.value)}
                  className="rounded-xl min-h-[60px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setAcceptModal(null); setContactName(""); setContactPhone(""); setLocation(""); setAcceptNotes("") }} disabled={processing} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleAccept} disabled={processing} className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black">
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Accept & Notify Borrower
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="font-display">Reject Request</CardTitle>
              <CardDescription>Optionally provide a reason for rejection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  placeholder="e.g., We currently don't accept this type of gold."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="rounded-xl min-h-[60px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRejectModal(null); setRejectNotes("") }} disabled={processing} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleReject} disabled={processing} className="rounded-xl gap-2 bg-red-600 text-white hover:bg-red-700">
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Verify Gold Modal */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="font-display">Verify Gold (After Physical Meeting)</CardTitle>
              <CardDescription>
                Update the gold details based on your physical inspection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={verifyStatus === "verified" ? "default" : "outline"}
                  onClick={() => setVerifyStatus("verified")}
                  className={verifyStatus === "verified" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Verified
                </Button>
                <Button
                  variant={verifyStatus === "rejected" ? "default" : "outline"}
                  onClick={() => setVerifyStatus("rejected")}
                  className={verifyStatus === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Rejected
                </Button>
              </div>                {verifyStatus === "verified" && (
                <>
                <div className="space-y-2">
                  <Label>Loan Duration</Label>
                  <select
                    value={verifyDuration}
                    onChange={(e) => setVerifyDuration(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select duration...</option>
                    <option value="1">1 month</option>
                    <option value="2">2 months</option>
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">1 year (12 months)</option>
                  </select>
                  {verifyDuration && (
                    <p className="text-xs text-muted-foreground">
                      Duration: {formatDuration(Number(verifyDuration))} · Repayment due: {new Date(Date.now() + Number(verifyDuration) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Verified Weight (g)</Label>
                    <Input type="number" value={verifyWeight} onChange={(e) => setVerifyWeight(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Verified Karat</Label>
                    <Input type="number" value={verifyKarat} onChange={(e) => setVerifyKarat(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Verified Purity</Label>
                    <Input type="number" value={verifyPurity} onChange={(e) => setVerifyPurity(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Appraised Value (USD)</Label>
                    <Input type="number" value={verifyValue} onChange={(e) => setVerifyValue(e.target.value)} className="rounded-xl" placeholder="e.g., 5000" />
                  </div>
                </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Verification Notes</Label>
                <Textarea
                  placeholder="e.g., Gold matches declared weight. Hallmark verified. Condition excellent."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="rounded-xl min-h-[60px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setVerifyModal(null); setVerifyDuration("") }} disabled={processing} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyGold}
                  disabled={processing}
                  className={`rounded-xl gap-2 ${
                    verifyStatus === "verified"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {verifyStatus === "verified" ? "Confirm Verification" : "Reject Gold"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="font-display">Record Payment</CardTitle>
              <CardDescription>
                Record the ETH payment from your wallet to the borrower on Sepolia, then provide the CC3 attestation proof
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  <strong>Before proceeding:</strong> Send ETH to the borrower on Sepolia via MetaMask, then paste the transaction hash below.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount (70% LTV)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={payAmount}
                    readOnly
                    className="rounded-xl pl-7 bg-muted"
                  />
                </div>
                {payModal && (
                  <p className="text-[11px] text-muted-foreground">
                    70% of appraised value: ${payModal.verifiedAppraisedValueUsd?.toLocaleString() || payModal.goldDetails?.estimatedValue?.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Sepolia Transaction Hash *</Label>
                <Input
                  placeholder="0x..."
                  value={payTxHash}
                  onChange={(e) => setPayTxHash(e.target.value)}
                  className="rounded-xl font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>CC3 Attestation Tx Hash (after proving on CC3)</Label>
                <Input
                  placeholder="0x... (paste after running prove-repayment)"
                  value={payCc3Hash}
                  onChange={(e) => setPayCc3Hash(e.target.value)}
                  className="rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayModal(null)} disabled={processing} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  disabled={processing || !payTxHash || !payAmount}
                  className="rounded-xl gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mint SAG Modal */}
      {sagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="font-display">Mint SAG Token on CC3</CardTitle>
              <CardDescription>
                Auto-mint the gold collateral NFT on Creditcoin CC3
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gold Attributes Summary */}
              <div className="rounded-xl bg-[#FAFAF8] border border-[#171414]/10 p-4">
                <p className="text-[10px] font-mono uppercase text-muted-foreground mb-3">Gold Collateral Attributes</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Asset:</span>
                    <span className="ml-2 font-medium">{sagModal.goldDetails?.assetType} {sagModal.goldDetails?.karat}K</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="ml-2 font-medium">{sagModal.verifiedWeightG || sagModal.goldDetails?.weightG}g</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Karat:</span>
                    <span className="ml-2 font-medium">{sagModal.verifiedKarat || sagModal.goldDetails?.karat}K</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Appraised:</span>
                    <span className="ml-2 font-medium">${(sagModal.verifiedAppraisedValueUsd || sagModal.goldDetails?.estimatedValue).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Loan (70%):</span>
                    <span className="ml-2 font-medium text-emerald-600">${(sagModal.paymentAmountUsd || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-2 font-medium">{formatDuration(sagModalDuration)}</span>
                  </div>
                </div>
              </div>

              {/* Investment Target — read-only, always 70% LTV */}
              <div className="space-y-2">
                <Label>Investment Target (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    id="investmentTarget"
                    value={sagModal.paymentAmountUsd || Math.round((sagModal.verifiedAppraisedValueUsd || sagModal.goldDetails?.estimatedValue || 0) * 0.7)}
                    readOnly
                    className="rounded-xl pl-7 bg-muted cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Fixed at 70% of appraised value (LTV). Minimum investment: 10% of target.
                </p>
              </div>

              {/* Loan Duration dropdown */}
              <div className="space-y-2">
                <Label>Loan Duration</Label>
                <select
                  id="loanDuration"
                  value={sagModalDuration}
                  onChange={(e) => setSagModalDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={1}>1 month</option>
                  <option value={2}>2 months</option>
                  <option value={3}>3 months</option>
                  <option value={6}>6 months</option>
                  <option value={12}>1 year</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Duration until loan maturity. Investor ROI scales with duration.
                </p>
              </div>

              {/* Minimum Investment - auto-computed */}
              <div className="rounded-xl bg-muted p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Minimum Investment per Investor:</span>
                  <span className="font-medium">10% of target</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSagModal(null)} disabled={processing} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!sagModal) return
                    setProcessing(true)
                    try {                      const targetEl = document.getElementById('investmentTarget') as HTMLInputElement
                      const durationEl = document.getElementById('loanDuration') as HTMLSelectElement
                      const investmentTarget = targetEl ? Number(targetEl.value) : 0
                      const loanDurationMonths = durationEl ? Number(durationEl.value) : 3

                      toast.info("Minting SAG token on CC3...")

                      const res = await apiInstance.patch(`/pledge-requests/${sagModal.id}/mint-sag`, {
                        investmentTargetUsd: investmentTarget,
                        loanDurationMonths,
                      })
                      const { sagTxHash, sagExplorerUrl } = res.data?.data || {}
                      if (sagTxHash) {
                        toast.success("SAG token minted on CC3!")
                      }
                      setSagModal(null)
                      fetchRequests()
                    } catch (err: any) {
                      toast.error(err.response?.data?.error || "Failed to mint SAG token")
                    } finally {
                      setProcessing(false)
                    }
                  }}
                  disabled={processing}
                  className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Mint SAG Token on CC3
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  )
}
