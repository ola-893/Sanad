"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { toast } from "sonner"
import {
  CreditCard,
  Loader2,
  RefreshCw,
  ExternalLink,
  Camera,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

interface GoldDetails {
  assetType: string
  karat: number
  weightG: number
  purity: number
  estimatedValue: number
}

interface PledgeRequest {
  id: string
  borrowerId: string
  borrowerWallet: string
  goldDetails: GoldDetails
  requestedAmount: string
  status: string
  createdAt: string
  goldImages?: string[]
  borrowerCreditScore?: number
  borrowerCreditTier?: string
  verifiedWeightG?: number
  verifiedKarat?: number
  verifiedAppraisedValueUsd?: number
  verificationNotes?: string
  loanDurationMonths?: number
  loanMaturityDate?: string
  paymentAmountUsd?: number
  paymentTxHash?: string
  paymentCc3TxHash?: string
}

export default function PawnshopPaymentsPage() {
  const [requests, setRequests] = useState<PledgeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState<PledgeRequest | null>(null)
  const [payTxHash, setPayTxHash] = useState("")
  const [payCc3Hash, setPayCc3Hash] = useState("")
  const [payAmount, setPayAmount] = useState("")
  const [processing, setProcessing] = useState(false)
  const [ethPrice, setEthPrice] = useState(0)

  const fetchVerifiedRequests = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/pledge-requests/mine?status=gold_verified")
      setRequests(res.data.data || [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVerifiedRequests()
    const fetchEthPrice = () => {
      apiInstance.get("/eth-price")
        .then((res) => { const p = res.data?.data?.usd; if (p && p > 0) setEthPrice(p) })
        .catch(() => {})
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
  }, [])

  const openPayModal = (req: PledgeRequest) => {
    setPayModal(req)
    // Auto-calculate 70% LTV
    const appraisedValue = req.verifiedAppraisedValueUsd || req.goldDetails.estimatedValue
    const ltvAmount = Math.round(appraisedValue * 0.7 * 100) / 100
    setPayAmount(String(ltvAmount))
  }

  const handleRecordPayment = async () => {
    if (!payModal || !payTxHash || !payAmount) return
    setProcessing(true)
    try {
      // Step 1: Record payment immediately
      await apiInstance.patch(`/pledge-requests/${payModal.id}/record-payment`, {
        paymentTxHash: payTxHash,
        paymentAmountUsd: Number(payAmount),
      })
      toast.success("Payment recorded! Borrower has been notified.")
      setPayModal(null)
      setPayTxHash("")
      setPayAmount("")
      fetchVerifiedRequests()

      // Note: CC3 proof applies to DeFi protocol transactions, not simple ETH transfers.
      // The Sepolia tx hash serves as proof of payment for pawnshop-to-borrower transfers.
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Payment recording failed")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="pawnshop">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-[#171414]">Payments</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Make payments to borrowers with verified gold
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchVerifiedRequests} className="rounded-xl gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass-panel rounded-2xl border border-[#171414]/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#171414]">{requests.length}</p>
                    <p className="text-xs text-muted-foreground">Pending Payment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel rounded-2xl border border-[#171414]/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#171414]">
                      ${requests.reduce((sum, r) => sum + Math.round((r.verifiedAppraisedValueUsd || r.goldDetails.estimatedValue) * 0.7), 0).toLocaleString()}
                    </p>
                    {ethPrice > 0 && (
                      <p className="text-xs text-emerald-600 font-mono">
                        ~{requests.reduce((sum, r) => sum + Math.round((r.verifiedAppraisedValueUsd || r.goldDetails.estimatedValue) * 0.7), 0) / ethPrice} ETH
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Total to Pay (70% LTV)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel rounded-2xl border border-[#171414]/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                    <Camera className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#171414]">
                      {requests.reduce((sum, r) => sum + (r.verifiedWeightG || r.goldDetails.weightG), 0)}g
                    </p>
                    <p className="text-xs text-muted-foreground">Gold Custodied</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payments List */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading verified requests...
            </div>
          ) : requests.length === 0 ? (
            <Card className="glass-panel rounded-3xl border border-[#171414]/10">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No pending payments</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  All verified gold has been paid for
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const appraisedValue = req.verifiedAppraisedValueUsd || req.goldDetails.estimatedValue
                const ltvAmount = Math.round(appraisedValue * 0.7 * 100) / 100

                return (
                  <Card key={req.id} className="glass-panel rounded-2xl border border-[#171414]/10 overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header with borrower info */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-[#171414]/5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                            <Camera className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#171414]">
                              {req.goldDetails.assetType} {req.goldDetails.karat}K
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {req.borrowerWallet.slice(0, 6)}...{req.borrowerWallet.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <Badge className="rounded-full bg-amber-100 text-amber-700 border-amber-200">
                          <Clock className="h-3 w-3 mr-1" /> Awaiting Payment
                        </Badge>
                      </div>

                      {/* Gold Details + Payment */}
                      <div className="px-5 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Weight</p>
                            <p className="text-sm font-medium">{req.verifiedWeightG || req.goldDetails.weightG}g</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Karat</p>
                            <p className="text-sm font-medium">{req.verifiedKarat || req.goldDetails.karat}K</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Appraised Value</p>
                            <p className="text-sm font-medium">${appraisedValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">70% LTV Payment</p>
                            <p className="text-lg font-bold text-emerald-600">${ltvAmount.toLocaleString()}</p>
                            {ethPrice > 0 && (
                              <p className="text-xs text-emerald-600/70 font-mono">~{(ltvAmount / ethPrice).toFixed(4)} ETH</p>
                            )}
                          </div>
                        </div>

                        {req.loanDurationMonths && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                            <span>Duration: {req.loanDurationMonths} min (test)</span>
                            {req.loanMaturityDate && (
                              <span>Due: {new Date(req.loanMaturityDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        )}

                        {req.verificationNotes && (
                          <p className="text-xs text-muted-foreground italic mb-4">"{req.verificationNotes}"</p>
                        )}

                        {/* Action */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => openPayModal(req)}
                            className="rounded-xl gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <CreditCard className="h-4 w-4" /> Record Payment
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="font-display">Record Payment to Borrower</CardTitle>
              <CardDescription>
                Send ETH on Sepolia to the borrower, then record the transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  <strong>Before proceeding:</strong> Send {ethPrice > 0 && payAmount ? `~${(Number(payAmount) / ethPrice).toFixed(4)} ETH ($${payAmount})` : `$${payAmount}`} to the borrower on Sepolia via MetaMask, then paste the transaction hash below.
                </p>
              </div>

              <div className="rounded-xl bg-muted p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Borrower Wallet:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-background rounded-lg px-3 py-2 border border-[#171414]/10 break-all">
                      {payModal.borrowerWallet}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(payModal.borrowerWallet)
                        toast.success("Wallet address copied!")
                      }}
                      className="shrink-0 rounded-lg border border-[#171414]/10 bg-background px-3 py-2 text-xs font-medium hover:bg-[#171414]/5 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm mt-3">
                  <span className="text-muted-foreground">Appraised Value:</span>
                  <span>${(payModal.verifiedAppraisedValueUsd || payModal.goldDetails.estimatedValue).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1 font-medium">
                  <span>Payment (70% LTV):</span>
                  <div className="text-right">
                    <span className="text-emerald-600">${payAmount}</span>
                    {ethPrice > 0 && payAmount && (
                      <span className="block text-xs font-mono text-emerald-600/70">~{(Number(payAmount) / ethPrice).toFixed(4)} ETH</span>
                    )}
                  </div>
                </div>
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

              <div className="flex justify-end gap-2">
                <Button variant="outline"    onClick={() => { setPayModal(null); setPayTxHash("") }} disabled={processing} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  disabled={processing || !payTxHash}
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
    </ProtectedRoute>
  )
}
