'use client';

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Wallet, RefreshCw, Copy, ExternalLink, ArrowUpRight, ArrowDownLeft, Shield, Activity, Wifi } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { toast } from "sonner"

import Link from "next/link"
import { useInvestorNfts } from "@/hooks/use-investor-nfts"
import { useCreditcoinStatus } from "@/hooks/use-creditcoin-status"
import { useCtcPrice, ctcToUsd, formatUsd } from "@/hooks/use-ctc-price"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface WalletData {
  address: string
  balanceCTC: string
  network: string
}

function CopyButton({ text }: { text: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={() => {
        navigator.clipboard.writeText(text)
        toast.success("Address copied")
      }}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function DashboardWalletPage() {
  const queryClient = useQueryClient()
  const { data: nfts = [] } = useInvestorNfts()
  const { data: networkStatus } = useCreditcoinStatus()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async (): Promise<{ success: boolean; data: WalletData }> => {
      const response = await apiInstance.get("/investor/wallet/balance")
      return response.data
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const wallet = data?.data
  const balance = wallet ? parseFloat(wallet.balanceCTC) || 0 : 0
  const address = wallet?.address || ""
  const network = wallet?.network || "Creditcoin 3 Testnet"
  const { data: ctcPrice } = useCtcPrice()
  const usdRate = ctcPrice?.ctcUsd || 0.10
  const explorerBase = process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"
  const subscanBase = process.env.NEXT_PUBLIC_SUBSCAN_URL || "https://creditcoin3-testnet.subscan.io"

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="kicker-gold">Wallet</p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
                Wallet Balance
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your Creditcoin (CTC) wallet balance and available funds
              </p>
            </div>
            <Button
              onClick={() => {
                refetch()
                toast.success("Balance refreshed")
              }}
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Hero Balance Card */}
          <Card className={`${glass} overflow-hidden`}>
            <div className="relative bg-gradient-to-br from-[#171414] via-[#2a2520] to-[#171414] p-8 md:p-10">
              <div className="absolute inset-0 bg-[url('/gold-pattern.svg')] opacity-5" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                    <Wallet className="h-4 w-4 text-white" />
                  </span>
                  <Badge variant="outline" className="border-white/20 bg-white/10 text-white font-mono text-[10px]">
                    {network}
                  </Badge>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                    Available Balance
                  </p>
                  <div className="mt-1 font-display text-5xl md:text-6xl font-extrabold tabular-nums text-white">
                    {isLoading ? "—" : balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                    <span className="ml-3 font-mono text-xl font-bold uppercase text-white/60">CTC</span>
                  </div>
                  <p className="mt-1 font-mono text-sm text-white/40">
                    ≈ {isLoading ? "—" : formatUsd(ctcToUsd(balance, usdRate))} USD
                  </p>
                </div>
                {address && (
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 max-w-lg">
                    <p className="flex-1 truncate font-mono text-xs text-white/80">{address}</p>
                    <CopyButton text={address} />
                    <a href={`${subscanBase}/account/${address}`} target="_blank" rel="noopener noreferrer" title="View on Subscan (Official)">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className={`${glass} cursor-pointer transition-all hover:bg-white/80`}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                  <ArrowDownLeft className="h-4 w-4 text-[#171414]" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#171414]">Receive CTC</p>
                  <p className="text-[10px] text-muted-foreground">Copy your wallet address</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (address) {
                      navigator.clipboard.writeText(address)
                      toast.success("Address copied", { description: "Share this address to receive CTC tokens" })
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
            <Card className={`${glass} opacity-60`}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                  <ArrowUpRight className="h-4 w-4 text-[#171414]" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#171414]">Send CTC</p>
                  <p className="text-[10px] text-muted-foreground">Transfer to another wallet</p>
                </div>
              </CardContent>
            </Card>
            <Link href="/dashboard/nfts" className="flex-1">
              <Card className={`${glass} cursor-pointer transition-all hover:bg-white/80 h-full`}>
                <CardContent className="flex items-center gap-3 p-4 h-full">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25 shrink-0">
                    <Shield className="h-4 w-4 text-[#171414]" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#171414]">NFT Collateral</p>
                    <p className="text-[10px] text-muted-foreground">{nfts.length} active</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Wallet Info Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className={glass}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                    <Activity className="h-4 w-4 text-[#171414]" />
                  </span>
                  <p className="font-display text-sm font-bold text-[#171414]">Network Details</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Chain</p>
                    <p className="text-sm font-medium text-[#171414]">{network}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Chain ID</p>
                    <p className="text-sm font-medium font-mono text-[#171414]">102031</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Network Status</p>
                    <div className="flex items-center gap-1.5">
                      <Wifi className={`h-3 w-3 ${networkStatus?.network?.isHealthy ? "text-success" : "text-destructive"}`} />
                      <Badge variant="outline" className={`text-[10px] ${networkStatus?.network?.isHealthy ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                        {networkStatus?.network?.isHealthy ? "Healthy" : "Offline"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Latest Block</p>
                    <p className="text-sm font-medium font-mono text-[#171414]">
                      #{networkStatus?.network?.blockNumber?.toLocaleString() || "—"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Gas Price</p>
                    <p className="text-sm font-medium font-mono text-[#171414]">
                      {networkStatus?.network?.gasPrice || "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={glass}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                    <Wallet className="h-4 w-4 text-[#171414]" />
                  </span>
                  <p className="font-display text-sm font-bold text-[#171414]">Wallet Security</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Key Storage</p>
                    <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-[10px]">
                      Encrypted
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Wallet Type</p>
                    <p className="text-sm font-medium text-[#171414]">Server-managed EVM</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Collateral NFTs</p>
                    <p className="text-sm font-bold text-[#171414]">{nfts.length}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Explorer</p>
                    <div className="flex items-center gap-3">
                      <a
                        href={`${subscanBase}/account/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#171414] hover:underline"
                      >
                        Subscan <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href={`${explorerBase}/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:underline"
                      >
                        Blockscout <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
