'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  Coins,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useLiquidityPool } from '@/hooks/use-liquidity-pool'
import { useCreditcoinWallet } from '@/hooks/use-creditcoin-wallet'
import { SANAD_LIQUIDITY_POOL_ADDRESS } from '@/lib/contracts/sanad-liquidity-pool'
import { toast } from 'sonner'

import { CrossChainDepositCard } from './cross-chain-deposit-card'

const glass = 'glass-panel rounded-3xl border border-[#171414]/15 bg-white/70 shadow-soft-editorial'

export function LiquidityPoolManager() {
  const {
    totalLiquidity,
    userLpBalance,
    isLoading: poolLoading,
    isTransacting,
    depositLiquidity,
    withdrawLiquidity,
    fetchPoolData,
  } = useLiquidityPool()

  const {
    address,
    isConnected,
    isCreditcoin,
    balance: walletCtcBalance,
    switchOrAddCreditcoin,
    connect,
  } = useCreditcoinWallet()

  const [depositChannel, setDepositChannel] = useState<'cc3' | 'sepolia'>('cc3')
  const [depositAmount, setDepositAmount] = useState<string>('')
  const [withdrawAmount, setWithdrawAmount] = useState<string>('')
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')

  const explorerBase =
    process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || 'https://creditcoin-testnet.blockscout.com'

  const poolSharePercentage =
    Number(totalLiquidity) > 0
      ? ((Number(userLpBalance) / Number(totalLiquidity)) * 100).toFixed(2)
      : '0.00'

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error('Please enter a valid CTC deposit amount')
      return
    }

    if (Number(depositAmount) > Number(walletCtcBalance)) {
      toast.error(`Insufficient CTC balance (${walletCtcBalance} tCTC available)`)
      return
    }

    try {
      const res = await depositLiquidity(depositAmount)
      if (res.success && res.transactionHash) {
        setLastTxHash(res.transactionHash)
        setDepositAmount('')
        toast.success(
          `Successfully deposited ${depositAmount} tCTC into Sanad Liquidity Pool!`
        )
      } else {
        toast.error(res.error || 'Deposit failed')
      }
    } catch (err: any) {
      toast.error(err.message || 'Deposit transaction failed')
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      toast.error('Please enter a valid CTC withdrawal amount')
      return
    }

    if (Number(withdrawAmount) > Number(userLpBalance)) {
      toast.error(`Cannot withdraw more than your stake (${userLpBalance} tCTC)`)
      return
    }

    try {
      const res = await withdrawLiquidity(withdrawAmount)
      if (res.success && res.transactionHash) {
        setLastTxHash(res.transactionHash)
        setWithdrawAmount('')
        toast.success(
          `Successfully reclaimed ${withdrawAmount} tCTC from Sanad Liquidity Pool!`
        )
      } else {
        toast.error(res.error || 'Withdrawal failed')
      }
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal transaction failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Pool Header & Overall Stats */}
      <Card className={glass}>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/25">
                <Coins className="h-6 w-6 text-[#171414]" />
              </div>
              <div>
                <p className="kicker-gold">Creditcoin CC3 & Sepolia</p>
                <CardTitle className="font-display text-2xl font-bold text-[#171414]">
                  Sanad Liquidity Pool Manager
                </CardTitle>
                <CardDescription className="text-xs text-[#4A4A4A]">
                  Supply capital to finance asset-backed gold collateral loans and earn halal Ujrah yield
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchPoolData}
              disabled={poolLoading}
              className="rounded-full border-[#171414]/15 hover:bg-[#171414]/5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${poolLoading ? 'animate-spin' : ''}`} />
              Refresh On-Chain State
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#FAFAF8] border border-[#171414]/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#4A4A4A]">
                Total Pool Liquidity
              </p>
              <p className="font-mono text-2xl font-extrabold text-[#171414] mt-1 tabular-nums">
                {Number(totalLiquidity).toFixed(2)} <span className="text-sm font-semibold text-[#4A4A4A]">tCTC</span>
              </p>
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                <TrendingUp className="h-3 w-3" /> 100% Backed by Physical Gold Collateral
              </p>
            </div>

            <div className="rounded-2xl bg-[#FAFAF8] border border-[#171414]/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#4A4A4A]">
                Your Active LP Stake
              </p>
              <p className="font-mono text-2xl font-extrabold text-primary mt-1 tabular-nums">
                {Number(userLpBalance).toFixed(2)} <span className="text-sm font-semibold text-[#4A4A4A]">tCTC</span>
              </p>
              <p className="text-[11px] text-[#4A4A4A] mt-1">
                Pool Share: <strong className="text-[#171414]">{poolSharePercentage}%</strong>
              </p>
            </div>

            <div className="rounded-2xl bg-[#FAFAF8] border border-[#171414]/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#4A4A4A]">
                Target Halal APY
              </p>
              <p className="font-mono text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">
                8.40% <span className="text-xs font-normal text-[#4A4A4A]">Ujrah</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" /> AAOIFI Shariah-Compliant
              </p>
            </div>
          </div>

          {/* Deposit Channel Selector: Native CC3 vs Cross-Chain Sepolia */}
          <Tabs value={depositChannel} onValueChange={(v) => setDepositChannel(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-black/5">
              <TabsTrigger value="cc3" className="rounded-xl flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Native Creditcoin CC3 Pool
              </TabsTrigger>
              <TabsTrigger value="sepolia" className="rounded-xl flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Cross-Chain Sepolia Deposit (Attestcoin)
              </TabsTrigger>
            </TabsList>

            {/* CHANNEL 1: NATIVE CC3 POOL */}
            <TabsContent value="cc3" className="pt-4">
              {!isConnected ? (
                <div className="rounded-2xl border border-dashed border-[#171414]/20 p-6 text-center">
                  <Coins className="h-8 w-8 text-[#171414]/40 mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#171414]">Connect EVM Wallet to Deposit CTC</p>
                  <p className="text-xs text-[#4A4A4A] mt-1 mb-4">
                    Your wallet will be connected to Creditcoin 3 Testnet (Chain ID: 102031).
                  </p>
                  <Button
                    onClick={connect}
                    className="rounded-full bg-[#171414] text-white hover:bg-[#171414]/90 px-6"
                  >
                    Connect Wallet
                  </Button>
                </div>
              ) : !isCreditcoin ? (
                <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5 text-center">
                  <AlertCircle className="h-5 w-5 text-warning mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#171414]">Wrong Network Connected</p>
                  <p className="text-xs text-[#4A4A4A] mt-1 mb-4">
                    Sanad Liquidity Pool operates natively on Creditcoin 3 Testnet. Please switch networks in MetaMask.
                  </p>
                  <Button
                    onClick={switchOrAddCreditcoin}
                    className="rounded-full bg-[#171414] text-white hover:bg-[#171414]/90 px-6"
                  >
                    Switch to Creditcoin CC3
                  </Button>
                </div>
              ) : (
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as 'deposit' | 'withdraw')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-[#F5F5F3] p-1 border border-[#171414]/5">
                    <TabsTrigger
                      value="deposit"
                      className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#171414] data-[state=active]:shadow-sm font-medium text-xs py-2.5"
                    >
                      <ArrowDownLeft className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      Deposit Liquidity (Supply CTC)
                    </TabsTrigger>
                    <TabsTrigger
                      value="withdraw"
                      className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#171414] data-[state=active]:shadow-sm font-medium text-xs py-2.5"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                      Withdraw Stake (Reclaim CTC)
                    </TabsTrigger>
                  </TabsList>

                  {/* DEPOSIT TAB */}
                  <TabsContent value="deposit" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#4A4A4A]">
                        <span>Amount to Deposit</span>
                        <span>Available: <strong className="text-[#171414]">{walletCtcBalance} tCTC</strong></span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          disabled={isTransacting}
                          className="rounded-2xl border-[#171414]/15 bg-white pl-4 pr-16 py-6 font-mono text-lg text-[#171414]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-[#4A4A4A]">
                          tCTC
                        </span>
                      </div>

                      {/* Preset amount buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {['1', '5', '10', '25'].map((amt) => (
                          <Button
                            key={amt}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDepositAmount(amt)}
                            disabled={isTransacting}
                            className="rounded-xl border-[#171414]/10 text-[11px] h-7 px-2.5 hover:bg-[#171414]/5"
                          >
                            +{amt} CTC
                          </Button>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const max = Math.max(0, Number(walletCtcBalance) - 0.05).toFixed(4)
                            setDepositAmount(max)
                          }}
                          disabled={isTransacting}
                          className="rounded-xl border-[#171414]/10 text-[11px] h-7 px-2.5 hover:bg-[#171414]/5 ml-auto text-primary font-bold"
                        >
                          Max
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#FAFAF8] border border-[#171414]/5 p-3.5 space-y-1.5 text-xs text-[#4A4A4A]">
                      <div className="flex justify-between">
                        <span>Transaction Type:</span>
                        <span className="font-medium text-[#171414]">Direct Payable (No ERC-20 Approval needed)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target Contract:</span>
                        <span className="font-mono text-[#171414]">SanadLiquidityPool ({SANAD_LIQUIDITY_POOL_ADDRESS.slice(0, 8)}...{SANAD_LIQUIDITY_POOL_ADDRESS.slice(-6)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shariah Governance:</span>
                        <span className="text-emerald-700 font-medium">Mudarabah Capital Pool · Ujrah Revenue Distribution</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleDeposit}
                      disabled={isTransacting || !depositAmount || Number(depositAmount) <= 0}
                      className="w-full rounded-2xl bg-[#171414] text-white hover:bg-[#171414]/90 py-6 text-sm font-bold shadow-md"
                    >
                      {isTransacting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Broadcasting to Creditcoin CC3...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 text-[#E1BAC2]" />
                          Deposit {depositAmount ? `${depositAmount} tCTC` : 'Liquidity'}
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  {/* WITHDRAW TAB */}
                  <TabsContent value="withdraw" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#4A4A4A]">
                        <span>Amount to Withdraw</span>
                        <span>Your Stake: <strong className="text-[#171414]">{userLpBalance} tCTC</strong></span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          disabled={isTransacting}
                          className="rounded-2xl border-[#171414]/15 bg-white pl-4 pr-16 py-6 font-mono text-lg text-[#171414]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-[#4A4A4A]">
                          tCTC
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {['25%', '50%', '75%', '100%'].map((pct) => (
                          <Button
                            key={pct}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const factor = parseInt(pct) / 100
                              const val = (Number(userLpBalance) * factor).toFixed(4)
                              setWithdrawAmount(val)
                            }}
                            disabled={isTransacting || Number(userLpBalance) <= 0}
                            className="rounded-xl border-[#171414]/10 text-[11px] h-7 px-2.5 hover:bg-[#171414]/5"
                          >
                            {pct}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleWithdraw}
                      disabled={isTransacting || !withdrawAmount || Number(withdrawAmount) <= 0}
                      variant="outline"
                      className="w-full rounded-2xl border-[#171414]/20 py-6 text-sm font-bold hover:bg-[#171414]/5 text-[#171414]"
                    >
                      {isTransacting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Processing Withdrawal on CC3...
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          Withdraw {withdrawAmount ? `${withdrawAmount} tCTC` : 'Stake'}
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              )}
            </TabsContent>

            {/* CHANNEL 2: CROSS-CHAIN SEPOLIA DEPOSIT */}
            <TabsContent value="sepolia" className="pt-4">
              <CrossChainDepositCard onSuccess={fetchPoolData} />
            </TabsContent>
          </Tabs>

          {/* Live Transaction Settlement Feedback */}
          {lastTxHash && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-900">
                  Transaction Settled on Creditcoin CC3 Testnet
                </p>
                <p className="font-mono text-[11px] text-emerald-800 truncate mt-0.5">
                  Tx: {lastTxHash}
                </p>
                <a
                  href={`${explorerBase}/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline mt-1.5"
                >
                  View on Blockscout Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
