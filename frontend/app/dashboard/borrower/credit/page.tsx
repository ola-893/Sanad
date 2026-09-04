"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Fingerprint,
  ExternalLink,
  Loader2,
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Link2,
  Wallet,
  Clock,
  Search,
  ChevronRight,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import { ethers } from "ethers"
import { SANAD_CREDIT_ORACLE_ADDRESS } from "@/core/credit-bureau/sanad-credit-oracle"

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/10 bg-white/70 shadow-soft-editorial"
const LABEL = "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#171414]/40"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"

/* ─── Volume formatting helper ─── */
function formatVolume(raw: string | number | undefined | null): string {
  const n = typeof raw === "string" ? Number(raw) : (raw ?? 0)
  if (!isFinite(n) || isNaN(n) || n < 0) return "—"
  if (n > 1e15) return "—"
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

/* ─── Protocol & Event type maps ─── */
const PROTOCOL_NAMES: Record<number, string> = {
  0: "Aave v3", 1: "Compound v3", 2: "Morpho Blue", 3: "Spark Protocol",
  4: "MakerDAO", 5: "Euler v2", 6: "Fluid", 7: "Maple Finance",
  8: "Goldfinch", 9: "Fraxlend",
}

const EVENT_TYPE_NAMES: Record<number, string> = {
  0: "Clean Repayment", 1: "Liquidation", 2: "Default",
  3: "Collateral Supply", 4: "Active Borrow",
}

const EVENT_COLORS: Record<number, string> = {
  0: "bg-emerald-50 text-emerald-600 border-emerald-200",
  1: "bg-red-50 text-red-600 border-red-200",
  2: "bg-red-50 text-red-600 border-red-200",
  3: "bg-blue-50 text-blue-600 border-blue-200",
  4: "bg-purple-50 text-purple-600 border-purple-200",
}

const TIER_INFO: Record<number, { label: string; color: string; glow: string }> = {
  0: { label: "Unrated", color: "text-[#171414]/50", glow: "" },
  1: { label: "Bronze", color: "text-amber-600", glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]" },
  2: { label: "Silver", color: "text-gray-500", glow: "shadow-[0_0_20px_rgba(148,163,184,0.2)]" },
  3: { label: "Gold", color: "text-yellow-600", glow: "shadow-[0_0_20px_rgba(250,204,21,0.3)]" },
  4: { label: "HighRisk", color: "text-red-600", glow: "shadow-[0_0_20px_rgba(248,113,113,0.2)]" },
}

interface CreditProfile {
  borrower: string
  score: string | number
  tier: number | string
  totalRepaidUSD: string | number
  totalLiquidatedUSD: string | number
  totalDefaultedUSD: string | number
  cleanRepaymentCount: number
  liquidationCount: number
  defaultCount: number
  lastEvaluatedTimestamp: string
  provenEventsCount: number
}

function normalizeTier(raw: number | string | undefined): number {
  if (typeof raw === "number") return raw
  if (typeof raw === "string") {
    const lower = raw.toLowerCase()
    if (lower === "unscored" || lower === "unrated") return 0
    if (lower === "bronze") return 1
    if (lower === "silver") return 2
    if (lower === "gold") return 3
    if (lower === "highrisk" || lower === "high risk") return 4
    const n = Number(raw)
    return isNaN(n) ? 0 : n
  }
  return 0
}

interface ProvenEvent {
  sourceTxHash: string
  blockHeight: number
  protocol: number
  eventType: number
  volumeUSD: string
  timestamp: string
  cc3TxHash?: string
  cc3ExplorerUrl?: string
}

interface DiscoveryResult {
  borrower?: string
  totalEventsFound?: number
  selectedTopEvents?: any[]
  summary?: {
    cleanRepaymentsCount: number
    liquidationsCount: number
    defaultsCount: number
    totalVolumeUSD: number
    estimatedTier: string
    activeProtocolsCount: number
  }
  hasVerifiedHistory?: boolean
  events?: any[]
  message?: string
}

/* ════════════════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════════════════ */
export default function BorrowerCreditPage() {
  const [user] = useAtom(userAtom)
  const walletAddress = user?.userInfo?.accountId || user?.wallet?.address || ""
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const [activeTab, setActiveTab] = useState(tabParam === "discover" ? "discover" : "score")

  // Auto-scan when arriving from dashboard notification
  useEffect(() => {
    if (tabParam === "discover" && walletAddress && !discovering && !discoveryResult) {
      handleDiscoverWithAddress(walletAddress)
    }
  }, [tabParam, walletAddress])
  const queryClient = useQueryClient()
  const [discoverAddress, setDiscoverAddress] = useState(walletAddress)
  const [discovering, setDiscovering] = useState(false)
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null)
  const [provingEvent, setProvingEvent] = useState<string | null>(null)
  const [proofModal, setProofModal] = useState<{
    open: boolean
    event?: any
    step: "idle" | "attesting" | "fetched" | "submitting" | "done"
    proofData?: any
    error?: string
  }>({ open: false, step: "idle" })
  const [autoProving, setAutoProving] = useState(false)
  const [autoProveResult, setAutoProveResult] = useState<any>(null)

  /* ─── Fetch on-chain credit profile ─── */
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["credit-profile", walletAddress],
    queryFn: async (): Promise<CreditProfile> => {
      const { data } = await apiInstance.get(`/credit-oracle/profile/${walletAddress}`)
      return data?.data || data
    },
    enabled: !!walletAddress,
  })

  /* ─── Fetch proven events ─── */
  const { data: provenEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["proven-events", walletAddress],
    queryFn: async (): Promise<ProvenEvent[]> => {
      const { data } = await apiInstance.get(`/credit-oracle/profile/${walletAddress}`)
      return data?.data?.provenEvents || []
    },
    enabled: !!walletAddress,
  })

  /* ─── Discover DeFi history ─── */
  const handleDiscoverWithAddress = async (addr: string) => {
    if (!addr) return
    setDiscoverAddress(addr)
    setDiscovering(true)
    setDiscoveryResult(null)
    try {
      const { data } = await apiInstance.post("/credit-oracle/discover", { address: addr })
      setDiscoveryResult(data?.data || data)
    } catch (err: any) {
      setDiscoveryResult({ message: err.response?.data?.message || err.message || "Discovery failed" })
    } finally {
      setDiscovering(false)
    }
  }
  const handleDiscover = () => handleDiscoverWithAddress(discoverAddress)

  /* ─── Auto-prove ALL discovered events (fire + poll) ─── */
  const handleAutoProveAll = async (addr: string) => {
    if (!addr) return
    setAutoProving(true)
    setAutoProveResult(null)
    try {
      // Start auto-prove in background — returns immediately
      await apiInstance.post("/credit-oracle/auto-prove-all", { address: addr })

      // Poll for completion
      let attempts = 0
      const MAX_ATTEMPTS = 120 // 10 min max
      const pollPromise = new Promise<any>((resolve, reject) => {
        const interval = setInterval(async () => {
          attempts++
          try {
            const { data } = await apiInstance.get(`/credit-oracle/auto-prove-status/${addr}`)
            const s = data?.data
            if (s?.status === 'completed' || s?.status === 'error') {
              clearInterval(interval)
              resolve(s)
            } else if (attempts >= MAX_ATTEMPTS) {
              clearInterval(interval)
              reject(new Error('Timed out'))
            }
          } catch {}
        }, 5000)
      })

      const result = await pollPromise
      setAutoProveResult(result)
      queryClient.invalidateQueries({ queryKey: ["proven-events", walletAddress] })
      queryClient.invalidateQueries({ queryKey: ["credit-profile", walletAddress] })
    } catch (err: any) {
      setAutoProveResult({ message: err.message || "Auto-prove failed", eventsProven: 0, eventsFailed: 0 })
    } finally {
      setAutoProving(false)
    }
  }

  /* ─── Fetch Attestcoin proof ─── */
  const handleFetchProof = async (event: any) => {
    setProofModal({ open: true, event, step: "attesting" })
    try {
      const isSepolia = event.etherscanUrl?.includes("sepolia") || event.network === "sepolia"
      const { data } = await apiInstance.post("/credit-oracle/fetch-proof", {
        sourceTxHash: event.sourceTxHash,
        blockHeight: event.blockHeight,
        chainKey: isSepolia ? 1 : 3,
      })
      const proofData = data?.data || data
      setProofModal((prev) => ({ ...prev, step: "fetched", proofData }))
    } catch (err: any) {
      setProofModal((prev) => ({ ...prev, step: "idle", error: err.response?.data?.message || err.message || "Failed to fetch proof" }))
    }
  }

  /* ─── Submit proof to CC3 ─── */
  const handleSubmitToCC3 = async () => {
    const { event, proofData } = proofModal
    if (!event || !proofData) return
    setProofModal((prev) => ({ ...prev, step: "submitting", error: undefined }))
    try {
      if (!window.ethereum) throw new Error("MetaMask not found")

      const cc3RpcUrl = process.env.NEXT_PUBLIC_CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network"
      const cc3Provider = new ethers.JsonRpcProvider(cc3RpcUrl, 102031, {
        staticNetwork: ethers.Network.from(102031),
      })
      const oracleContract = new ethers.Contract(
        SANAD_CREDIT_ORACLE_ADDRESS,
        ["function nonces(address) external view returns (uint256)"],
        cc3Provider
      )
      let currentNonce = BigInt(0)
      try {
        currentNonce = await oracleContract.nonces(discoverAddress)
      } catch {}

      const innerHash = ethers.solidityPackedKeccak256(
        ["address", "address", "uint256", "uint256"],
        [discoverAddress, SANAD_CREDIT_ORACLE_ADDRESS, 102031, currentNonce]
      )
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const signer = await browserProvider.getSigner()
      const signature = await signer.signMessage(ethers.getBytes(innerHash))
      if (!signature || signature.length !== 132) throw new Error("Invalid signature")

      const { data } = await apiInstance.post("/credit-oracle/prove-event", {
        address: discoverAddress,
        event: {
          sourceTxHash: event.sourceTxHash,
          blockHeight: event.blockHeight,
          protocol: event.protocol,
          eventType: event.eventType,
          volumeUSD: event.volumeUSD,
          timestamp: event.timestamp,
        },
        signature,
      })

      const result = data?.data || data
      setProofModal((prev) => ({ ...prev, step: "done", proofData: { ...prev.proofData, submitResult: result } }))
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["credit-profile", walletAddress] })
        queryClient.invalidateQueries({ queryKey: ["proven-events", walletAddress] })
      }
    } catch (err: any) {
      setProofModal((prev) => ({ ...prev, step: "fetched", error: err.message }))
    }
  }

  const score = profile ? Number(profile.score) : 0
  const tier = profile ? normalizeTier(profile.tier) : 0
  const tierInfo = TIER_INFO[tier] || TIER_INFO[0]
  const totalRepaid = profile ? Number(profile.totalRepaidUSD) : 0
  const totalLiquidated = profile ? Number(profile.totalLiquidatedUSD) : 0
  const totalDefaulted = profile ? Number(profile.totalDefaultedUSD) : 0
  const cleanRepayments = profile?.cleanRepaymentCount || 0
  const liquidations = profile?.liquidationCount || 0
  const defaults = profile?.defaultCount || 0
  const provenCount = profile?.provenEventsCount || 0

  const isOwnWallet = discoverAddress && walletAddress && discoverAddress.toLowerCase() === walletAddress.toLowerCase()

  const scoreRing = score >= 750 ? "stroke-yellow-500" : score >= 550 ? "stroke-gray-400" : score >= 350 ? "stroke-amber-500" : "stroke-red-500"

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/borrower">
          <Button variant="ghost" size="sm" className="rounded-full font-mono text-[10px] text-[#171414]/60 hover:text-[#171414] hover:bg-[#171414]/5">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <p className={LABEL}>Attestcoin Protocol</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[#171414]">
            Credit Profile
          </h1>
        </div>
      </div>

      {profileLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#E1BAC2]" />
        </div>
      ) : (
        <>
          {/* ─── Score Hero ─── */}
          <div className={`${GLASS} overflow-hidden`}>
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Score Circle */}
              <div className="flex flex-col items-center justify-center p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-[#171414]/10">
                <p className={LABEL}>Credit Score</p>
                <div className="relative my-5">
                  <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      className={scoreRing}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(score / 1000) * 314} 314`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-5xl font-extrabold text-[#171414]">{score}</span>
                    <span className="font-mono text-[10px] text-[#171414]/40">/ 1000</span>
                  </div>
                </div>
                <Badge className={`${tierInfo.glow} bg-[#171414]/5 border-[#171414]/15 ${tierInfo.color} font-mono text-[11px] font-bold px-4 py-1`}>
                  {tierInfo.label}
                </Badge>
                <p className="mt-3 text-xs text-[#171414]/40 text-center max-w-xs">
                  Score derived from cryptographically proven DeFi repayment events on Ethereum, verified via Attestcoin Block Prover
                </p>
              </div>

              {/* Stats */}
              <div className="lg:col-span-2 p-6 lg:p-8 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Repaid", value: formatVolume(totalRepaid), icon: CheckCircle, color: "text-emerald-600" },
                    { label: "Borrowed", value: formatVolume(profile ? Number(profile.totalRepaidUSD || 0) + Number(profile.totalLiquidatedUSD || 0) : 0), icon: Zap, color: "text-blue-600" },
                    { label: "Events", value: provenCount, icon: Link2, color: "text-[#E1BAC2]" },
                    { label: "Protocols", value: 10, icon: Shield, color: "text-purple-600" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-[#171414]/5 border border-[#171414]/10 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                        <span className={LABEL}>{stat.label}</span>
                      </div>
                      <p className="font-display text-xl font-extrabold text-[#171414]">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Breakdown */}
                <div className="rounded-2xl bg-[#171414]/5 border border-[#171414]/10 p-5 space-y-4">
                  <p className={LABEL}>Score Breakdown</p>
                  <div className="space-y-3">
                    {[
                      { label: "Clean Repayments", value: cleanRepayments, points: cleanRepayments * 50, maxPoints: 500, icon: CheckCircle, color: "emerald", desc: "+50 per repayment" },
                      { label: "Liquidations", value: liquidations, points: -liquidations * 40, maxPoints: 200, icon: AlertTriangle, color: "red", desc: "-40 per liquidation" },
                      { label: "Defaults", value: defaults, points: -defaults * 150, maxPoints: 300, icon: AlertTriangle, color: "red", desc: "-150 per default" },
                    ].map((item) => {
                      const progress = Math.min(Math.abs(item.points) / item.maxPoints, 1)
                      return (
                        <div key={item.label} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                                item.color === "emerald" ? "bg-emerald-100" : "bg-red-100"
                              }`}>
                                <item.icon className={`h-3.5 w-3.5 ${
                                  item.color === "emerald" ? "text-emerald-600" : "text-red-500"
                                }`} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#171414]">{item.label}</p>
                                <p className="text-[10px] text-[#171414]/40">{item.desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-[#171414]">{item.value}</span>
                              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                                item.points > 0 ? "bg-emerald-100 text-emerald-700" :
                                item.points < 0 ? "bg-red-100 text-red-600" :
                                "bg-gray-100 text-gray-500"
                              }`}>
                                {item.points > 0 ? "+" : ""}{item.points}
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#171414]/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                item.color === "emerald" ? "bg-emerald-500" : "bg-red-500"
                              }`}
                              style={{ width: `${progress * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Wallet + Last Evaluated */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#171414]/40">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3 w-3" />
                    <span className="font-mono truncate max-w-[200px]">{walletAddress || "Not connected"}</span>
                  </div>
                  {profile?.lastEvaluatedTimestamp && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Last evaluated: {new Date(Number(profile.lastEvaluatedTimestamp) * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Tabs ─── */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-full bg-[#171414]/5 border border-[#171414]/10 p-1">
              <TabsTrigger value="score" className="rounded-full font-display text-xs font-bold data-[state=active]:bg-[#E1BAC2] data-[state=active]:text-[#171414] text-[#171414]/60">
                <Link2 className="h-3.5 w-3.5 mr-1.5" /> Proven Events
              </TabsTrigger>
              <TabsTrigger value="discover" className="rounded-full font-display text-xs font-bold data-[state=active]:bg-[#E1BAC2] data-[state=active]:text-[#171414] text-[#171414]/60">
                <Search className="h-3.5 w-3.5 mr-1.5" /> Discover
              </TabsTrigger>
            </TabsList>

            {/* ─── Proven Events ─── */}
            <TabsContent value="score">
              <div className={`${GLASS} p-6`}>
                <p className={LABEL}>On-Chain Verified Events</p>
                <p className="mt-1 text-sm text-[#171414]/50 mb-6">DeFi events cryptographically proven via Attestcoin Block Prover on CC3</p>

                {eventsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
                  </div>
                ) : !provenEvents || provenEvents.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1BAC2]/10">
                      <Link2 className="h-7 w-7 text-[#E1BAC2]" />
                    </div>
                    <p className="font-display text-lg font-bold text-[#171414]">No proven events yet</p>
                    <p className="mt-1 text-sm text-[#171414]/50">Discover your DeFi history to generate Attestcoin proofs</p>
                    <Button
                      className="mt-4 rounded-full bg-[#E1BAC2] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#171414] hover:bg-[#d4a6af]"
                      onClick={() => setActiveTab("discover")}
                    >
                      <Search className="h-3.5 w-3.5 mr-1.5" /> Discover History
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {provenEvents.map((event, i) => (
                      <div key={i} className="rounded-2xl bg-[#171414]/5 border border-[#171414]/10 p-4 hover:bg-[#171414]/8 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${EVENT_COLORS[event.eventType] || "bg-[#171414]/5 text-[#171414]/50 border-[#171414]/15"}`}>
                              <Shield className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-display text-sm font-bold text-[#171414]">{typeof event.eventType === 'number' ? EVENT_TYPE_NAMES[event.eventType] : event.eventType || 'Event'}</p>
                                <Badge variant="outline" className="font-mono text-[9px] border-[#171414]/15 text-[#171414]/50">
                                  {PROTOCOL_NAMES[event.protocol] || `Protocol ${event.protocol}`}
                                </Badge>
                              </div>
                              <p className="font-mono text-lg font-extrabold text-[#171414] mt-1">{formatVolume(event.volumeUSD)}</p>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-[#171414]/30">#{event.blockHeight}</span>
                        </div>

                        {/* Proof Details */}
                        <div className="mt-3 pt-3 border-t border-[#171414]/5 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#171414] bg-[#E1BAC2] px-2 py-0.5 rounded-full">Attestcoin Proof</span>
                            <span className="font-mono text-[9px] text-[#171414]/30">Chain Key: 1 (Sepolia)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded-lg bg-[#171414]/3 p-2">
                              <span className="text-[#171414]/40">Source Tx Hash</span>
                              <p className="font-mono text-[#171414] truncate">{event.sourceTxHash}</p>
                            </div>
                            {event.cc3TxHash && (
                              <div className="rounded-lg bg-[#171414]/3 p-2">
                                <span className="text-[#171414]/40">CC3 Proof Tx</span>
                                <p className="font-mono text-[#171414] truncate">{event.cc3TxHash}</p>
                              </div>
                            )}
                            <div className="rounded-lg bg-[#171414]/3 p-2">
                              <span className="text-[#171414]/40">Block Proven</span>
                              <p className="font-mono text-[#171414]">#{event.blockHeight}</p>
                            </div>
                            <div className="rounded-lg bg-[#171414]/3 p-2">
                              <span className="text-[#171414]/40">Oracle Contract</span>
                              <p className="font-mono text-[#171414] truncate">0xB7Af...0023</p>
                            </div>
                          </div>
                        </div>

                        {/* Links */}
                        <div className="flex items-center gap-3 mt-3">
                          <a
                            href={`https://eth-sepolia.blockscout.com/tx/${event.sourceTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700 transition-colors"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            Source Tx
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {event.cc3ExplorerUrl && (
                            <a
                              href={event.cc3ExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#171414] px-3 py-1.5 text-[10px] font-bold text-[#E1BAC2] hover:bg-black transition-colors"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-[#E1BAC2]" />
                              Proof on CC3
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ─── Discover History ─── */}
            <TabsContent value="discover">
              <div className={`${GLASS} p-6`}>
                <p className={LABEL}>Discover DeFi History</p>
                <p className="mt-1 text-sm text-[#171414]/50 mb-6">
                  Scan your Ethereum Sepolia wallet for DeFi lending activity. Attestcoin will generate cryptographic proofs for verified events on CC3 testnet.
                </p>

                <div className="flex gap-3 mb-6">
                  <div className="relative flex-1">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#171414]/40 shrink-0" />
                    <input
                      placeholder="0x... Ethereum address"
                      className="w-full font-mono text-sm py-2.5 pl-10 pr-4 rounded-xl border border-[#171414]/15 bg-[#171414]/5 text-[#171414] placeholder:text-[#171414]/20 focus-visible:ring-[#E1BAC2] focus-visible:ring-1 outline-none"
                      value={discoverAddress}
                      onChange={(e) => setDiscoverAddress(e.target.value.trim())}
                    />
                  </div>
                  <Button
                    className="rounded-full bg-[#E1BAC2] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#171414] hover:bg-[#d4a6af] px-5"
                    onClick={handleDiscover}
                    disabled={discovering || !discoverAddress}
                  >
                    {discovering ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1.5" />}
                    {discovering ? "Scanning..." : "Discover"}
                  </Button>
                </div>

                {autoProving && (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-800">Auto-proving all DeFi events on CC3...</p>
                        <p className="text-xs text-purple-600">All events including liquidations are proven for credit integrity</p>
                      </div>
                    </div>
                  </div>
                )}
                {autoProveResult && !autoProving && (
                  <div className={`rounded-2xl border p-4 mb-4 ${autoProveResult.eventsProven > 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                    <div className="flex items-center gap-3">
                      {autoProveResult.eventsProven > 0 ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-amber-600" />}
                      <div>
                        <p className="text-sm font-medium text-[#171414]">{autoProveResult.message || `Proven ${autoProveResult.eventsProven} events`}</p>
                        <p className="text-xs text-[#171414]/50">{autoProveResult.eventsFound || 0} found · {autoProveResult.eventsProven || 0} proven · {autoProveResult.eventsFailed || 0} failed</p>
                      </div>
                    </div>
                  </div>
                )}
                {discoveryResult && (
                  <div className="space-y-4">
                    {discoveryResult.message && (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="text-sm text-amber-600">{discoveryResult.message}</p>
                      </div>
                    )}

                    {discoveryResult.summary && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          { label: "Events Found", value: discoveryResult.totalEventsFound || 0 },
                          { label: "Clean Repayments", value: discoveryResult.summary.cleanRepaymentsCount },
                          { label: "Liquidations", value: discoveryResult.summary.liquidationsCount },
                          { label: "Active Protocols", value: discoveryResult.summary.activeProtocolsCount },
                        ].map((s) => (
                          <div key={s.label} className="rounded-2xl border border-[#171414]/10 bg-[#171414]/5 p-4">
                            <p className={LABEL}>{s.label}</p>
                            <p className="mt-1 font-display text-xl font-extrabold text-[#171414]">{s.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {discoveryResult.selectedTopEvents && discoveryResult.selectedTopEvents.length > 0 && (() => {
                      // Filter out already proven events
                      const provenHashes = new Set((provenEvents || []).map((e: any) => e.sourceTxHash?.toLowerCase()))
                      const unprovenEvents = discoveryResult.selectedTopEvents.filter(
                        (e: any) => !provenHashes.has(e.sourceTxHash?.toLowerCase())
                      )
                      if (unprovenEvents.length === 0) {
                        return (
                          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-center">
                            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                            <p className="font-display text-sm font-bold text-[#171414]">All Events Proven</p>
                            <p className="text-xs text-[#171414]/50">All discovered DeFi events have been proven on CC3</p>
                          </div>
                        )
                      }
                      return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#E1BAC2] bg-[#E1BAC2]/10 px-2 py-0.5 rounded-full">Unproven</span>
                          <span className="font-mono text-[10px] text-[#171414]/40">{unprovenEvents.length} of {discoveryResult.selectedTopEvents.length} events need proving</span>
                        </div>
                        {unprovenEvents.map((event: any, i: number) => (
                          <div key={i} className="flex items-center justify-between rounded-2xl bg-[#171414]/5 border border-[#171414]/10 p-4 hover:bg-[#171414]/8 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${EVENT_COLORS[event.eventType] || "bg-[#171414]/5 text-[#171414]/50 border-[#171414]/15"}`}>
                                <Shield className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-display text-sm font-bold text-[#171414]">{event.eventTypeName || EVENT_TYPE_NAMES[event.eventType]}</p>
                                  <Badge variant="outline" className="font-mono text-[9px] border-[#171414]/15 text-[#171414]/50">
                                    {event.protocolName || PROTOCOL_NAMES[event.protocol]}
                                  </Badge>
                                  {event.tokenSymbol && (
                                    <Badge variant="outline" className="font-mono text-[9px] border-[#171414]/15 text-[#171414]/40">
                                      {event.tokenSymbol}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-[#171414]/40">
                                  <span className="font-mono">Weight: {event.weightScore || "—"}</span>
                                  <span>•</span>
                                  <a
                                    href={`https://eth-sepolia.blockscout.com/tx/${event.sourceTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono hover:text-[#E1BAC2] transition-colors flex items-center gap-1"
                                  >
                                    {event.sourceTxHash?.slice(0, 12)}...
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="font-mono text-sm font-bold text-[#171414]">{formatVolume(event.volumeUSD)}</p>
                              <Button
                                size="sm"
                                className="rounded-full bg-[#E1BAC2] font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#171414] hover:bg-[#d4a6af] px-3 py-1"
                                onClick={() => handleFetchProof(event)}
                                disabled={provingEvent === event.sourceTxHash}
                              >
                                {provingEvent === event.sourceTxHash ? (
                                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Proving...</>
                                ) : (
                                  <><Shield className="h-3 w-3 mr-1" /> Prove</>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ─── Attestcoin Proof Modal ─── */}
      {proofModal.open && proofModal.event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setProofModal({ open: false, step: "idle" })}>
          <div className="w-full max-w-md mx-4 overflow-hidden rounded-3xl border border-white/10 bg-[#171414] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/20">
                  <Fingerprint className="h-4.5 w-4.5 text-[#E1BAC2]" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-white">Attestcoin Proof</p>
                  <p className="font-mono text-[10px] text-white/40">{proofModal.event.sourceTxHash?.slice(0, 18)}...</p>
                </div>
              </div>
              <button onClick={() => setProofModal({ open: false, step: "idle" })} className="rounded-full p-1.5 hover:bg-white/10">
                <span className="sr-only">Close</span>
                <svg className="h-4 w-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Event Summary */}
            <div className="px-6 py-4 bg-white/5 border-b border-white/10">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Event</p>
                  <p className="font-display text-xs font-bold text-white">{proofModal.event.eventTypeName}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Token</p>
                  <p className="font-display text-xs font-bold text-white">{proofModal.event.tokenSymbol || "—"}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Value</p>
                  <p className="font-display text-xs font-bold text-white">{formatVolume(proofModal.event.volumeUSD)}</p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="px-6 py-5 space-y-4">
              {[
                {
                  step: "attesting",
                  title: "Block Attestation",
                  desc: proofModal.step === "attesting" ? "Waiting for Ethereum block to be attested..." : proofModal.step !== "idle" ? `Block #${proofModal.event.blockHeight} attested ✓` : "Pending",
                  done: proofModal.step !== "idle" && proofModal.step !== "attesting",
                  active: proofModal.step === "attesting",
                },
                {
                  step: "fetched",
                  title: "Proof Generated",
                  desc: proofModal.step === "attesting" ? "Waiting..." : proofModal.step === "fetched" || proofModal.step === "submitting" || proofModal.step === "done" ? "Merkle + continuity proof ready ✓" : "Pending",
                  done: proofModal.step === "fetched" || proofModal.step === "submitting" || proofModal.step === "done",
                  active: false,
                },
                {
                  step: "submitting",
                  title: "Submit to CC3",
                  desc: proofModal.step === "submitting" ? "Submitting to SanadCreditOracle..." : proofModal.step === "done" ? "Proof recorded on-chain ✓" : proofModal.step === "fetched" ? "Ready — requires MetaMask signature" : "Pending",
                  done: proofModal.step === "done",
                  active: proofModal.step === "submitting",
                },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${s.active ? "bg-[#E1BAC2] animate-pulse" : s.done ? "bg-emerald-500" : "bg-white/10"}`}>
                    {s.done ? (
                      <CheckCircle className="h-3.5 w-3.5 text-[#171414]" />
                    ) : (
                      <span className="font-mono text-[10px] font-bold text-white">{i + 1}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-white">{s.title}</p>
                    <p className="text-xs text-white/40">{s.desc}</p>
                  </div>
                </div>
              ))}

              {/* Proof Data */}
              {proofModal.proofData && proofModal.step !== "attesting" && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2]">Proof Data</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-white/40">Chain Key</span>
                      <span className="font-mono text-[10px] text-white/70">{proofModal.proofData.chainKey} ({proofModal.proofData.chainKey === 1 ? "Sepolia" : "Mainnet"})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-white/40">Block Height</span>
                      <span className="font-mono text-[10px] text-white/70">#{proofModal.proofData.blockHeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-white/40">Merkle Siblings</span>
                      <span className="font-mono text-[10px] text-white/70">{proofModal.proofData.merkleProof?.siblings?.length || 0} hashes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-white/40">Continuity Roots</span>
                      <span className="font-mono text-[10px] text-white/70">{proofModal.proofData.continuityProof?.roots?.length || 0} roots</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {proofModal.error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-xs text-red-400">{proofModal.error}</p>
                </div>
              )}

              {/* Success */}
              {proofModal.step === "done" && proofModal.proofData?.submitResult && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-xs font-bold text-emerald-400">Proof Recorded on CC3</p>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-white/40">Credit Score</span>
                      <span className="font-mono text-[10px] font-bold text-white">{proofModal.proofData.submitResult.score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-white/40">Tier</span>
                      <span className="font-mono text-[10px] font-bold text-white">{proofModal.proofData.submitResult.tier}</span>
                    </div>
                    {proofModal.proofData.submitResult.transactionHash && (
                      <a
                        href={`https://creditcoin-testnet.blockscout.com/tx/${proofModal.proofData.submitResult.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-[#E1BAC2] hover:text-[#d4a6af] flex items-center gap-1"
                      >
                        {proofModal.proofData.submitResult.transactionHash.slice(0, 20)}... <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full font-mono text-[10px] text-white/50 hover:text-white hover:bg-white/10"
                onClick={() => setProofModal({ open: false, step: "idle" })}
              >
                Close
              </Button>
              {proofModal.step === "fetched" && (
                <Button
                  size="sm"
                  className="rounded-full bg-[#E1BAC2] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#171414] hover:bg-[#d4a6af] px-4"
                  onClick={handleSubmitToCC3}
                >
                  <Shield className="h-3 w-3 mr-1.5" /> Sign & Submit
                </Button>
              )}
              {proofModal.step === "submitting" && (
                <Button
                  size="sm"
                  disabled
                  className="rounded-full bg-[#E1BAC2] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#171414] px-4"
                >
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Submitting...
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
