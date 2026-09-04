"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { toast } from "sonner"
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Gem,
  Wallet,
  ArrowUpRight,
  DollarSign,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"
import { ethers } from "ethers"
import {
  SEPOLIA_REPAYMENT_GATEWAY_ADDRESS,
  REPAYMENT_GATEWAY_ABI,
  switchOrAddSepoliaNetwork,
} from "@/lib/contracts/sepolia-gateways"

interface GoldDetails {
  assetType: string
  karat: number
  weightG: number
  purity: number
  estimatedValue: number
}

interface RepaymentRecord {
  sourceTxHash: string
  amount: string
  timestamp: number
  blockHeight: number
}

interface PledgeRequest {
  id: string
  borrowerId: string
  borrowerWallet: string
  goldDetails: GoldDetails
  status: string
  createdAt: string
  verifiedWeightG?: number
  verifiedKarat?: number
  verifiedAppraisedValueUsd?: number
  paymentAmountUsd?: number
  paymentTxHash?: string
  paymentCc3TxHash?: string
  sagTokenId?: string
  sagMintedAt?: string
  loanDurationMonths?: number
  loanMaturityDate?: string
  borrowerCreditScore?: number
}

interface ReturnCalc {
  pledgeRequestId: string
  sagTokenId: string
  principalUsd: number
  profitUsd: number
  totalReturnUsd: number
  roiPercentage: number
  durationMonths: number
  loanMaturityDate: string | null
  isMatured: boolean
  isRepaid: boolean
  isEligible: boolean
  pawnshopWallet: string
  borrowerWallet: string
  investorWallet: string
}

function formatDuration(months: number): string {
  if (months <= 0) return "1 day"
  if (months === 1) return "1 month"
  if (months === 12) return "1 year"
  return `${months} months`
}

export default function PawnshopRepaymentsPage() {
  const [funded, setFunded] = useState<PledgeRequest[]>([])
  const [sagMinted, setSagMinted] = useState<PledgeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"funded" | "sag_minted">("funded")
  const [ethPrice, setEthPrice] = useState(0)
  const [sagModal, setSagModal] = useState<PledgeRequest | null>(null)
  const [sagModalDuration, setSagModalDuration] = useState<number>(3)
  const [processing, setProcessing] = useState(false)

  // Settle Investor state
  const [settleModal, setSettleModal] = useState<PledgeRequest | null>(null)
  const [settleCalc, setSettleCalc] = useState<ReturnCalc | null>(null)
  const [settleLoading, setSettleLoading] = useState(false)
  const [settleStep, setSettleStep] = useState<"preview" | "signing" | "proving" | "done">("preview")
  const [settleJobId, setSettleJobId] = useState<string | null>(null)
  const [settleResult, setSettleResult] = useState<any>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchRepayments = async () => {
    setLoading(true)
    try {
      const [fundedRes, sagRes] = await Promise.all([
        apiInstance.get("/pledge-requests/mine?status=funded"),
        apiInstance.get("/pledge-requests/mine?status=sag_minted"),
      ])
      setFunded(fundedRes.data.data || [])
      setSagMinted(sagRes.data.data || [])
    } catch {
      setFunded([])
      setSagMinted([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepayments()
    const fetchEthPrice = () => {
      apiInstance.get("/eth-price")
        .then((res) => { const p = res.data?.data?.usd; if (p && p > 0) setEthPrice(p) })
        .catch(() => {})
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const openSettleModal = async (req: PledgeRequest) => {
    setSettleModal(req)
    setSettleCalc(null)
    setSettleStep("preview")
    setSettleJobId(null)
    setSettleResult(null)
    setSettleLoading(true)
    try {
      const res = await apiInstance.get(`/pledge-requests/${req.id}/return-calculation`)
      setSettleCalc(res.data.data)
    } catch (err: any) {
      toast.error("Failed to calculate return: " + (err.response?.data?.error || err.message))
    } finally {
      setSettleLoading(false)
    }
  }

  const executeSettleInvestor = useCallback(async () => {
    if (!settleModal || !settleCalc || !ethPrice) return
    setSettleStep("signing")
    setProcessing(true)

    try {
      // 1. Switch to Sepolia
      const switched = await switchOrAddSepoliaNetwork()
      if (!switched) throw new Error("Failed to switch to Sepolia network")

      const ethereum = (window as any).ethereum
      const provider = new ethers.BrowserProvider(ethereum)
      const signer = await provider.getSigner()

      // 2. Calculate ETH amount from USD total
      const totalReturnEth = settleCalc.totalReturnUsd / ethPrice
      const totalReturnWei = ethers.parseEther(totalReturnEth.toFixed(18))

      // 3. Send settleInvestor transaction on Sepolia
      const gateway = new ethers.Contract(
        SEPOLIA_REPAYMENT_GATEWAY_ADDRESS,
        REPAYMENT_GATEWAY_ABI,
        signer
      )

      const tokenId = Number(settleCalc.sagTokenId)
      toast.info(`Sending settleInvestor(${tokenId}, ${totalReturnWei}) to Sepolia RepaymentGateway...`)

      const tx = await gateway.settleInvestor(tokenId, totalReturnWei, {
        value: totalReturnWei,
      })

      toast.info("Transaction broadcast. Waiting for confirmation...")
      const receipt = await tx.wait()
      toast.success(`Settle tx confirmed: ${receipt.hash}`)

      // 4. Enqueue CC3 proof via backend
      setSettleStep("proving")
      const proofRes = await apiInstance.post(`/pledge-requests/${settleModal.id}/distribute-return`, {
        txHash: receipt.hash,
      })

      const jobId = proofRes.data?.data?.jobId
      setSettleJobId(jobId)
      toast.info("CC3 proof job queued. Polling for completion...")

      // 5. Poll job status
      if (jobId) {
        pollRef.current = setInterval(async () => {
          try {
            const status = await apiInstance.get(`/loan/return/status/${jobId}`)
            const state = status.data?.data?.status || status.data?.data?.state
            if (state === "completed" || state === "COMPLETED") {
              if (pollRef.current) clearInterval(pollRef.current)
              setSettleStep("done")
              setSettleResult(status.data?.data)
              toast.success("Return distribution verified on CC3!")
              fetchRepayments()
            } else if (state === "failed" || state === "FAILED") {
              if (pollRef.current) clearInterval(pollRef.current)
              toast.error("CC3 proof verification failed: " + (status.data?.data?.error || "Unknown error"))
              setSettleStep("preview")
            }
          } catch {}
        }, 5000)
      }
    } catch (err: any) {
      toast.error(err?.reason || err?.message || "Failed to execute settleInvestor")
      setSettleStep("preview")
    } finally {
      setProcessing(false)
    }
  }, [settleModal, settleCalc, ethPrice])

  const activeLoans = sagMinted // SAG minted = active loan
  const pendingMint = funded // Funded but SAG not minted yet

  return (
    <ProtectedRoute requiredRole="pawnshop">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-[#171414]">Loan Tracker</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track funded loans and borrower repayments
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRepayments} className="rounded-xl gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass-panel rounded-2xl border border-[#171414]/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#171414]">{pendingMint.length}</p>
                    <p className="text-xs text-muted-foreground">Awaiting SAG Mint</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel rounded-2xl border border-[#171414]/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#171414]">{activeLoans.length}</p>
                    <p className="text-xs text-muted-foreground">Active Loans</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel rounded-2xl border border-[#171414]/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1BAC2]/20">
                    <Gem className="h-5 w-5 text-[#171414]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#171414]">
                      ${[...funded, ...sagMinted].reduce((sum, r) => sum + (r.paymentAmountUsd || 0), 0).toLocaleString()}
                    </p>
                    {ethPrice > 0 && (
                      <p className="text-xs text-emerald-600 font-mono">
                        ~{([ ...funded, ...sagMinted].reduce((sum, r) => sum + (r.paymentAmountUsd || 0), 0) / ethPrice).toFixed(4)} ETH
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Total Funded</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("funded")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "funded"
                  ? "bg-[#171414] text-[#E1BAC2]"
                  : "bg-[#171414]/5 text-muted-foreground hover:bg-[#171414]/10"
              }`}
            >
              Awaiting SAG Mint ({pendingMint.length})
            </button>
            <button
              onClick={() => setActiveTab("sag_minted")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "sag_minted"
                  ? "bg-[#171414] text-[#E1BAC2]"
                  : "bg-[#171414]/5 text-muted-foreground hover:bg-[#171414]/10"
              }`}
            >
              Active Loans ({activeLoans.length})
            </button>
          </div>

          {/* Loans List */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading loans...
            </div>
          ) : (activeTab === "funded" ? pendingMint : activeLoans).length === 0 ? (
            <Card className="glass-panel rounded-3xl border border-[#171414]/10">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {activeTab === "funded" ? "No loans awaiting SAG mint" : "No active loans"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(activeTab === "funded" ? pendingMint : activeLoans).map((req) => {
                const isOverdue = req.loanMaturityDate && new Date(req.loanMaturityDate) < new Date()
                const timeLeft = req.loanMaturityDate
                  ? Math.max(0, Math.floor((new Date(req.loanMaturityDate).getTime() - Date.now()) / 60000))
                  : null

                return (
                  <Card key={req.id} className="glass-panel rounded-2xl border border-[#171414]/10 overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-[#171414]/5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]/20">
                            <Gem className="h-5 w-5 text-[#171414]" />
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
                        <div className="flex items-center gap-2">
                          {req.sagTokenId && (
                            <Badge className="rounded-full bg-[#E1BAC2]/20 text-[#171414] border-[#E1BAC2]/30">
                              <Gem className="h-3 w-3 mr-1" /> SAG #{req.sagTokenId.slice(0, 8)}
                            </Badge>
                          )}
                          {isOverdue ? (
                            <Badge className="rounded-full bg-red-100 text-red-700 border-red-200">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
                            </Badge>
                          ) : timeLeft !== null ? (
                            <Badge className="rounded-full bg-emerald-100 text-emerald-700 border-emerald-200">
                              <Clock className="h-3 w-3 mr-1" /> {timeLeft}m left
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="px-5 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Weight</p>
                            <p className="text-sm font-medium">{req.verifiedWeightG || req.goldDetails.weightG}g</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Appraised</p>
                            <p className="text-sm font-medium">${(req.verifiedAppraisedValueUsd || req.goldDetails.estimatedValue).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Lent (70%)</p>
                            <p className="text-sm font-medium text-emerald-600">${req.paymentAmountUsd?.toLocaleString()}</p>
                            {ethPrice > 0 && req.paymentAmountUsd && (
                              <p className="text-xs font-mono text-emerald-600/70">~{(req.paymentAmountUsd / ethPrice).toFixed(4)} ETH</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Duration</p>
                            <p className="text-sm font-medium">{req.loanDurationMonths} months</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Due</p>
                            <p className="text-sm font-medium">
                              {req.loanMaturityDate
                                ? new Date(req.loanMaturityDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                : '--'}
                            </p>
                          </div>
                        </div>

                        {/* Payment Proof */}
                        {req.paymentTxHash && (
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground">Payment:</span>
                            <a
                              href={`https://eth-sepolia.blockscout.com/tx/${req.paymentTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-600 hover:underline flex items-center gap-1"
                            >
                              View on Blockscout <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        )}

                        {req.borrowerCreditScore !== undefined && req.borrowerCreditScore > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Borrower Credit Score: {req.borrowerCreditScore}
                          </div>
                        )}

                        {/* Mint SAG button for funded loans without SAG */}
                        {req.status === 'funded' && !req.sagTokenId && (
                          <div className="mt-3 pt-3 border-t border-[#171414]/5">
                            <Button
                              onClick={() => { setSagModal(req); setSagModalDuration(req.loanDurationMonths || 3) }}
                              className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                            >
                              <Gem className="h-4 w-4" /> Mint SAG Token
                            </Button>
                          </div>
                        )}

                        {/* Settle Investor button for active loans with SAG */}
                        {req.status === 'sag_minted' && req.sagTokenId && (
                          <div className="mt-3 pt-3 border-t border-[#171414]/5 flex gap-2">
                            <Button
                              onClick={() => openSettleModal(req)}
                              className="rounded-xl gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              <ArrowUpRight className="h-4 w-4" /> Settle Investor Return
                            </Button>
                          </div>
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
                    id="repayInvestmentTarget"
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
                  id="repayLoanDuration"
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
                    try {
                      const targetEl = document.getElementById('repayInvestmentTarget') as HTMLInputElement
                      const durationEl = document.getElementById('repayLoanDuration') as HTMLSelectElement
                      const investmentTarget = targetEl ? Number(targetEl.value) : 0
                      const loanDurationMonths = durationEl ? Number(durationEl.value) : 3

                      toast.info("Minting SAG token on CC3...")
                      const res = await apiInstance.patch(`/pledge-requests/${sagModal.id}/mint-sag`, {
                        investmentTargetUsd: investmentTarget,
                        loanDurationMonths,
                      })
                      if (res.data?.data?.sagTxHash) {
                        toast.success("SAG token minted on CC3!")
                      }
                      setSagModal(null)
                      fetchRepayments()
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

      {/* Settle Investor Modal */}
      {settleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Settle Investor Return
              </CardTitle>
              <CardDescription>
                Distribute principal + profit to the funding investor for SAG #{settleModal.sagTokenId?.slice(0, 8)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settleLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Calculating return figures...</p>
                </div>
              ) : settleCalc ? (
                <>
                  {/* Server-Calculated Return Breakdown */}
                  <div className="rounded-xl bg-[#FAFAF8] border border-[#171414]/10 p-4 space-y-3">
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">Return Breakdown (Server-Calculated)</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Principal:</span>
                        <p className="font-medium">${settleCalc.principalUsd.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">ROI:</span>
                        <p className="font-medium">{settleCalc.roiPercentage}% × {settleCalc.durationMonths} mo</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Profit:</span>
                        <p className="font-medium text-emerald-600">+${settleCalc.profitUsd.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Total Return:</span>
                        <p className="font-bold text-lg text-emerald-600">${settleCalc.totalReturnUsd.toLocaleString()}</p>
                      </div>
                    </div>
                    {ethPrice > 0 && (
                      <div className="pt-2 border-t border-[#171414]/10 text-xs text-muted-foreground">
                        ≈ {(settleCalc.totalReturnUsd / ethPrice).toFixed(6)} ETH @ ${ethPrice.toLocaleString()}/ETH
                      </div>
                    )}
                  </div>

                  {/* Investor Address */}
                  <div className="rounded-xl bg-muted p-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Investor Wallet:</span>
                      <span className="font-mono">{settleCalc.investorWallet.slice(0, 10)}...{settleCalc.investorWallet.slice(-6)}</span>
                    </div>
                  </div>

                  {/* Maturity Status */}
                  <div className="flex items-center gap-2 text-xs">
                    {settleCalc.isMatured ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 rounded-full">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Loan Matured
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-full">
                        <Clock className="h-3 w-3 mr-1" /> Not Yet Matured
                      </Badge>
                    )}
                  </div>

                  {/* Step Progress */}
                  {settleStep === "signing" && (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Signing Transaction...</p>
                        <p className="text-xs text-blue-600">Confirm in MetaMask to send settleInvestor on Sepolia</p>
                      </div>
                    </div>
                  )}
                  {settleStep === "proving" && (
                    <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-800">CC3 Proof Verification...</p>
                        <p className="text-xs text-purple-600">Waiting for Attestcoin BlockProver to verify on CC3</p>
                      </div>
                    </div>
                  )}
                  {settleStep === "done" && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Return Distribution Verified!</p>
                        {settleResult?.explorerUrl && (
                          <a href={settleResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                            View on CC3 Explorer <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Failed to load return calculation.</p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (pollRef.current) clearInterval(pollRef.current)
                    setSettleModal(null)
                  }}
                  disabled={settleStep === "signing"}
                  className="rounded-xl"
                >
                  {settleStep === "done" ? "Close" : "Cancel"}
                </Button>
                {settleStep === "preview" && settleCalc && (
                  <Button
                    onClick={executeSettleInvestor}
                    disabled={processing || !ethPrice}
                    className="rounded-xl gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                    <ArrowUpRight className="h-4 w-4" /> Send ${settleCalc.totalReturnUsd.toLocaleString()} to Investor
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  )
}

