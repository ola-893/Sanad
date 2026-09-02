"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Copy,
  Check,
  ExternalLink,
  WalletIcon,
  RefreshCw,
  Shield,
  Gem,
  Droplets,
} from "lucide-react"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { toast } from "sonner"
import { SEPOLIA_EXPLORER_URL } from "@/lib/contracts/sepolia-gateways"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

export default function WalletPage() {
  const { walletAddress, isConnected, balance: walletBalance, chainId, refreshBalance } = useWalletAuth()
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ethPrice, setEthPrice] = useState(0)

  const ethBalance = walletBalance || "0.000000"
  const ethUsd = ethPrice > 0 ? Number(ethBalance) * ethPrice : 0

  const { data: ctcData, isLoading: ctcLoading } = useQuery({
    queryKey: ["wallet-ctc-balance"],
    queryFn: async () => {
      const { data } = await apiInstance.get("/investor/wallet/balance")
      return data?.data
    },
    retry: 1,
  })

  const fetchBalance = async () => {
    if (!walletAddress) return
    setIsLoading(true)
    try {
      await refreshBalance()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
    const fetchEthPrice = () => {
      apiInstance.get("/eth-price")
        .then((res) => setEthPrice(res.data?.data?.usd || 0))
        .catch(() => setEthPrice(0))
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
  }, [walletAddress])

  const handleCopy = async () => {
    if (!walletAddress) return
    await navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    toast.success("Address copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isConnected || !walletAddress) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-3xl">
          <p className="kicker-gold">Wallet</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171414] mt-1">My Wallet</h1>
          <div className="glass-panel rounded-2xl border border-[#171414]/10 p-8 text-center shadow-soft-editorial mt-6">
            <WalletIcon className="h-10 w-10 text-[#E1BAC2] mx-auto mb-3" />
            <p className="font-display text-lg font-bold text-[#171414]">No Wallet Connected</p>
            <p className="text-sm text-[#4A4A4A] mt-1">
              <a href="/login" className="underline font-medium text-[#171414]">Log in with MetaMask</a> to view your wallet
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="kicker-gold">Wallet</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171414] mt-1">My Wallet</h1>
          </div>
          <Button onClick={fetchBalance} disabled={isLoading} variant="outline"
            className="rounded-full border-[#171414]/15 text-[#171414] hover:bg-[#171414]/5 self-start">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Address Bar */}
        <Card className={`${glass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171414]/5 shrink-0">
                <WalletIcon className="h-5 w-5 text-[#171414]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-bold text-[#171414] truncate">{walletAddress}</p>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0">Connected</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Ethereum Sepolia</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleCopy}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#171414]/10 hover:bg-[#171414]/5 transition"
                title="Copy address"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-[#171414]" />}
              </button>
              <a
                href={`${SEPOLIA_EXPLORER_URL}/address/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#171414]/10 hover:bg-[#171414]/5 transition"
                title="View on Etherscan"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#171414]" />
              </a>
            </div>
          </div>
        </Card>

        {/* Balances */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {/* ETH Balance */}
          <Card className={`${glass} p-5`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171414]/5">
                <WalletIcon className="h-5 w-5 text-[#171414]" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">ETH Balance</p>
                <p className="text-[10px] text-muted-foreground">Sepolia Testnet</p>
              </div>
            </div>
            <p className="text-4xl font-extrabold tabular-nums text-[#171414]">{ethBalance}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {ethPrice > 0 ? `≈ $${ethUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @ $${ethPrice.toLocaleString()}/ETH` : "Loading price..."}
            </p>
          </Card>

          {/* CTC Balance */}
          <Card className={`${glass} p-5`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Gem className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">CTC Balance</p>
                <p className="text-[10px] text-muted-foreground">Creditcoin CC3</p>
              </div>
            </div>
            {ctcLoading ? (
              <div className="flex items-center gap-2 py-2">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <>
                <p className="text-4xl font-extrabold tabular-nums text-[#171414]">{ctcData?.balanceCTC || "0.0000"}</p>
                {ctcData?.address && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"}/address/${ctcData.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[10px] text-muted-foreground hover:text-[#171414] hover:underline"
                  >
                    View on Blockscout <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Link href="/dashboard/browse" className="group">
            <Card className={`${glass} transition-all duration-300 hover:shadow-lg hover:border-[#171414]/25 overflow-hidden`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 group-hover:from-amber-200 group-hover:to-amber-100 transition-all">
                    <Gem className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#171414]">Browse SAGs</p>
                    <p className="text-[10px] text-muted-foreground">Invest in gold-backed tokens</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[#171414] transition" />
              </CardContent>
            </Card>
          </Link>

          <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="group">
            <Card className={`${glass} transition-all duration-300 hover:shadow-lg hover:border-[#171414]/25 overflow-hidden`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 group-hover:from-blue-200 group-hover:to-blue-100 transition-all">
                    <Droplets className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#171414]">Get Testnet ETH</p>
                    <p className="text-[10px] text-muted-foreground">Free Sepolia ETH from faucet</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[#171414] transition" />
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Security Tip */}
        <div className="flex items-start gap-3 rounded-2xl border border-[#E1BAC2]/30 bg-[#E1BAC2]/[0.04] p-4">
          <Shield className="h-4 w-4 text-[#E1BAC2] mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-[#171414]">Wallet Security:</span> Your wallet is your identity on Sanad. Never share your private keys or seed phrase.
          </p>
        </div>
      </div>
    </div>
  )
}
