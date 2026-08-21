"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CheckCircle,
  AlertTriangle,
  Wallet,
  RefreshCw,
  ExternalLink,
  Loader2,
  Coins,
  Clock,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import Link from "next/link"
import { TokenResponse } from "@/types/sag"
import { useSocketRepayment } from "@/hooks/use-socket-repayment"
import { RepaymentProgressTracker } from "@/components/repayment-progress-tracker"
import { UserProfile } from "@/lib/auth/auth-service"

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const LABEL = "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]/50"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"
const INPUT = "rounded-xl border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2]"
const BTN = "rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black"

/* ─── Types ─── */
interface SAGProperties {
  loan?: number
  karat: number
  tenorM: number
  weightG: number
  currency: string
  assetType: string
  mintShare: number
  valuation: number
  enableMinting: boolean
  loanPercentage?: number
  pawnerInterestP?: number
  investorFinancingType: string
  investorRoiPercentage: number
  investorRoiFixedAmount?: number
}

interface SAG {
  sagId: string
  tokenId: string
  sagName: string
  sagDescription: string
  sagProperties: SAGProperties
  sagType: string
  certNo: string
  status?: "active" | "closed"
  createdAt?: string
}

interface SAGResponse {
  success: boolean
  data: SAG[]
  pagination: { totalCount: number; currentPage: number; totalPages: number }
}

interface RepaymentData {
  sagId: string
  sagName: string
  arRahnu: string
  amount: string
  dueDate: string
  status: "on-time" | "early" | "late"
  daysRemaining: number
  investorPayout: string
  invoiceSent: boolean
  lastPayment: string
  assetType: string
  weight: string
  karat: number
  tenor: number
  roiPercentage: number
  tokenId: string
}

interface WalletBalanceResponse {
  success: boolean
  data: { balance: string }
}

/* ─── Helpers ─── */
const calculateDueDate = (createdAt: string | undefined, tenorMonths: number): string => {
  if (!createdAt) {
    const today = new Date()
    today.setMonth(today.getMonth() + tenorMonths)
    return today.toISOString().split("T")[0]
  }
  const date = new Date(createdAt)
  date.setMonth(date.getMonth() + tenorMonths)
  return date.toISOString().split("T")[0]
}

const calculateDaysRemaining = (dueDate: string): number => {
  const today = new Date()
  const due = new Date(dueDate)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const getRepaymentStatus = (daysRemaining: number): "on-time" | "early" | "late" => {
  if (daysRemaining < 0) return "late"
  if (daysRemaining > 60) return "early"
  return "on-time"
}

const transformSAGToRepayment = (sag: SAG): RepaymentData => {
  const loanAmount = sag.sagProperties.valuation * ((sag.sagProperties.loanPercentage || 70) / 100)
  const investorReturn = loanAmount * (1 + sag.sagProperties.investorRoiPercentage / 100)
  const dueDate = calculateDueDate(sag.createdAt, sag.sagProperties.tenorM)
  const daysRemaining = calculateDaysRemaining(dueDate)
  const status = getRepaymentStatus(daysRemaining)
  const lastPaymentDate = new Date(dueDate)
  lastPaymentDate.setMonth(lastPaymentDate.getMonth() - 1)

  return {
    sagId: sag.sagId,
    sagName: sag.sagName,
    arRahnu: sag.sagDescription || "Branch",
    amount: `${sag.sagProperties.currency} ${loanAmount.toLocaleString()}`,
    dueDate,
    status,
    daysRemaining,
    investorPayout: `${sag.sagProperties.currency} ${investorReturn.toLocaleString()}`,
    invoiceSent: status !== "late",
    lastPayment: lastPaymentDate.toISOString().split("T")[0],
    assetType: sag.sagProperties.assetType,
    weight: `${sag.sagProperties.weightG}g`,
    karat: sag.sagProperties.karat,
    tenor: sag.sagProperties.tenorM,
    roiPercentage: sag.sagProperties.investorRoiPercentage,
    tokenId: sag.tokenId,
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "early") return <Badge className="bg-blue-50 text-blue-600 border-blue-200 font-mono text-[10px]">Early</Badge>
  if (status === "on-time") return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 font-mono text-[10px]">On-Time</Badge>
  if (status === "late") return <Badge className="bg-red-50 text-red-600 border-red-200 font-mono text-[10px]">Late</Badge>
  return <Badge variant="secondary" className="font-mono text-[10px]">{status}</Badge>
}

/* ════════════════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════════════════ */
export default function RepaymentPage() {
  const [selectedRepayment, setSelectedRepayment] = useState<RepaymentData | null>(null)
  const [showBuybackProgressTracker, setShowBuybackProgressTracker] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [user] = useAtom(userAtom)
  const queryClient = useQueryClient()
  const [isProcessing, setIsProcessing] = useState(false)

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async (): Promise<UserProfile> => {
      const { data } = await apiInstance.get("/auth/user/profile")
      return data.data.userInfo
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ["repayment-sags"],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get("/sag?page_size=100&page_number=1&status=active")
      return data
    },
  })

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async (): Promise<WalletBalanceResponse> => {
      const { data } = await apiInstance.get("/investor/wallet/balance")
      return data
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  const { data: tokenInfo } = useQuery({
    queryKey: ["token-info", selectedRepayment?.tokenId],
    queryFn: async (): Promise<TokenResponse> => {
      const { data } = await apiInstance.get(`/token/${selectedRepayment?.tokenId}`)
      return data
    },
    enabled: !!selectedRepayment?.tokenId,
  })

  const { isConnected, connect, lastProgress, lastComplete, lastError } = useSocketRepayment({
    userId: userProfile?.accountId || "",
    onProgress: (data) => console.log("Buyback progress:", data),
    onComplete: () => {
      setIsProcessing(false)
      setShowBuybackProgressTracker(false)
      queryClient.invalidateQueries({ queryKey: ["repayment-sags"] })
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] })
      toast.success("SAG bought back successfully!")
    },
    onError: (data) => {
      setIsProcessing(false)
      toast.error(`Failed: ${data.error}`)
    },
    autoConnect: false,
  })

  const sags = data?.data || []
  const repaymentData = sags.map(transformSAGToRepayment)
  const walletBalance = balanceData?.data?.balance ? parseFloat(balanceData.data.balance) : 0

  const totalDue = repaymentData.reduce((sum, item) => sum + parseFloat(item.amount.replace(/[^\d.]/g, "")), 0)
  const onTimeCount = repaymentData.filter((item) => item.status === "on-time" || item.status === "early").length
  const lateCount = repaymentData.filter((item) => item.status === "late").length
  const dueTodayCount = repaymentData.filter((item) => item.daysRemaining <= 1 && item.daysRemaining >= 0).length

  const hasSufficientBalance = (investorPayout: string): boolean => {
    const required = tokenInfo?.data ? parseInt(tokenInfo.data.remainingSupply) : 0
    return walletBalance >= required
  }

  const handleBuyBack = async (sagId: string, tokenId: string, investorPayout: string) => {
    setIsProcessing(true)
    setIsDialogOpen(false)
    const requiredAmount = parseFloat(investorPayout.replace(/[^\d.]/g, ""))
    if (walletBalance < requiredAmount) {
      toast.error("Insufficient Balance", {
        description: `Need ${investorPayout}, have CTC ${walletBalance.toLocaleString()}. Top up first.`,
        duration: 5000,
      })
      setIsProcessing(false)
      return
    }
    try {
      await connect()
      setShowBuybackProgressTracker(true)
      await apiInstance.post("/pawnshop/repayment", {
        sagId,
        tokenId,
        pawnshopAccountId: user?.profile?.accountId || (user as any)?.wallet?.address,
      })
    } catch (error) {
      setIsProcessing(false)
      setShowBuybackProgressTracker(false)
      toast.error("Failed to initiate buyback")
    }
  }



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className={LABEL}>Settlement & Liquidity</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            Repayments
          </h1>
          <p className="mt-1 text-sm text-[#4A4A4A]">Monitor repayments and manage settlements</p>
        </div>

      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Wallet Balance", value: `CTC ${walletBalance.toLocaleString()}`, icon: Wallet, loading: balanceLoading },
          { label: "Total Due", value: `CTC ${(totalDue / 1_000_000).toFixed(2)}M`, icon: Coins, loading: isLoading },
          { label: "On-Time", value: onTimeCount, icon: CheckCircle, color: "text-emerald-600", loading: isLoading },
          { label: "Late", value: lateCount, icon: AlertTriangle, color: "text-red-500", loading: isLoading },
          { label: "Due Today", value: dueTodayCount, icon: Clock, color: "text-[#E1BAC2]", loading: isLoading },
        ].map((s) => (
          <div key={s.label} className={`${GLASS} p-5`}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/10">
              <s.icon className={`h-4 w-4 ${s.color || "text-[#E1BAC2]"}`} />
            </div>
            <p className={LABEL}>{s.label}</p>
            <p className={`mt-1 ${VALUE} text-xl`}>{s.loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Repayment Table */}
      <div className={`${GLASS} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className={LABEL}>Active Repayments</p>
            <h3 className="mt-1 font-display text-lg font-bold text-[#171414]">SAG Repayment Schedule</h3>
          </div>
          <Button variant="ghost" size="sm" className="rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" onClick={() => refetchBalance()}>
            <RefreshCw className={`h-3 w-3 mr-1 ${balanceLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
          </div>
        ) : repaymentData.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1BAC2]/10">
              <Coins className="h-7 w-7 text-[#E1BAC2]" />
            </div>
            <p className="font-display text-lg font-bold text-[#171414]">No active repayments</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">SAG repayment schedules will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#171414]/10">
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">SAG</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Amount</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Due Date</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Status</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Days Left</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repaymentData.map((repayment) => (
                  <TableRow key={repayment.sagId} className="border-[#171414]/5 hover:bg-[#E1BAC2]/5">
                    <TableCell>
                      <p className="font-display text-sm font-bold text-[#171414]">{repayment.sagName}</p>
                      <p className="font-mono text-[10px] text-[#4A4A4A]">{repayment.sagId.slice(0, 12)}...</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs font-bold text-[#171414]">{repayment.amount}</p>
                      <p className="font-mono text-[10px] text-[#4A4A4A]">Payout: {repayment.investorPayout}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#171414]">{repayment.dueDate}</TableCell>
                    <TableCell><StatusBadge status={repayment.status} /></TableCell>
                    <TableCell>
                      <span className={`font-mono text-xs ${repayment.daysRemaining < 0 ? "text-red-500 font-bold" : "text-[#4A4A4A]"}`}>
                        {repayment.daysRemaining < 0 ? `${Math.abs(repayment.daysRemaining)}d overdue` : `${repayment.daysRemaining}d`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!hasSufficientBalance(repayment.investorPayout) && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <Dialog open={isDialogOpen && selectedRepayment?.sagId === repayment.sagId} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" onClick={() => { setSelectedRepayment(repayment); setIsDialogOpen(true) }}>
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className={`${GLASS} sm:max-w-2xl max-h-[85vh] overflow-y-auto`}>
                            <DialogHeader>
                              <DialogTitle className="font-display text-xl font-bold text-[#171414]">{selectedRepayment?.sagName}</DialogTitle>
                              <DialogDescription className="text-[#4A4A4A]">Repayment & settlement details</DialogDescription>
                            </DialogHeader>
                            {selectedRepayment && (
                              <div className="space-y-4 py-2">
                                <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                                  <div><p className={LABEL}>Loan Amount</p><p className="font-mono text-xs font-bold text-[#171414] mt-1">{selectedRepayment.amount}</p></div>
                                  <div><p className={LABEL}>Investor Payout</p><p className="font-mono text-xs font-bold text-emerald-600 mt-1">{selectedRepayment.investorPayout}</p></div>
                                  <div><p className={LABEL}>ROI</p><p className="font-mono text-xs text-[#171414] mt-1">{selectedRepayment.roiPercentage}%</p></div>
                                  <div><p className={LABEL}>Tenor</p><p className="font-mono text-xs text-[#171414] mt-1">{selectedRepayment.tenor} months</p></div>
                                  <div><p className={LABEL}>Due Date</p><p className="font-mono text-xs text-[#171414] mt-1">{selectedRepayment.dueDate}</p></div>
                                  <div><p className={LABEL}>Status</p><div className="mt-1"><StatusBadge status={selectedRepayment.status} /></div></div>
                                  <div><p className={LABEL}>Asset</p><p className="text-xs text-[#171414] mt-1">{selectedRepayment.assetType} · {selectedRepayment.weight} · {selectedRepayment.karat}K</p></div>
                                  <div><p className={LABEL}>Last Payment</p><p className="font-mono text-xs text-[#171414] mt-1">{selectedRepayment.lastPayment}</p></div>
                                </div>

                                <div className="flex gap-2">
                                  <Button variant="ghost" className="rounded-full font-mono text-[10px] text-red-500 hover:bg-red-50" disabled={!hasSufficientBalance(selectedRepayment.investorPayout) || isProcessing} onClick={() => handleBuyBack(selectedRepayment.sagId, selectedRepayment.tokenId, selectedRepayment.investorPayout)}>
                                    {isProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                    Buy Back & Burn
                                  </Button>
                                  {selectedRepayment.tokenId && (
                                    <Button variant="ghost" className="rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" asChild>
                                      <a href={`${process.env.NEXT_PUBLIC_ENV_URL}/${selectedRepayment.tokenId}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3 mr-1" /> View Token
                                      </a>
                                    </Button>
                                  )}
                                </div>

                                {!hasSufficientBalance(selectedRepayment.investorPayout) && (
                                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                                      <div>
                                        <p className="font-display text-sm font-bold text-red-600">Insufficient Balance</p>
                                        <p className="font-mono text-xs text-red-500 mt-1">Required: {selectedRepayment.investorPayout}</p>
                                        <p className="font-mono text-xs text-red-500">Available: CTC {walletBalance.toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Buyback Progress Tracker */}
      <RepaymentProgressTracker
        isVisible={showBuybackProgressTracker}
        onClose={() => setShowBuybackProgressTracker(false)}
        progressData={lastProgress}
        completeData={lastComplete}
        errorData={lastError}
      />
    </div>
  )
}
