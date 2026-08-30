"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/auth/protected-route"
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
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

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

export default function PawnshopRepaymentsPage() {
  const [funded, setFunded] = useState<PledgeRequest[]>([])
  const [sagMinted, setSagMinted] = useState<PledgeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"funded" | "sag_minted">("funded")
  const [ethPrice, setEthPrice] = useState(0)

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
    apiInstance.get("/eth-price")
      .then((res) => setEthPrice(res.data?.data?.usd || 0))
      .catch(() => setEthPrice(4500))
  }, [])

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
                      ${activeLoans.reduce((sum, r) => sum + (r.paymentAmountUsd || 0), 0).toLocaleString()}
                    </p>
                    {ethPrice > 0 && (
                      <p className="text-xs text-emerald-600 font-mono">
                        ~{(activeLoans.reduce((sum, r) => sum + (r.paymentAmountUsd || 0), 0) / ethPrice).toFixed(4)} ETH
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
                            <p className="text-sm font-medium">{req.loanDurationMonths} min</p>
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
                              Sepolia Tx <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                            {req.paymentCc3TxHash && (
                              <a
                                href={`https://creditcoin-testnet.blockscout.com/tx/${req.paymentCc3TxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#171414] hover:underline flex items-center gap-1"
                              >
                                CC3 Proof <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        )}

                        {req.borrowerCreditScore !== undefined && req.borrowerCreditScore > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Borrower Credit Score: {req.borrowerCreditScore}
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
    </ProtectedRoute>
  )
}
