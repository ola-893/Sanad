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

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface WalletData {
  address: string
  balanceCTC: string
  network: string
}

export function PaymentMethods() {
  const [loanId, setLoanId] = useState("")
  const [amountCTC, setAmountCTC] = useState("")
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

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
  const balance = wallet ? parseFloat(wallet.balanceCTC) || 0 : 0
  const { data: ctcPrice } = useCtcPrice()
  const usdRate = ctcPrice?.ctcUsd || 0.10
  const hasInsufficientBalance = amountCTC ? parseFloat(amountCTC) > balance : false

  const handlePayment = async () => {
    if (!loanId || !amountCTC || parseFloat(amountCTC) <= 0) {
      toast.error("Please select a loan and enter a valid amount")
      return
    }
    setIsProcessing(true)
    // Simulate on-chain repayment
    setTimeout(() => {
      setIsProcessing(false)
      setPaymentComplete(true)
      toast.success("Repayment submitted for on-chain verification")
    }, 2000)
  }

  if (paymentComplete) {
    return (
      <Card className={glass}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div className="text-center">
              <p className="font-display text-lg font-bold text-[#171414]">Repayment Submitted</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your CTC repayment has been submitted to the Creditcoin network for verification.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-[#171414]/10 bg-white/50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-[#171414]">{amountCTC} CTC</span>
                  <p className="font-mono text-[10px] text-muted-foreground">≈ {formatUsd(ctcToUsd(parseFloat(amountCTC) || 0, usdRate))} USD</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Network</span>
                <span className="text-sm text-[#171414]">Creditcoin 3 Testnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-[10px]">
                  Pending Verification
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setPaymentComplete(false)
                setAmountCTC("")
                setLoanId("")
              }}
            >
              Make Another Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Loan Selection */}
      <div className="space-y-2">
        <Label>Select Active Loan</Label>
        <Select value={loanId} onValueChange={setLoanId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a loan to repay" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="demo-loan-1">Gold Collateral Loan — SAG #1</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Select from your active loans funded on-chain. Repayment amount is denominated in CTC.
        </p>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <Label htmlFor="amount-ctc">Repayment Amount (CTC)</Label>
        <div className="relative">
          <Input
            id="amount-ctc"
            type="number"
            placeholder="0.00"
            value={amountCTC}
            onChange={(e) => setAmountCTC(e.target.value)}
            min="0"
            step="0.01"
            className="pr-16 font-mono"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted-foreground">
            CTC
          </span>
        </div>
        {hasInsufficientBalance && (
          <p className="text-xs text-destructive">
            Insufficient balance. You have {balance.toFixed(4)} CTC available.
          </p>
        )}
      </div>

      {/* Wallet Info */}
      <Card className={glass}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            Creditcoin Wallet
          </CardTitle>
          <CardDescription>Repayment will be sent from your connected wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Balance</p>
              <p className="font-mono text-sm font-bold text-[#171414]">
                {balance.toFixed(4)} CTC
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                ≈ {formatUsd(ctcToUsd(balance, usdRate))} USD
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">
              {wallet?.network || "CC3 Testnet"}
            </Badge>
          </div>

          {wallet?.address && (
            <div className="flex items-center gap-2 rounded-xl border border-[#171414]/10 bg-white/50 px-3 py-2">
              <p className="flex-1 truncate font-mono text-xs text-muted-foreground">{wallet.address}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  navigator.clipboard.writeText(wallet.address)
                  toast.success("Address copied")
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <a
                href={`${process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"}/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2.5">
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">
              Payments are verified on-chain via the Repayment Gateway contract
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
            Submitting to Network...
          </span>
        ) : (
          `Repay ${amountCTC ? `${amountCTC} CTC` : ""}`
        )}
      </Button>
    </div>
  )
}
