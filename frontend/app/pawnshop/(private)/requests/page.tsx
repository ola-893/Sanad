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

  // Payment modal
  const [payModal, setPayModal] = useState<PledgeRequest | null>(null)
  const [payTxHash, setPayTxHash] = useState("")
  const [payCc3Hash, setPayCc3Hash] = useState("")
  const [payAmount, setPayAmount] = useState("")

  // SAG mint modal
  const [sagModal, setSagModal] = useState<PledgeRequest | null>(null)
  const [sagTokenId, setSagTokenId] = useState("")

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = filter !== "all" ? `?status=${filter}` : ""
      const res = await apiInstance.get(`/pledge-requests/mine${params}`)
      setRequests(res.data.data || [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [filter])

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
      })
      toast.success(
        verifyStatus === "verified"
          ? "Gold verified! Borrower has been notified. You can now record payment."
          : "Gold rejected. Borrower has been notified."
      )
      setVerifyModal(null)
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

      // Auto-prove on CC3 if no CC3 hash provided
      if (!cc3Hash) {
        toast.info("Proving payment on CC3 via Attestcoin...")
        try {
          const proofRes = await apiInstance.post("/credit-oracle/prove-pawnshop-payment", {
            sourceTxHash: payTxHash,
            chainKey: 1,
            borrowerAddress: payModal.borrowerWallet,
          })
          cc3Hash = proofRes.data?.data?.cc3TxHash || ""
          if (cc3Hash) {
            toast.success("CC3 attestation proof generated!")
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
                  <Card key={req.id} className={glass}>
                    <CardContent className="p-6">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E1BAC2]/20">
                              <User className="h-4 w-4 text-[#171414]" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#171414]">
                                {req.borrowerWallet.slice(0, 6)}...{req.borrowerWallet.slice(-4)}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {req.borrowerCreditScore !== undefined && req.borrowerCreditScore > 0 && (
                              <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-[#171414]/5 border border-[#171414]/10">
                                <Shield className="h-3 w-3 text-[#171414]" />
                                <span className="text-[10px] font-mono font-bold text-[#171414]">{req.borrowerCreditScore}</span>
                                <span className="text-[9px] text-muted-foreground">/ 1000</span>
                              </div>
                            )}
                          </div>

                          {/* Gold Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-lg border border-[#171414]/10 bg-[#FAFAF8] p-3">
                              <p className="text-[10px] font-mono uppercase text-muted-foreground">Asset</p>
                              <p className="text-sm font-medium text-[#171414]">
                                {req.goldDetails.assetType} {req.goldDetails.karat}K
                              </p>
                            </div>
                            <div className="rounded-lg border border-[#171414]/10 bg-[#FAFAF8] p-3">
                              <p className="text-[10px] font-mono uppercase text-muted-foreground">Weight</p>
                              <p className="text-sm font-medium text-[#171414]">{req.goldDetails.weightG}g</p>
                            </div>
                            <div className="rounded-lg border border-[#171414]/10 bg-[#FAFAF8] p-3">
                              <p className="text-[10px] font-mono uppercase text-muted-foreground">Purity</p>
                              <p className="text-sm font-medium text-[#171414]">{req.goldDetails.purity}</p>
                            </div>
                            <div className="rounded-lg border border-[#171414]/10 bg-[#FAFAF8] p-3">
                              <p className="text-[10px] font-mono uppercase text-muted-foreground">Est. Value</p>
                              <p className="text-sm font-bold text-[#171414]">
                                ${req.goldDetails.estimatedValue?.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Right: Status + Expand */}
                        <div className="flex flex-col items-end gap-2 min-w-[140px]">
                          <Badge variant="outline" className={`text-[10px] font-mono ${statusCfg.color}`}>
                            {statusCfg.label}
                          </Badge>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : req.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#171414] transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {isExpanded ? "Collapse" : "Review Details"}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-6 space-y-5 border-t border-[#171414]/10 pt-5">
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
                                {req.goldImages.map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={`Gold ${i + 1}`}
                                    className="h-28 w-28 rounded-lg object-cover shrink-0 border border-[#171414]/10"
                                  />
                                ))}
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
                                  onClick={() => setAcceptModal(req.id)}
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
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPayModal(req)
                                  setPayAmount(String(req.verifiedAppraisedValueUsd || req.goldDetails.estimatedValue * 0.7))
                                }}
                                className="rounded-lg gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                <CreditCard className="h-3 w-3" /> Record Payment (Sepolia + CC3)
                              </Button>
                            )}
                            {req.status === "funded" && (
                              <Button
                                size="sm"
                                onClick={() => setSagModal(req)}
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
                    placeholder="e.g., Ahmad (Branch Manager)"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="e.g., +60 12-345 6789"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location / Address</Label>
                <Input
                  placeholder="e.g., 123 Jalan Tun Razak, Kuala Lumpur"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes for Borrower (optional)</Label>
                <Textarea
                  placeholder="e.g., Open 9am-5pm, bring original ID. Ask for Ahmad at the counter."
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
              </div>
              {verifyStatus === "verified" && (
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
                <Button variant="outline" onClick={() => setVerifyModal(null)} disabled={processing} className="rounded-xl">
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
                <Label>Payment Amount (USD)</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="rounded-xl" placeholder="e.g., 5000" />
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
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="font-display">Mint SAG Token</CardTitle>
              <CardDescription>
                After minting the SAG NFT on Creditcoin, paste the token ID here
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>SAG Token ID (from on-chain mint)</Label>
                <Input
                  placeholder="Token ID or transaction hash"
                  value={sagTokenId}
                  onChange={(e) => setSagTokenId(e.target.value)}
                  className="rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSagModal(null)} disabled={processing} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={handleMintSag}
                  disabled={processing || !sagTokenId}
                  className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record SAG Mint
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  )
}
