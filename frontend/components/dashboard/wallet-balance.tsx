"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, RefreshCw, ArrowUpRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { TopUpDialog } from "@/components/dashboard/topup-dialog"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface WalletBalanceResponse {
  success: boolean
  data: {
    balance: string
  }
}

function WalletCardShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className={glass}>
      <CardHeader>
        <p className="kicker-gold">Wallet</p>
        <CardTitle className="flex items-center gap-2 font-display">
          <Wallet className="h-5 w-5" />
          MYR Stable Coin Balance
        </CardTitle>
        <CardDescription>Your wallet balance and available funds</CardDescription>
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
    staleTime: 30 * 1000, // 30 seconds - refresh more frequently for balance
    refetchOnWindowFocus: true,
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

  const parsed = parseFloat(data.data.balance)
  const balance = Number.isFinite(parsed) ? parsed : 0

  return (
    <Card className={glass}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker-gold">Wallet</p>
            <CardTitle className="mt-1 flex items-center gap-2 font-display">
              <Wallet className="h-5 w-5" />
              MYR Stable Coin Balance
            </CardTitle>
            <CardDescription>Your wallet balance and available funds</CardDescription>
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
          <div className="mb-4 font-display text-5xl font-extrabold tabular-nums tracking-tight text-[#171414]">
            {balance.toLocaleString('en-MY', {
              style: 'currency',
              currency: 'MYR'
            })}
          </div>
          <Link
            href="https://creditcoin-testnet.blockscout.com"
            target="_blank"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-[#171414] hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View on Creditcoin Explorer
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-4 text-center">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              This Month
            </p>
            <p className="font-display text-lg font-semibold">-</p>
          </div>
          <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-4 text-center">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Total Transactions
            </p>
            <p className="font-display text-lg font-semibold">-</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <div className="flex-1">
            <TopUpDialog />
          </div>
          <Button variant="outline" className="flex-1 rounded-full">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Send MYR
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
