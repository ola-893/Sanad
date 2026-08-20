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
import { toast } from "sonner"

async function getETHBalance(address: string): Promise<string> {
  if (!window.ethereum) return "0"
  const hex = await window.ethereum.request({
    method: "eth_getBalance",
    params: [address, "latest"],
  })
  return (parseInt(hex, 16) / 1e18).toFixed(6)
}

export default function WalletPage() {
  const { walletAddress, isConnected, truncateAddress } = useWalletAuth()
  const [copied, setCopied] = useState(false)
  const [ethBalance, setEthBalance] = useState("0.000000")
  const [isLoading, setIsLoading] = useState(false)
  const [networkName, setNetworkName] = useState("")

  const fetchBalance = async () => {
    if (!walletAddress) return
    setIsLoading(true)
    try {
      const bal = await getETHBalance(walletAddress)
      setEthBalance(bal)
      if (window.ethereum) {
        const chainIdHex = await window.ethereum.request({ method: "eth_chainId" })
        const chainId = parseInt(chainIdHex, 16)
        if (chainId === 11155111) setNetworkName("ETH Sepolia Testnet")
        else if (chainId === 1) setNetworkName("Ethereum Mainnet")
        else setNetworkName(`Chain ${chainId}`)
      }
    } catch {
      setEthBalance("0")
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

        {/* Balance */}
        <div className="glass-panel rounded-2xl border border-[#171414]/10 p-5 sm:p-6 shadow-soft-editorial">
          <p className="kicker-gold mb-4">Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl sm:text-4xl font-extrabold text-[#171414]">{ethBalance}</span>
            <span className="text-lg font-mono font-bold text-[#4A4A4A]">ETH</span>
          </div>
          <p className="text-xs text-[#4A4A4A] mt-2">{networkName}</p>
        </div>

        {/* Network Info */}
        <div className="glass-panel rounded-2xl border border-[#171414]/10 p-5 sm:p-6 shadow-soft-editorial">
          <p className="kicker-gold mb-4">Network Details</p>
          <div className="space-y-3">
            {[
              { label: "Network", value: networkName || "—" },
              { label: "Chain ID", value: "11155111", mono: true },
              { label: "Currency", value: "ETH (Sepolia Testnet)" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-[#171414]/5">
                <span className="text-sm text-[#4A4A4A]">{row.label}</span>
                <span className={`text-sm font-bold text-[#171414] ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#4A4A4A]">Explorer</span>
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
