"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  WalletIcon,
  TrendingUpIcon,
  DollarSignIcon,
  ClockIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"
import { InvestorPageLayout } from "@/components/investor/page-layout"
import { InvestorPageHeader } from "@/components/investor/page-header"
import { investorStyles } from "@/components/investor/styles"
import { useCreditcoinWallet } from "@/hooks/use-creditcoin-wallet"
import { useLiquidityPool } from "@/hooks/use-liquidity-pool"
import { toast } from "sonner"

export default function InvestorDashboard() {
  const { address, balance, isConnected, isConnecting, connectWallet } = useCreditcoinWallet()
  const {
    totalLiquidity,
    userLpBalance,
    isLoading: poolLoading,
    isTransacting,
    depositLiquidity,
    withdrawLiquidity,
    fetchPoolData,
  } = useLiquidityPool()

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")

  const explorerBase = process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Please enter a valid CTC deposit amount")
      return
    }
    if (parseFloat(depositAmount) > parseFloat(balance)) {
      toast.error("Insufficient CTC balance in your connected wallet")
      return
    }

    const toastId = toast.loading(`Broadcasting deposit of ${depositAmount} tCTC to SanadLiquidityPool...`)
    const result = await depositLiquidity(depositAmount)

    if (result.success) {
      toast.success(`Deposited ${depositAmount} tCTC into pool!`, {
        id: toastId,
        description: `Tx: ${result.transactionHash?.slice(0, 10)}... (Block #${result.blockNumber})`,
        action: {
          label: "Explorer",
          onClick: () => window.open(`${explorerBase}/tx/${result.transactionHash}`, "_blank"),
        },
      })
      setShowDepositModal(false)
      setDepositAmount("")
    } else {
      toast.error(`Deposit failed: ${result.error}`, { id: toastId })
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Please enter a valid CTC withdrawal amount")
      return
    }
    if (parseFloat(withdrawAmount) > parseFloat(userLpBalance)) {
      toast.error("Withdrawal amount exceeds your current LP balance")
      return
    }

    const toastId = toast.loading(`Broadcasting withdrawal of ${withdrawAmount} tCTC from pool...`)
    const result = await withdrawLiquidity(withdrawAmount)

    if (result.success) {
      toast.success(`Withdrawn ${withdrawAmount} tCTC from pool!`, {
        id: toastId,
        description: `Tx: ${result.transactionHash?.slice(0, 10)}... (Block #${result.blockNumber})`,
        action: {
          label: "Explorer",
          onClick: () => window.open(`${explorerBase}/tx/${result.transactionHash}`, "_blank"),
        },
      })
      setShowWithdrawModal(false)
      setWithdrawAmount("")
    } else {
      toast.error(`Withdrawal failed: ${result.error}`, { id: toastId })
    }
  }

  const sagInvestments = [
    {
      id: "1",
      duration: "6 Months",
      annualReturn: "6.0%",
      subscribed: 100,
      expectedROI: "6.0% p.a. Ujrah Yield",
      minInvestment: "Direct via Pool",
      totalValue: "10.0 tCTC",
      status: "Active Pledged",
    },
    {
      id: "2",
      duration: "12 Months",
      annualReturn: "7.5%",
      subscribed: 65,
      expectedROI: "7.5% p.a. Ujrah Yield",
      minInvestment: "Direct via Pool",
      totalValue: "25.0 tCTC",
      status: "Active Pledged",
    },
  ]

  return (
    <InvestorPageLayout>
      <InvestorPageHeader
        title="Investor Liquidity Dashboard"
        description="Manage your native CTC liquidity pool positions and Shariah-compliant gold financing yield on Creditcoin 3"
      />

      {/* Main Pool & Wallet Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        {/* Shariah Liquidity Pool Card */}
        <Card className="glass-panel border border-[#171414]/15 bg-white/70 col-span-1 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold font-display flex items-center gap-2">
                <DollarSignIcon className="h-5 w-5 text-emerald-600" />
                Sanad Liquidity Pool (Native CTC)
              </CardTitle>
              <CardDescription>
                Creditcoin CC3 Smart Contract: <span className="font-mono text-xs text-primary">0xC2f92D80...f45B</span>
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPoolData}
              disabled={poolLoading}
              className="rounded-full"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${poolLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/20 border">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Total Pool Liquidity</p>
                <div className="mt-1 font-display text-3xl font-extrabold text-[#171414]">
                  {poolLoading ? "—" : parseFloat(totalLiquidity).toFixed(2)}
                  <span className="ml-2 text-sm font-mono font-bold text-muted-foreground">tCTC</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Global financing capital pool</p>
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Your LP Balance</p>
                <div className="mt-1 font-display text-3xl font-extrabold text-emerald-700">
                  {poolLoading ? "—" : parseFloat(userLpBalance).toFixed(2)}
                  <span className="ml-2 text-sm font-mono font-bold text-muted-foreground">tCTC</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Your pro-rata earning share</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowDepositModal(true)}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                disabled={!isConnected || isTransacting}
              >
                <ArrowDownLeft className="h-4 w-4 mr-2" />
                Deposit CTC into Pool
              </Button>

              <Button
                onClick={() => setShowWithdrawModal(true)}
                variant="outline"
                className="flex-1 border-emerald-700/30 text-emerald-800 hover:bg-emerald-50 font-bold"
                disabled={!isConnected || parseFloat(userLpBalance) <= 0 || isTransacting}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Withdraw CTC from Pool
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Connection Card */}
        <Card className="glass-panel border border-[#171414]/15 bg-white/70">
          <CardHeader>
            <CardTitle className="text-lg font-bold font-display flex items-center gap-2">
              <WalletIcon className="h-5 w-5 text-primary" />
              Creditcoin CC3 Wallet
            </CardTitle>
            <CardDescription>EVM Layer on Chain ID 102031</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected && address ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-emerald-900">Connected to CC3 Testnet</span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Connected Address:</p>
                  <a
                    href={`${explorerBase}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs bg-muted/40 p-2 rounded-lg block text-primary hover:underline truncate mt-1"
                  >
                    {address}
                  </a>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Wallet Available Balance:</p>
                  <p className="font-semibold text-xl text-primary font-mono">{balance} tCTC</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 py-2">
                <div className="w-12 h-12 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
                  <WalletIcon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect your MetaMask or Rabby wallet configured for Creditcoin 3 Testnet.
                </p>
              </div>
            )}

            <Button
              onClick={connectWallet}
              className={`w-full ${investorStyles.button.primary}`}
              disabled={isConnected || isConnecting}
            >
              {isConnecting ? "Connecting..." : isConnected ? "Wallet Connected" : "Connect MetaMask (CC3)"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SAG Opportunities */}
      <Card className={`${investorStyles.card.base} mb-6`}>
        <CardHeader>
          <CardTitle className={investorStyles.text.cardTitle}>Underlying Gold Collateral Assets (SAG Notes)</CardTitle>
          <CardDescription>
            Loans backed by physical gold vault custody receipts automatically funded from the pool
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {sagInvestments.map((sag) => (
              <div key={sag.id} className="p-4 rounded-2xl border bg-white/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground font-display">SAG Collateral #{sag.id}</h4>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                    {sag.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Principal Disbursed:</span>
                    <p className="font-semibold font-mono">{sag.totalValue}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shariah Custody Yield:</span>
                    <p className="font-semibold text-emerald-700">{sag.expectedROI}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Pool Allocation</span>
                    <span className="font-medium">{sag.subscribed}%</span>
                  </div>
                  <Progress value={sag.subscribed} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deposit CTC into Sanad Liquidity Pool</DialogTitle>
            <DialogDescription>
              Calls <code className="font-mono text-xs">depositLiquidity()</code> (payable native CTC) on Creditcoin CC3.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/20 border rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wallet Balance:</span>
                <span className="font-mono font-bold">{balance} tCTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Pool Liquidity:</span>
                <span className="font-mono font-bold">{parseFloat(totalLiquidity).toFixed(2)} tCTC</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-amount">Amount to Deposit (CTC)</Label>
              <div className="relative">
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="1.0"
                  step="0.1"
                  min="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="pr-16 font-mono text-base"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                  tCTC
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositModal(false)} disabled={isTransacting}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              onClick={handleDeposit}
              disabled={isTransacting || !depositAmount || parseFloat(depositAmount) <= 0}
            >
              {isTransacting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming on CC3...
                </>
              ) : (
                `Deposit ${depositAmount ? `${depositAmount} tCTC` : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw CTC from Liquidity Pool</DialogTitle>
            <DialogDescription>
              Calls <code className="font-mono text-xs">withdrawLiquidity(amount)</code> on Creditcoin CC3.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/20 border rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Available LP Balance:</span>
                <span className="font-mono font-bold text-emerald-700">{parseFloat(userLpBalance).toFixed(2)} tCTC</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount to Withdraw (CTC)</Label>
              <div className="relative">
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="1.0"
                  step="0.1"
                  min="0.01"
                  max={userLpBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pr-16 font-mono text-base"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                  tCTC
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawModal(false)} disabled={isTransacting}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              onClick={handleWithdraw}
              disabled={isTransacting || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
            >
              {isTransacting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming on CC3...
                </>
              ) : (
                `Withdraw ${withdrawAmount ? `${withdrawAmount} tCTC` : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InvestorPageLayout>
  )
}
