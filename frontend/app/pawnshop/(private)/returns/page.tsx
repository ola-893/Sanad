"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Coins,
  ArrowUpRight,
  DollarSign,
  Send,
  Users,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"
import { useProofProgress } from "@/store/proof-progress"
import { ethers } from "ethers"
import {
  SEPOLIA_REPAYMENT_GATEWAY_ADDRESS,
  REPAYMENT_GATEWAY_ABI,
  SEPOLIA_EXPLORER_URL,
  switchOrAddSepoliaNetwork,
} from "@/lib/contracts/sepolia-gateways"

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
  pawnshopId: string
  pawnshopWallet: string
  goldDetails: GoldDetails
  status: string
  createdAt: string
  verifiedWeightG?: number
  verifiedKarat?: number
  verifiedAppraisedValueUsd?: number
  paymentAmountUsd?: number
  sagTokenId?: string
  loanDurationMonths?: number
  loanMaturityDate?: string
}

interface InvestorReturn {
  id: string
  userId: string
  sagTokenId: string
  amountUsd: string
  ethAmount: string
  sourceTxHash: string
  cc3TxHash: string
  status: string
  firstName: string
  lastName: string
  investorWallet: string
  createdAt: string
  profitUsd: number
  totalReturnUsd: number
}

interface ReturnCalcData {
  pledgeRequestId: string
  sagTokenId: string
  roiPercentage: number
  durationMonths: number
  realMaturityDate: string
  isMatured: boolean
  isRepaid: boolean
  isEligible: boolean
  pawnshopWallet: string
  borrowerWallet: string
  totalInvestedUsd: number
  totalProfitUsd: number
  totalReturnUsd: number
  investors: InvestorReturn[]
}

interface LoanReturnRecord {
  id: string
  pledgeRequestId: string
  sagTokenId: string
  investorWallet: string
  principalUsd: string
  profitUsd: string
  totalReturnUsd: string
  sepoliaTxHash: string
  cc3TxHash: string | null
  status: string
  createdAt: string
}

function truncateAddress(addr: string): string {
  if (!addr) return "—"
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatDurationLabel(months: number): string {
  if (months <= 0) return "1 day"
  if (months === 1) return "1 month"
  if (months === 12) return "1 year"
  return `${months} months`
}

function getRealMaturityDate(createdAt: string, durationMonths: number): Date {
  const origination = new Date(createdAt)
  return new Date(origination.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000)
}

function getTimeRemaining(endDate: Date): { label: string; isOverdue: boolean } {
  const now = new Date()
  const diff = endDate.getTime() - now.getTime()
  if (diff <= 0) {
    const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))
    return { label: `${days}d overdue`, isOverdue: true }
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const months = Math.floor(days / 30)
  const rem = days % 30
  if (months > 0) return { label: `${months}mo ${rem}d left`, isOverdue: false }
  return { label: `${days}d left`, isOverdue: false }
}

export default function PawnshopReturnsPage() {
  const [loans, setLoans] = useState<PledgeRequest[]>([])
  const [returns, setReturns] = useState<LoanReturnRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [ethPrice, setEthPrice] = useState(0)
  const [walletAddress, setWalletAddress] = useState("")

  // Per-loan investor data (fetched on demand)
  const [loanInvestors, setLoanInvestors] = useState<Record<string, InvestorReturn[]>>({})

  // Settle state
  const [settleModal, setSettleModal] = useState<{ loan: PledgeRequest; investor: InvestorReturn } | null>(null)
  const [settleCalc, setSettleCalc] = useState<{ principal: number; profit: number; total: number; roi: number; months: number } | null>(null)
  const [settleStep, setSettleStep] = useState<"signing" | "proving" | "done">("signing")
  const [settleResult, setSettleResult] = useState<any>(null)
  const [settleProcessing, setSettleProcessing] = useState(false)
  const { addJob } = useProofProgress()

  // Details modal
  const [detailsLoan, setDetailsLoan] = useState<PledgeRequest | null>(null)
  const [detailsCalc, setDetailsCalc] = useState<ReturnCalcData | null>(null)
  const [detailsReturns, setDetailsReturns] = useState<LoanReturnRecord[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const ethereum = (window as any).ethereum
      if (ethereum) {
        const accounts = await ethereum.request({ method: "eth_accounts" })
        if (accounts?.[0]) setWalletAddress(accounts[0])
      }

      const sagRes = await apiInstance.get("/pledge-requests/mine?status=sag_minted").catch(() => ({ data: { data: [] } }))
      const activeLoans = sagRes.data?.data || []
      setLoans(activeLoans)

      // Fetch returns for pawnshop
      if (walletAddress) {
        const retRes = await apiInstance.get(`/pawnshop/returns/${walletAddress}`).catch(() => ({ data: { data: [] } }))
        setReturns(retRes.data?.data || [])
      }

      // Fetch investors for each loan
      const invMap: Record<string, InvestorReturn[]> = {}
      await Promise.all(
        activeLoans
          .filter((l: PledgeRequest) => l.sagTokenId)
          .map(async (l: PledgeRequest) => {
            try {
              const res = await apiInstance.get(`/investor/sag/${l.sagTokenId}/investments`)
              invMap[l.sagTokenId!] = res.data?.data || []
            } catch {
              invMap[l.sagTokenId!] = []
            }
          })
      )
      setLoanInvestors(invMap)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  useEffect(() => {
    fetchAll()
    const fetchEthPrice = () => {
      apiInstance.get("/eth-price")
        .then((res) => { const p = res.data?.data?.usd; if (p && p > 0) setEthPrice(p) })
        .catch(() => {})
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (walletAddress) {
      apiInstance.get(`/pawnshop/returns/${walletAddress}`)
        .then((res) => setReturns(res.data?.data || []))
        .catch(() => {})
    }
  }, [walletAddress])



  // Check if an investor already has a return distributed
  const getReturnForInvestor = (pledgeRequestId: string, investorWallet: string): LoanReturnRecord | undefined => {
    return returns.find(
      (r) => r.pledgeRequestId === pledgeRequestId && r.investorWallet.toLowerCase() === investorWallet.toLowerCase()
    )
  }

  // Open settle modal for a specific investor
  const openSettleModal = async (loan: PledgeRequest, investor: InvestorReturn) => {
    const months = loan.loanDurationMonths || 3
    const roi = months <= 1 ? 2 : months <= 3 ? 6 : months <= 6 ? 12 : 24 // total ROI for the duration
    const invested = Number(investor.amountUsd || 0)
    const profit = Number((invested * (roi / 100)).toFixed(2))
    const total = Number((invested + profit).toFixed(2))

    setSettleModal({ loan, investor })
    setSettleCalc({ principal: invested, profit, total, roi, months })
    setSettleStep("signing")
    setSettleResult(null)
  }

  // Execute settle for a specific investor
  const executeSettle = useCallback(async () => {
    if (!settleModal || !settleCalc || !ethPrice) return
    setSettleProcessing(true)

    try {
      const switched = await switchOrAddSepoliaNetwork()
      if (!switched) throw new Error("Failed to switch to Sepolia network")

      const ethereum = (window as any).ethereum
      const provider = new ethers.BrowserProvider(ethereum)
      const signer = await provider.getSigner()

      const totalReturnEth = settleCalc.total / ethPrice
      const totalReturnWei = ethers.parseEther(totalReturnEth.toFixed(18))
      const tokenId = Number(settleModal.loan.sagTokenId)

      toast.info(`Sending settleInvestor(${tokenId}) to Sepolia...`)
      const gateway = new ethers.Contract(SEPOLIA_REPAYMENT_GATEWAY_ADDRESS, REPAYMENT_GATEWAY_ABI, signer)
      const tx = await gateway.settleInvestor(tokenId, totalReturnWei, { value: totalReturnWei })
      toast.info("Transaction broadcast. Waiting for confirmation...")
      const receipt = await tx.wait()
      toast.success(`Settle confirmed: ${receipt.hash.slice(0, 10)}...`)

      setSettleStep("proving")
      const proofRes = await apiInstance.post(`/pledge-requests/${settleModal.loan.id}/distribute-return`, {
        txHash: receipt.hash,
        investorWallet: settleModal.investor.investorWallet,
      })

      const jobId = proofRes.data?.data?.jobId
      const gold = settleModal.loan.goldDetails

      // Add to global proof store — ProofBanner will poll and persist
      addJob({
        type: "settle",
        jobId: jobId || "",
        sagName: `${gold?.assetType} ${gold?.karat}K`,
        sagTokenId: settleModal.loan.sagTokenId,
        amountUsd: settleCalc?.total,
        sourceTxHash: receipt.hash,
      })

      toast.success("Settle confirmed! CC3 proof processing in background.")
      setSettleModal(null)
    } catch (err: any) {
      const msg = err?.reason || err?.message || "Failed"
      if (msg.includes("user denied") || msg.includes("rejected") || msg.includes("USER_DENIED")) {
        toast.error("Transaction cancelled in MetaMask.")
      } else {
        toast.error(msg)
      }
      setSettleStep("signing")
    } finally {
      setSettleProcessing(false)
    }
  }, [settleModal, settleCalc, ethPrice, fetchAll])

  // Stats
  const totalLoans = loans.length
  const totalInvestors = Object.values(loanInvestors).reduce((s, arr) => s + arr.length, 0)
  const settledCount = returns.length
  const pendingCount = totalInvestors - settledCount
  const totalDistributed = returns.reduce((s, r) => s + Number(r.totalReturnUsd || 0), 0)

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-[#171414]">Investor Returns</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Distribute principal + profit to each investor per SAG token
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} className="rounded-xl gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-panel rounded-2xl border border-[#171414]/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Coins className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#171414]">{totalLoans}</p>
                  <p className="text-xs text-muted-foreground">Active Loans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel rounded-2xl border border-[#171414]/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#171414]">{totalInvestors}</p>
                  <p className="text-xs text-muted-foreground">Total Investors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel rounded-2xl border border-[#171414]/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#171414]">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending Settlement</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel rounded-2xl border border-[#171414]/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#171414]">{settledCount}</p>
                  <p className="text-xs text-muted-foreground">Settled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loans → Investors */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading active loans...
          </div>
        ) : loans.length === 0 ? (
          <Card className="glass-panel rounded-3xl border border-[#171414]/10">
            <CardContent className="py-12 text-center">
              <Coins className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No active loans with SAG tokens yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {loans.map((loan) => {
              const gold = loan.goldDetails || {}
              const durationMonths = loan.loanDurationMonths || 3
              const realMaturity = getRealMaturityDate(loan.createdAt, durationMonths)
              const timeInfo = getTimeRemaining(realMaturity)
              const investors = loanInvestors[loan.sagTokenId || ""] || []

              return (
                <Card key={loan.id} className="glass-panel rounded-2xl border border-[#171414]/10 overflow-hidden">
                  {/* Loan Header */}
                  <div className="px-5 py-4 border-b border-[#171414]/5 bg-[#171414]/[0.02]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]/20">
                          <Gem className="h-5 w-5 text-[#171414]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#171414]">
                            {gold.assetType} {gold.karat}K — {loan.verifiedWeightG || gold.weightG}g
                          </p>
                          <p className="text-xs text-muted-foreground">
                            SAG #{loan.sagTokenId} • Maturity: {realMaturity.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={`rounded-full ${
                          timeInfo.isOverdue
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-blue-100 text-blue-700 border-blue-200"
                        }`}
                      >
                        {timeInfo.isOverdue ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                        {timeInfo.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Investors */}
                  <div className="px-5 py-4">
                    {investors.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No investors yet</p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">
                          Investors ({investors.length})
                        </p>
                        {investors.map((inv) => {
                          const invested = Number(inv.amountUsd || 0)
                          const roi = durationMonths <= 1 ? 2 : durationMonths <= 3 ? 6 : durationMonths <= 6 ? 12 : 24
                          const profit = Number((invested * (roi / 100)).toFixed(2))
                          const total = invested + profit
                          const existingReturn = getReturnForInvestor(loan.id, inv.investorWallet)

                          return (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between p-3 rounded-xl border border-[#171414]/5 bg-white"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-[#171414]">
                                    {inv.firstName && inv.lastName
                                      ? `${inv.firstName} ${inv.lastName}`
                                      : truncateAddress(inv.investorWallet)}
                                  </p>
                                  {existingReturn ? (
                                    <Badge className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] border-0">
                                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Settled
                                    </Badge>
                                  ) : (
                                    <Badge className="rounded-full bg-amber-100 text-amber-700 text-[10px] border-0">
                                      <Clock className="h-2.5 w-2.5 mr-0.5" /> Pending
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground font-mono">{truncateAddress(inv.investorWallet)}</p>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Amount breakdown */}
                                <div className="text-right text-xs">
                                  <p className="text-muted-foreground">
                                    Invested: <span className="font-medium text-[#171414]">${invested.toLocaleString()}</span>
                                  </p>
                                  <p className="text-emerald-600">
                                    Return: <span className="font-bold">${total.toFixed(2)}</span>
                                    <span className="text-muted-foreground ml-1">(+$0.{String(profit).padStart(2, "0")})</span>
                                  </p>
                                  {ethPrice > 0 && (
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      ≈ {(total / ethPrice).toFixed(6)} ETH
                                    </p>
                                  )}
                                </div>

                                {/* Settle button */}
                                {!existingReturn ? (
                                  <Button
                                    onClick={() => openSettleModal(loan, inv)}
                                    size="sm"
                                    className="rounded-xl gap-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                                  >
                                    <Send className="h-3.5 w-3.5" /> Settle
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-1 text-xs">
                                    <a
                                      href={`${SEPOLIA_EXPLORER_URL}/tx/${existingReturn.sepoliaTxHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-cyan-600 hover:underline flex items-center gap-0.5"
                                    >
                                      Sepolia <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                    {existingReturn.cc3TxHash && (
                                      <a
                                        href={`https://creditcoin-testnet.blockscout.com/tx/${existingReturn.cc3TxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-600 hover:underline flex items-center gap-0.5 ml-1"
                                      >
                                        CC3 <ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Settle Modal — per investor */}
      {settleModal && settleCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Settle Investor Return
              </CardTitle>
              <CardDescription>
                {settleModal.investor.firstName && settleModal.investor.lastName
                  ? `${settleModal.investor.firstName} ${settleModal.investor.lastName}`
                  : truncateAddress(settleModal.investor.investorWallet)}
                {" · "}SAG #{settleModal.loan.sagTokenId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Breakdown */}
              <div className="rounded-xl bg-[#FAFAF8] border border-[#171414]/10 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invested Amount:</span>
                  <span className="font-medium">${settleCalc.principal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ROI:</span>
                  <span className="font-medium">{settleCalc.roi}% × {settleCalc.months} mo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profit:</span>
                  <span className="font-medium text-emerald-600">+${settleCalc.profit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-[#171414]/10 pt-2">
                  <span className="text-muted-foreground font-medium">Total Return:</span>
                  <span className="font-bold text-lg text-emerald-600">${settleCalc.total.toFixed(2)}</span>
                </div>
                {ethPrice > 0 && (
                  <p className="text-[10px] text-muted-foreground text-right">
                    ≈ {(settleCalc.total / ethPrice).toFixed(6)} ETH @ ${ethPrice.toLocaleString()}/ETH
                  </p>
                )}
              </div>

              {/* Investor wallet */}
              <div className="rounded-xl bg-muted p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investor Wallet:</span>
                  <span className="font-mono">{truncateAddress(settleModal.investor.investorWallet)}</span>
                </div>
              </div>

              {/* Steps */}
              {settleStep === "signing" && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-3">
                  {settleProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : (
                    <Send className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-blue-800">Settle via RepaymentGateway</p>
                    <p className="text-xs text-blue-600">Confirm in MetaMask to send settleInvestor on Sepolia</p>
                  </div>
                </div>
              )}
              {settleStep === "proving" && (
                <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">CC3 Proof Verification...</p>
                    <p className="text-xs text-purple-600">Waiting for Attestcoin to verify</p>
                  </div>
                </div>
              )}
              {settleStep === "done" && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Return Distributed!</p>
                    {settleResult?.explorerUrl && (
                      <a href={settleResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                        View on CC3 Explorer <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSettleModal(null)
                  }}
                  disabled={settleStep === "signing" && settleProcessing}
                  className="rounded-xl"
                >
                  {settleStep === "done" ? "Close" : "Cancel"}
                </Button>
                {settleStep === "signing" && (
                  <Button
                    onClick={executeSettle}
                    disabled={settleProcessing || !ethPrice}
                    className="rounded-xl gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {settleProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                    <ArrowUpRight className="h-4 w-4" /> Send ${settleCalc.total.toFixed(2)}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Details Modal */}
      {detailsLoan && detailsCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="font-display">
                {detailsCalc.sagTokenId} — Full Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-[#FAFAF8] border border-[#171414]/10 p-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Total Invested:</span>
                    <p className="font-medium">${detailsCalc.totalInvestedUsd.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Total Profit:</span>
                    <p className="font-medium text-emerald-600">+${detailsCalc.totalProfitUsd.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Total Return:</span>
                    <p className="font-bold text-emerald-600">${detailsCalc.totalReturnUsd.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {detailsCalc.investors.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#171414]/5 text-sm">
                    <div>
                      <p className="font-medium">{inv.firstName && inv.lastName ? `${inv.firstName} ${inv.lastName}` : truncateAddress(inv.investorWallet)}</p>
                      <p className="text-xs text-muted-foreground font-mono">{truncateAddress(inv.investorWallet)}</p>
                    </div>
                    <div className="text-right">
                      <p>Invested: ${Number(inv.amountUsd).toLocaleString()}</p>
                      <p className="text-emerald-600 font-bold">Return: ${inv.totalReturnUsd.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDetailsLoan(null)} className="rounded-xl">Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
