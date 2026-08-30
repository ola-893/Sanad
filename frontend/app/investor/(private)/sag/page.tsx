"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { toast } from "sonner"
import {
  Gem,
  Loader2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Clock,
  Wallet,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

interface SagToken {
  id: string
  sagTokenId: string
  borrowerWallet: string
  pawnshopWallet: string
  goldDetails: {
    assetType: string
    karat: number
    weightG: number
    estimatedValue: number
  }
  verifiedWeightG?: number
  verifiedKarat?: number
  verifiedAppraisedValueUsd?: number
  paymentAmountUsd?: number
  loanDurationMonths?: number
  loanMaturityDate?: string
  investmentTargetUsd?: number
  investmentFilledUsd?: number
  minInvestmentUsd?: number
}

export default function InvestorSagPage() {
  const [sagTokens, setSagTokens] = useState<SagToken[]>([])
  const [loading, setLoading] = useState(true)
  const [ethPrice, setEthPrice] = useState(0)
  const [investModal, setInvestModal] = useState<SagToken | null>(null)
  const [investAmount, setInvestAmount] = useState("")
  const [processing, setProcessing] = useState(false)

  const fetchSagTokens = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/sag")
      setSagTokens(res.data.data || [])
    } catch {
      setSagTokens([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSagTokens()
    apiInstance.get("/eth-price")
      .then((res) => setEthPrice(res.data?.data?.usd || 0))
      .catch(() => setEthPrice(4500))
  }, [])

  const openInvestModal = (token: SagToken) => {
    setInvestModal(token)
    const remaining = (token.investmentTargetUsd || token.paymentAmountUsd || 0) - (token.investmentFilledUsd || 0)
    setInvestAmount(String(Math.min(remaining, 1000)))
  }

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-[#171414]">SAG Tokens</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Invest in gold-backed collateral tokens
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSagTokens} className="rounded-xl gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass-panel rounded-2xl border border-[#171414]/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1BAC2]/20">
                    <Gem className="h-5 w-5 text-[#171414]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#171414]">{sagTokens.length}</p>
                    <p className="text-xs text-muted-foreground">Available SAGs</p>
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
                    <p className="text-2xl font-bold text-[#171414]">
                      ${sagTokens.reduce((sum, t) => sum + (t.investmentTargetUsd || t.paymentAmountUsd || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel rounded-2xl border border-[#171414]/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <Wallet className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#171414]">
                      ${sagTokens.reduce((sum, t) => sum + (t.investmentFilledUsd || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Funded</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SAG Tokens List */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading SAG tokens...
            </div>
          ) : sagTokens.length === 0 ? (
            <Card className="glass-panel rounded-3xl border border-[#171414]/10">
              <CardContent className="py-12 text-center">
                <Gem className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No SAG tokens available</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  SAG tokens will appear here after pawnshops mint them
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sagTokens.map((token) => {
                const target = token.investmentTargetUsd || token.paymentAmountUsd || 0
                const filled = token.investmentFilledUsd || 0
                const remaining = target - filled
                const progress = target > 0 ? (filled / target) * 100 : 0
                const appraisedValue = token.verifiedAppraisedValueUsd || token.goldDetails?.estimatedValue || 0

                return (
                  <Card key={token.id} className="glass-panel rounded-2xl border border-[#171414]/10 overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-[#171414]/5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E1BAC2]/20">
                            <Gem className="h-6 w-6 text-[#171414]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#171414]">
                              {token.goldDetails?.assetType || "Gold"} {token.goldDetails?.karat || token.verifiedKarat}K
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Token #{token.sagTokenId}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#171414]">${target.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Investment Target</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="px-5 py-4">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Weight</p>
                            <p className="text-sm font-medium">{token.verifiedWeightG || token.goldDetails?.weightG}g</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Appraised</p>
                            <p className="text-sm font-medium">${appraisedValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Duration</p>
                            <p className="text-sm font-medium">{token.loanDurationMonths} months</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Due</p>
                            <p className="text-sm font-medium">
                              {token.loanMaturityDate
                                ? new Date(token.loanMaturityDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                : '--'}
                            </p>
                          </div>
                        </div>

                        {/* Funding Progress */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Funding Progress</span>
                            <span className="font-medium">${filled.toLocaleString()} / ${target.toLocaleString()}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            ${remaining.toLocaleString()} remaining
                          </p>
                        </div>

                        {/* Action */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => openInvestModal(token)}
                            disabled={remaining <= 0}
                            className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                          >
                            {remaining <= 0 ? "Fully Funded" : "Invest Now"}
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

      {/* Invest Modal */}
      {investModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="font-display">Invest in SAG Token</CardTitle>
              <CardDescription>
                Fund this gold-backed loan and earn returns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Token Summary */}
              <div className="rounded-xl bg-[#FAFAF8] border border-[#171414]/10 p-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Gold:</span>
                    <span className="ml-2 font-medium">{investModal.goldDetails?.assetType} {investModal.goldDetails?.karat}K</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="ml-2 font-medium">{investModal.verifiedWeightG || investModal.goldDetails?.weightG}g</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target:</span>
                    <span className="ml-2 font-medium">${(investModal.investmentTargetUsd || investModal.paymentAmountUsd || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="ml-2 font-medium text-emerald-600">
                      ${((investModal.investmentTargetUsd || investModal.paymentAmountUsd || 0) - (investModal.investmentFilledUsd || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Investment Amount */}
              <div className="space-y-2">
                <Label>Investment Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    min={investModal.minInvestmentUsd || 100}
                    max={(investModal.investmentTargetUsd || investModal.paymentAmountUsd || 0) - (investModal.investmentFilledUsd || 0)}
                    className="rounded-xl pl-7"
                  />
                </div>
                {ethPrice > 0 && investAmount && (
                  <p className="text-xs text-muted-foreground">
                    ~{(Number(investAmount) / ethPrice).toFixed(4)} ETH
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Minimum: ${investModal.minInvestmentUsd || 100}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setInvestModal(null); setInvestAmount("") }} disabled={processing} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!investModal || !investAmount) return
                    setProcessing(true)
                    try {
                      toast.info("Investment recorded. Send ETH to InvestorVault on Sepolia.")
                      // Record the investment
                      await apiInstance.post("/investor/invest", {
                        sagTokenId: investModal.sagTokenId,
                        amountUsd: Number(investAmount),
                      })
                      toast.success("Investment recorded!")
                      setInvestModal(null)
                      setInvestAmount("")
                      fetchSagTokens()
                    } catch (err: any) {
                      toast.error(err.response?.data?.error || "Investment failed")
                    } finally {
                      setProcessing(false)
                    }
                  }}
                  disabled={processing || !investAmount || Number(investAmount) < (investModal.minInvestmentUsd || 100)}
                  className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record Investment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  )
}
