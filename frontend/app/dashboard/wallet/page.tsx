"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Copy,
  Check,
  ExternalLink,
  WalletIcon,
  RefreshCw,
  Shield,
} from "lucide-react"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { useQuery } from "@tanstack/react-query"
import { getETHBalance as fetchETHBalance } from "@/lib/web3"
import apiInstance from "@/lib/axios-v1"
import { toast } from "sonner"



export default function WalletPage() {
  const { walletAddress, isConnected, balance: walletBalance, chainId, refreshBalance, truncateAddress } = useWalletAuth()
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const ethBalance = walletBalance || "0.000000"
  const networkName = chainId === 11155111 ? "ETH Sepolia Testnet"
    : chainId === 1 ? "Ethereum Mainnet"
    : chainId === 102031 ? "Creditcoin CC3"
    : "ETH Sepolia Testnet"

  // Fetch CTC balance from backend (Creditcoin CC3)
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

  useEffect(() => { fetchBalance() }, [walletAddress])

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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171414] mt-1">Wallet</h1>
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

        {/* Address Card */}
        <div className="glass-panel rounded-2xl border border-[#171414]/10 p-5 sm:p-6 shadow-soft-editorial">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]/20">
              <WalletIcon className="h-5 w-5 text-[#E1BAC2]" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A]">Wallet Address</p>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] mt-1">Connected</Badge>
            </div>
          </div>
          <div className="bg-[#F5F5F3] rounded-xl border border-[#171414]/10 p-4">
            <p className="text-xs text-[#4A4A4A] mb-1">Your Address</p>
            <p className="font-mono text-sm sm:text-base font-bold text-[#171414] break-all">{walletAddress}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button onClick={handleCopy} variant="outline" className="flex-1 rounded-xl border-[#171414]/15 text-[#171414] hover:bg-[#171414]/5">
              {copied ? <Check className="h-4 w-4 mr-2 text-emerald-600" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy Address"}
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl border-[#171414]/15 text-[#171414] hover:bg-[#171414]/5"
              onClick={() => window.open(`https://sepolia.etherscan.io/address/${walletAddress}`, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" /> View on Etherscan
            </Button>
          </div>
        </div>

        {/* ETH Balance (Sepolia) */}
        <div className="glass-panel rounded-2xl border border-[#171414]/10 p-5 sm:p-6 shadow-soft-editorial">
          <div className="flex items-center justify-between mb-4">
            <p className="kicker-gold">ETH Balance</p>
            <Badge className="bg-[#E1BAC2]/20 text-[#171414] border-[#E1BAC2]/40 text-[10px] font-mono">
              {networkName || "Connecting..."}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl sm:text-4xl font-extrabold text-[#171414]">{ethBalance}</span>
            <span className="text-lg font-mono font-bold text-[#4A4A4A]">ETH</span>
          </div>
          <p className="text-xs text-[#4A4A4A] mt-2">Sepolia Testnet — used for deposits & repayments</p>
          <div className="mt-3 p-3 rounded-xl bg-[#F5F5F3] border border-[#171414]/5">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#4A4A4A] mb-1">Need testnet ETH?</p>
            <a
              href="https://sepoliafaucet.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#171414] hover:underline inline-flex items-center gap-1"
            >
              Get free SepoliaETH → <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* CTC Balance (Creditcoin CC3) */}
        <div className="glass-panel rounded-2xl border border-[#171414]/10 p-5 sm:p-6 shadow-soft-editorial">
          <div className="flex items-center justify-between mb-4">
            <p className="kicker-gold">CTC Balance</p>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono">
              Creditcoin CC3
            </Badge>
          </div>
          {ctcLoading ? (
            <div className="flex items-center gap-2 py-4">
              <RefreshCw className="h-4 w-4 animate-spin text-[#171414]" />
              <span className="font-mono text-xs text-[#4A4A4A]">Loading CTC balance...</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-[#171414]">
                  {ctcData?.balanceCTC || "0.0000"}
                </span>
                <span className="text-lg font-mono font-bold text-[#4A4A4A]">CTC</span>
              </div>
              <p className="text-xs text-[#4A4A4A] mt-2">Creditcoin CC3 Testnet — native settlement & liquidity pool layer</p>
              {ctcData?.address && (
                <a
                  href={`${process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || 'https://creditcoin-testnet.blockscout.com'}/address/${ctcData.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 font-mono text-[10px] text-[#4A4A4A] hover:text-[#171414] hover:underline"
                >
                  View on Blockscout <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </>
          )}
        </div>

        {/* Network Info */}
        <div className="glass-panel rounded-2xl border border-[#171414]/10 p-5 sm:p-6 shadow-soft-editorial">
          <p className="kicker-gold mb-4">Supported Networks</p>
          <div className="space-y-3">
            {[
              { label: "Active Connected Network", value: networkName || "—" },
              { label: "Creditcoin 3 Testnet", value: "Chain ID 102031 (tCTC Native)", mono: true },
              { label: "Ethereum Sepolia Testnet", value: "Chain ID 11155111 (Credit Bureau)", mono: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-[#171414]/5">
                <span className="text-sm text-[#4A4A4A]">{row.label}</span>
                <span className={`text-sm font-bold text-[#171414] ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 border-b border-[#171414]/5">
              <span className="text-sm text-[#4A4A4A]">Creditcoin Blockscout</span>
              <a href="https://creditcoin-testnet.blockscout.com" target="_blank" rel="noopener noreferrer"
                className="text-sm font-bold text-[#171414] flex items-center gap-1 hover:underline">
                creditcoin-testnet.blockscout.com <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#4A4A4A]">Sepolia Etherscan</span>
              <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer"
                className="text-sm font-bold text-[#171414] flex items-center gap-1 hover:underline">
                sepolia.etherscan.io <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="glass-panel rounded-2xl border border-[#E1BAC2]/30 p-4 sm:p-5 shadow-soft-editorial bg-[#E1BAC2]/[0.04]">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-[#E1BAC2] mt-0.5 shrink-0" />
            <div>
              <p className="font-display text-sm font-bold text-[#171414]">Wallet Security</p>
              <p className="text-xs text-[#4A4A4A] mt-1">Your wallet is your identity on Sanad. Never share your private keys or seed phrase. Sanad will never ask for them.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
