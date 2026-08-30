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
          console.warn("CC3 auto-proof failed:", proofErr?.message)
          toast.warning("CC3 proof could not be generated. Payment recorded without proof.")
        }
      }

      await apiInstance.patch(`/pledge-requests/${payModal.id}/record-payment`, {
        paymentTxHash: payTxHash,
        paymentCc3TxHash: cc3Hash || undefined,
        paymentAmountUsd: Number(payAmount),
      })
      toast.success("Payment recorded! Borrower has been notified.")
      setPayModal(null)
      setPayTxHash("")
      setPayCc3Hash("")
      setPayAmount("")
      fetchVerifiedRequests()
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
                  <strong>Before proceeding:</strong> Send ${payAmount} ETH to the borrower on Sepolia via MetaMask, then paste the transaction hash below.
                </p>
              </div>

              <div className="rounded-xl bg-muted p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Borrower:</span>
                  <span className="font-mono text-xs">{payModal.borrowerWallet.slice(0, 10)}...{payModal.borrowerWallet.slice(-6)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Appraised Value:</span>
                  <span>${(payModal.verifiedAppraisedValueUsd || payModal.goldDetails.estimatedValue).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1 font-medium">
                  <span>Payment (70% LTV):</span>
                  <span className="text-emerald-600">${payAmount}</span>
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
              <div className="space-y-2">
                <Label>CC3 Attestation Tx Hash (auto-generated if empty)</Label>
                <Input
                  placeholder="Leave empty for auto-proof"
                  value={payCc3Hash}
                  onChange={(e) => setPayCc3Hash(e.target.value)}
                  className="rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setPayModal(null); setPayTxHash(""); setPayCc3Hash("") }} disabled={processing} className="rounded-xl">
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
