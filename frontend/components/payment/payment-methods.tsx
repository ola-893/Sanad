"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Wallet, ExternalLink, Copy, Loader2, CheckCircle2, Shield } from "lucide-react"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { useCtcPrice, ctcToUsd, formatUsd } from "@/hooks/use-ctc-price"
import { useLiquidityPool } from "@/hooks/use-liquidity-pool"
import { useCreditcoinWallet } from "@/hooks/use-creditcoin-wallet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CrossChainRepayCard } from "./cross-chain-repay-card"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface WalletData {
  address: string
  balanceCTC: string
  network: string
}

export function PaymentMethods() {
  const [repayChannel, setRepayChannel] = useState<"sepolia" | "cc3">("sepolia")
  const [loanId, setLoanId] = useState("1")
  const [amountCTC, setAmountCTC] = useState("5.0")
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [completedTxHash, setCompletedTxHash] = useState<string | null>(null)
  const [completedBlock, setCompletedBlock] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const { isConnected, balance: walletBalanceStr } = useCreditcoinWallet()
  const { repayLoanDirect } = useLiquidityPool()

  const { data: walletData } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async (): Promise<{ success: boolean; data: WalletData }> => {
      const response = await apiInstance.get("/investor/wallet/balance")
      return response.data
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  })

  const wallet = walletData?.data
  const availableBalance = isConnected ? parseFloat(walletBalanceStr) : (wallet ? parseFloat(wallet.balanceCTC) || 0 : 0)
  const { data: ctcPrice } = useCtcPrice()
  const usdRate = ctcPrice?.ctcUsd || 0.10
  const hasInsufficientBalance = amountCTC ? parseFloat(amountCTC) > availableBalance : false
  const explorerBase = process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"

  const handlePayment = async () => {
    if (!loanId || !amountCTC || parseFloat(amountCTC) <= 0) {
      toast.error("Please select a loan and enter a valid repayment amount")
      return
    }

    setIsProcessing(true)
    const toastId = toast.loading(`Broadcasting repayment of ${amountCTC} tCTC for SAG #${loanId} to Creditcoin 3...`)

    try {
      if (isConnected) {
        // Direct Web3 wallet repayment against SanadLiquidityPool.sol
        const res = await repayLoanDirect(loanId, amountCTC)
        if (res.success && res.transactionHash) {
          setCompletedTxHash(res.transactionHash)
          setCompletedBlock(res.blockNumber || null)
          setPaymentComplete(true)
          toast.success("Repayment confirmed on-chain!", {
            id: toastId,
            description: `Tx: ${res.transactionHash.slice(0, 10)}... (Block #${res.blockNumber})`,
            action: {
              label: "Explorer",
              onClick: () => window.open(`${explorerBase}/tx/${res.transactionHash}`, "_blank"),
            },
          })
        } else {
          toast.error(`Repayment failed: ${res.error}`, { id: toastId })
        }
      } else {
        // Relay via backend API
        const response = await apiInstance.post("/pawnshop/repayment/process", {
          tokenId: loanId,
          amountCTC: parseFloat(amountCTC),
        })

        if (response.data?.success) {
          const txHash = response.data.data?.transactionHash
          setCompletedTxHash(txHash || null)
          setPaymentComplete(true)
          toast.success("Repayment processed on Creditcoin 3!", {
            id: toastId,
            description: txHash ? `Tx: ${txHash.slice(0, 10)}...` : "Confirmed on-chain",
          })
        } else {
          toast.error(response.data?.error || "Failed to process repayment", { id: toastId })
        }
      }
    } catch (err: any) {
      console.error("Repayment error:", err)
      toast.error(err.response?.data?.error || err.message || "Failed to process repayment", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Repayment Channel Selector */}
      <Tabs value={repayChannel} onValueChange={(v) => setRepayChannel(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-black/5">
          <TabsTrigger value="sepolia" className="rounded-xl flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            Cross-Chain Sepolia (Attestcoin)
          </TabsTrigger>
          <TabsTrigger value="cc3" className="rounded-xl flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Native Creditcoin CC3
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sepolia" className="pt-4">
          <CrossChainRepayCard />
        </TabsContent>

        <TabsContent value="cc3" className="pt-4 space-y-6">
          {paymentComplete ? (
            <Card className={glass}>
              <CardContent className="p-8">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-700" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-display text-xl font-bold text-[#171414]">Repayment Confirmed!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your repayment of {amountCTC} tCTC for SAG #{loanId} has been settled on Creditcoin 3.
                    </p>
                  </div>
                  <div className="w-full max-w-sm rounded-2xl border border-[#171414]/10 bg-white/50 p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Loan Note</span>
                      <span className="font-mono text-sm font-bold text-[#171414]">SAG #{loanId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount Paid</span>
                      <span className="font-mono text-sm font-bold text-emerald-700">{amountCTC} tCTC</span>
                    </div>
                    {completedTxHash && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Transaction</span>
                        <a
                          href={`${explorerBase}/tx/${completedTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-primary underline flex items-center gap-1 hover:text-primary/80"
                        >
                          {completedTxHash.slice(0, 10)}...{completedTxHash.slice(-8)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {completedBlock && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Block Number</span>
                        <span className="font-mono text-xs text-[#171414]">#{completedBlock}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Collateral Status</span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        Repaid & Unlocked
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full font-bold"
                    onClick={() => {
                      setPaymentComplete(false)
                      setAmountCTC("5.0")
                      setCompletedTxHash(null)
                    }}
                  >
                    Make Another Repayment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Loan Selection */}
              <div className="space-y-2">
                <Label>Select Active Loan</Label>
                <Select value={loanId} onValueChange={setLoanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a loan to repay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">SAG #1 — 50.5g 22K Gold Note (5.0 tCTC Principal)</SelectItem>
                    <SelectItem value="2">SAG #2 — 100.0g 24K Gold Note (10.0 tCTC Principal)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select an active loan funded on Creditcoin CC3. Repayment is settled in native CTC against SanadLiquidityPool.sol.
                </p>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount-ctc">Repayment Amount (CTC)</Label>
                <div className="relative">
                  <Input
                    id="amount-ctc"
                    type="number"
                    placeholder="5.0"
                    value={amountCTC}
                    onChange={(e) => setAmountCTC(e.target.value)}
                    min="0"
                    step="0.1"
                    className="pr-16 font-mono text-base"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted-foreground">
                    tCTC
                  </span>
                </div>
                {hasInsufficientBalance && (
                  <p className="text-xs text-destructive">
                    Insufficient balance. You have {availableBalance.toFixed(4)} tCTC available.
                  </p>
                )}
              </div>

              {/* Wallet Info */}
              <Card className={glass}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4" />
                    Creditcoin CC3 Payer Wallet
                  </CardTitle>
                  <CardDescription>
                    {isConnected ? "Connected via Browser EVM Wallet" : "Using server-managed testnet wallet"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Available Balance</p>
                      <p className="font-mono text-sm font-bold text-[#171414]">
                        {availableBalance.toFixed(4)} tCTC
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        ≈ {formatUsd(ctcToUsd(availableBalance, usdRate))} USD
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Creditcoin 3 Testnet
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2.5">
                    <Shield className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground">
                      Direct same-chain settlement restores pool liquidity and releases physical gold collateral
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <Button
                onClick={handlePayment}
                className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black"
                disabled={!loanId || !amountCTC || parseFloat(amountCTC) <= 0 || hasInsufficientBalance || isProcessing}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Settling on Creditcoin 3...
                  </span>
                ) : (
                  `Repay ${amountCTC ? `${amountCTC} tCTC` : ""}`
                )}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
