"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, RefreshCw, ArrowDownLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { toast } from "sonner"
import { useCtcPrice, ctcToUsd, formatUsd } from "@/hooks/use-ctc-price"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface WalletData {
  address: string
  balanceCTC: string
  network: string
}

interface WalletBalanceResponse {
  success: boolean
  data: WalletData
}

function explorerHref(wallet: WalletData): string {
  const isMainnet = (wallet.network ?? "").toLowerCase().includes("mainnet")
  const base = isMainnet
    ? "https://creditcoin.subscan.io/account"
    : `${process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || 'https://creditcoin-testnet.blockscout.com'}/address`
  return `${base}/${wallet.address}`
}

function WalletCardShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className={glass}>
      <CardHeader>
        <p className="kicker-gold">Wallet</p>
        <CardTitle className="flex items-center gap-2 font-display">
          <Wallet className="h-5 w-5" />
          CTC Wallet Balance
        </CardTitle>
        <CardDescription>Your Creditcoin wallet linked to this account</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function WalletBalance() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async (): Promise<WalletBalanceResponse> => {
      const response = await apiInstance.get('/investor/wallet/balance')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on every page navigation
    retry: 1,
  })

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <WalletCardShell>
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-[#171414]" />
          <span className="ml-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Loading balance...
          </span>
        </div>
      </WalletCardShell>
    )
  }

  if (error) {
    return (
      <WalletCardShell>
        <div className="p-8 text-center">
          <p className="text-sm text-destructive">Failed to load wallet data</p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4 rounded-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </WalletCardShell>
    )
  }

  if (!data?.data) {
    return (
      <WalletCardShell>
        <div className="p-8 text-center text-muted-foreground">
          <p>No wallet data available</p>
        </div>
      </WalletCardShell>
    )
  }

  const wallet = data.data
  const parsed = parseFloat(wallet.balanceCTC)
  const balance = Number.isFinite(parsed) ? parsed : 0
  const { data: ctcPrice } = useCtcPrice()
  const usdRate = ctcPrice?.ctcUsd || 0.10

  return (
    <Card className={glass}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker-gold">Wallet</p>
            <CardTitle className="mt-1 flex items-center gap-2 font-display">
              <Wallet className="h-5 w-5" />
              CTC Wallet Balance
            </CardTitle>
            <CardDescription>Your Creditcoin wallet linked to this account</CardDescription>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="rounded-full" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-3xl border border-[#171414]/10 bg-white/50 py-8 text-center">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Available Balance
          </p>
          <div className="mb-2 font-display text-5xl font-extrabold tabular-nums tracking-tight text-[#171414]">
            {balance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
            <span className="ml-2 font-mono text-xl font-bold uppercase text-muted-foreground">CTC</span>
          </div>
          <p className="mb-4 font-mono text-sm text-muted-foreground">
            ≈ {formatUsd(ctcToUsd(balance, usdRate))} USD
          </p>
          <p className="mb-2 truncate px-6 font-mono text-xs text-muted-foreground">{wallet.address}</p>
          <Link
            href={explorerHref(wallet)}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-[#171414] hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View on Creditcoin Explorer ({wallet.network || "Testnet"})
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-4 text-center">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Network
            </p>
            <p className="font-display text-lg font-semibold capitalize">{wallet.network || "—"}</p>
          </div>
          <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-4 text-center">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Total Transactions
            </p>
            <p className="font-display text-lg font-semibold">—</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-full"
            onClick={() => {
              if (wallet.address) {
                navigator.clipboard.writeText(wallet.address)
                toast.success("Wallet address copied", { description: "Share this address to receive CTC tokens" })
              }
            }}
          >
            <ArrowDownLeft className="mr-2 h-4 w-4" />
            Receive CTC
          </Button>
          <Button variant="outline" className="flex-1 rounded-full" disabled>
            <ExternalLink className="mr-2 h-4 w-4" />
            Send CTC
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
