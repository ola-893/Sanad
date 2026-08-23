"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Fingerprint,
  ExternalLink,
  Loader2,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  Link2,
  Wallet,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import { ethers } from "ethers"
import { SANAD_CREDIT_ORACLE_ADDRESS } from "@/core/credit-bureau/sanad-credit-oracle"

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const LABEL = "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]/50"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"
const INPUT = "rounded-xl border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2]"
const BTN = "rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black"

/* ─── Volume formatting helper ─── */
function formatVolume(raw: string | number | undefined | null): string {
  const n = typeof raw === "string" ? Number(raw) : (raw ?? 0)
  if (!isFinite(n) || isNaN(n) || n < 0) return "—"
  // Values above 1e15 are almost certainly raw uint256 overflow / unconverted wei
  if (n > 1e15) return "—"
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

/* ─── Protocol & Event type maps ─── */
const PROTOCOL_NAMES: Record<number, string> = {
  0: "Aave v3",
  1: "Compound v3",
  2: "Morpho Blue",
  3: "Spark Protocol",
  4: "MakerDAO",
  5: "Euler v2",
  6: "Fluid",
  7: "Maple Finance",
  8: "Goldfinch",
  9: "Fraxlend",
}

const EVENT_TYPE_NAMES: Record<number, string> = {
  0: "Clean Repayment",
  1: "Liquidation",
  2: "Default",
  3: "Collateral Supply",
  4: "Active Borrow",
}

const TIER_INFO: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Unrated", color: "text-gray-500", bg: "bg-gray-100" },
  1: { label: "Bronze", color: "text-orange-600", bg: "bg-orange-50" },
  2: { label: "Silver", color: "text-slate-500", bg: "bg-slate-50" },
  3: { label: "Gold", color: "text-amber-600", bg: "bg-amber-50" },
  4: { label: "HighRisk", color: "text-red-600", bg: "bg-red-50" },
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

/** Normalize tier — contract may return numeric (0-5) or string ('Unscored', 'Poor', etc.) */
function normalizeTier(raw: number | string | undefined): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const lower = raw.toLowerCase()
    if (lower === 'unscored' || lower === 'unrated') return 0
    if (lower === 'bronze') return 1
    if (lower === 'silver') return 2
    if (lower === 'gold') return 3
    if (lower === 'highrisk' || lower === 'high risk') return 4
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

  const [activeTab, setActiveTab] = useState("score")
  const queryClient = useQueryClient()
  const [discoverAddress, setDiscoverAddress] = useState(walletAddress)
  const [discovering, setDiscovering] = useState(false)
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null)
  const [provingEvent, setProvingEvent] = useState<string | null>(null)
  const [proofModal, setProofModal] = useState<{ open: boolean; event?: any; step: 'idle' | 'attesting' | 'fetched' | 'submitting' | 'done'; proofData?: any; error?: string }>({ open: false, step: 'idle' })

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

  /* ─── Fetch Attestcoin proof (step 2+3: attestation + proof generation) ─── */
  const handleFetchProof = async (event: any) => {
    setProofModal({ open: true, event, step: 'attesting' })
    try {
      // Pass chainKey: 1 for Sepolia, 3 for Mainnet
      const isSepolia = event.etherscanUrl?.includes('sepolia') || event.network === 'sepolia'
      const { data } = await apiInstance.post('/credit-oracle/fetch-proof', {
        sourceTxHash: event.sourceTxHash,
        blockHeight: event.blockHeight,
        chainKey: isSepolia ? 1 : 3,
      })
      const proofData = data?.data || data
      setProofModal(prev => ({ ...prev, step: 'fetched', proofData }))
    } catch (err: any) {
      setProofModal(prev => ({ ...prev, step: 'idle', error: err.response?.data?.message || err.message || 'Failed to fetch proof' }))
    }
  }

  /* ─── Submit proof to CC3 (step 4: MetaMask signature + contract call) ─── */
  const handleSubmitToCC3 = async () => {
    const { event, proofData } = proofModal
    if (!event || !proofData) return
    setProofModal(prev => ({ ...prev, step: 'submitting', error: undefined }))
    try {
      if (!window.ethereum) throw new Error('MetaMask not found')

      // Must match contract's _validateBorrowerAuthorization format:
      // keccak256(abi.encodePacked(borrower, oracleAddress, chainId, nonce))
      const cc3RpcUrl = process.env.NEXT_PUBLIC_CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network'
      const cc3Provider = new ethers.JsonRpcProvider(cc3RpcUrl, 102031, {
        staticNetwork: ethers.Network.from(102031),
      })
      const oracleContract = new ethers.Contract(
        SANAD_CREDIT_ORACLE_ADDRESS,
        ['function nonces(address) external view returns (uint256)'],
        cc3Provider
      )
      let currentNonce = BigInt(0)
      try {
        currentNonce = await oracleContract.nonces(discoverAddress)
      } catch (e) { /* default 0 */ }

      const innerHash = ethers.solidityPackedKeccak256(
        ['address', 'address', 'uint256', 'uint256'],
        [discoverAddress, SANAD_CREDIT_ORACLE_ADDRESS, 102031, currentNonce]
      )
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const signer = await browserProvider.getSigner()
      const signature = await signer.signMessage(ethers.getBytes(innerHash))
      if (!signature || signature.length !== 132) throw new Error('Invalid signature')

      const { data } = await apiInstance.post('/credit-oracle/prove-event', {
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
      setProofModal(prev => ({ ...prev, step: 'done', proofData: { ...prev.proofData, submitResult: result } }))
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['credit-profile', walletAddress] })
        queryClient.invalidateQueries({ queryKey: ['proven-events', walletAddress] })
      }
    } catch (err: any) {
      setProofModal(prev => ({ ...prev, step: 'fetched', error: err.message }))
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

  const scoreColor = score >= 800 ? "text-emerald-600" : score >= 600 ? "text-amber-600" : score >= 400 ? "text-orange-600" : "text-red-500"
  const scoreRing = score >= 800 ? "stroke-emerald-500" : score >= 600 ? "stroke-amber-500" : score >= 400 ? "stroke-orange-500" : "stroke-red-500"

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/borrower">
          <Button variant="ghost" size="sm" className="rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <p className={LABEL}>Attestcoin Protocol</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            Credit Profile
          </h1>
          <p className="mt-1 text-sm text-[#4A4A4A]">
            On-chain credit score derived from proven DeFi repayment history
          </p>
        </div>
      </div>

      {/* Attestcoin Protocol Card */}
      <div className={`${GLASS} overflow-hidden`}>
        <div className="flex items-stretch">
          <div className="flex items-center justify-center bg-[#171414] px-8">
            <Fingerprint className="h-10 w-10 text-[#E1BAC2]" />
          </div>
          <div className="flex-1 px-6 py-5">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-display text-lg font-bold text-[#171414]">Attestcoin Credit Oracle</h3>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">CC3 Testnet</Badge>
            </div>
            <p className="text-sm text-[#4A4A4A]">
              Your credit score is derived from cryptographically proven DeFi repayment events on Ethereum Sepolia testnet, verified on-chain via Attestcoin&apos;s Block Prover. Each event is independently verified against the Ethereum state trie.
            </p>
          </div>
        </div>
      </div>

      {profileLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#E1BAC2]" />
        </div>
      ) : (
        <>
          {/* Score + Stats Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Credit Score Circle */}
            <div className={`${GLASS} p-8 flex flex-col items-center justify-center`}>
              <p className={LABEL}>Credit Score</p>
              <div className="relative my-4">
                <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    className={scoreRing}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 1000) * 314} 314`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`font-display text-4xl font-extrabold ${scoreColor}`}>{score}</span>
                  <span className="font-mono text-[10px] text-[#4A4A4A]">/ 1000</span>
                </div>
              </div>
              <Badge className={`${tierInfo.bg} ${tierInfo.color} border font-mono text-[11px] font-bold`}>
                Tier {tier}: {tierInfo.label}
              </Badge>
            </div>

            {/* Credit Breakdown */}
            <div className={`${GLASS} p-6 space-y-4`}>
              <p className={LABEL}>Credit Breakdown</p>
              {[
                { label: "Total Repaid", value: formatVolume(totalRepaid), icon: CheckCircle, color: "text-emerald-600" },
                { label: "Liquidations", value: formatVolume(totalLiquidated), icon: AlertTriangle, color: "text-amber-600" },
                { label: "Defaults", value: formatVolume(totalDefaulted), icon: AlertTriangle, color: "text-red-500" },
                { label: "Clean Repayments", value: cleanRepayments, icon: Shield, color: "text-emerald-600" },
                { label: "Liquidation Events", value: liquidations, icon: AlertTriangle, color: "text-amber-600" },
                { label: "Default Events", value: defaults, icon: AlertTriangle, color: "text-red-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <span className="text-sm text-[#4A4A4A]">{item.label}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#171414]">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Proven Events Summary */}
            <div className={`${GLASS} p-6 space-y-4`}>
              <p className={LABEL}>Proven Events</p>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E1BAC2]/10">
                  <Link2 className="h-6 w-6 text-[#E1BAC2]" />
                </div>
                <div>
                  <p className="font-display text-2xl font-extrabold text-[#171414]">{provenCount}</p>
                  <p className="text-xs text-[#4A4A4A]">Events verified on CC3</p>
                </div>
              </div>
              {profile?.lastEvaluatedTimestamp && (
                <div className="flex items-center gap-2 text-xs text-[#4A4A4A]">
                  <Clock className="h-3 w-3" />
                  Last evaluated: {new Date(Number(profile.lastEvaluatedTimestamp) * 1000).toLocaleDateString()}
                </div>
              )}
              <div className="rounded-2xl border border-[#171414]/10 p-3 bg-[#FAFAF8]">
                <p className="font-mono text-[10px] text-[#4A4A4A]">Wallet</p>
                <p className="font-mono text-[10px] text-[#171414] mt-0.5 truncate">{walletAddress || "Not connected"}</p>
              </div>
            </div>
          </div>

          {/* Tabs: Events + Discover */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2 rounded-full bg-[#171414]/5 p-1">
              <TabsTrigger value="score" className="rounded-full font-display text-sm font-bold data-[state=active]:bg-[#171414] data-[state=active]:text-[#E1BAC2]">
                <Activity className="h-4 w-4 mr-1.5" /> Proven Events
              </TabsTrigger>
              <TabsTrigger value="discover" className="rounded-full font-display text-sm font-bold data-[state=active]:bg-[#171414] data-[state=active]:text-[#E1BAC2]">
                <Fingerprint className="h-4 w-4 mr-1.5" /> Discover History
              </TabsTrigger>
            </TabsList>

            {/* ─── Proven Events ─── */}
            <TabsContent value="score">
              <div className={`${GLASS} p-6`}>
                <p className={LABEL}>On-Chain Verified Events</p>
                <p className="mt-1 text-sm text-[#4A4A4A] mb-6">DeFi events cryptographically proven via Attestcoin Block Prover on CC3</p>

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
                    <p className="mt-1 text-sm text-[#4A4A4A]">Discover your DeFi history to generate Attestcoin proofs</p>
                    <Button className={`${BTN} mt-4`} onClick={() => setActiveTab("discover")}>
                      <Fingerprint className="h-3.5 w-3.5 mr-1.5" /> Discover History
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#171414]/10">
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Protocol</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Event</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Value (USD)</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Block</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Tx Hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {provenEvents.map((event, i) => {
                          const isRepayment = event.eventType === 0
                          const isLiquidation = event.eventType === 1
                          return (
                            <TableRow key={i} className="border-[#171414]/5 hover:bg-[#E1BAC2]/5">
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-[10px] border-[#171414]/15">
                                  {PROTOCOL_NAMES[event.protocol] || `Protocol ${event.protocol}`}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={`font-mono text-[10px] ${
                                  event.eventType === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                  event.eventType === 1 || event.eventType === 2 ? "bg-red-50 text-red-600 border-red-200" :
                                  event.eventType === 4 ? "bg-blue-50 text-blue-600 border-blue-200" :
                                  "bg-[#171414]/5 text-[#171414] border-[#171414]/10"
                                }`}>
                                  {EVENT_TYPE_NAMES[event.eventType] || `Event ${event.eventType}`}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs font-bold text-[#171414] whitespace-nowrap">
                                {formatVolume(event.volumeUSD)}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-[#4A4A4A]">
                                #{event.blockHeight}
                              </TableCell>
                              <TableCell>
                                <a href={`https://etherscan.io/tx/${event.sourceTxHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-[#171414] hover:text-[#E1BAC2] transition-colors">
                                  {event.sourceTxHash?.slice(0, 10)}...
                                  <ExternalLink className="inline h-3 w-3 ml-1" />
                                </a>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  className={BTN + " text-[9px] px-3 py-1"}
                                  onClick={() => handleFetchProof(event)}
                                >
                                  <Shield className="h-3 w-3 mr-1" /> Verify
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ─── Discover History ─── */}
            <TabsContent value="discover">
              <div className={`${GLASS} p-6`}>
                <p className={LABEL}>Discover DeFi History</p>
                <p className="mt-1 text-sm text-[#4A4A4A] mb-6">
                  Scan your Ethereum Sepolia wallet for DeFi lending activity. Attestcoin will generate cryptographic proofs for verified events on CC3 testnet.
                </p>

                <div className="flex gap-3 mb-6">
                  <div className="relative flex-1">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A] shrink-0" />
                    <input
                      placeholder="0x... Ethereum address"
                      className={`w-full font-mono text-sm py-2.5 pl-10 pr-4 rounded-xl border border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2] focus-visible:ring-1 outline-none`}
                      value={discoverAddress}
                      onChange={(e) => setDiscoverAddress(e.target.value.trim())}
                    />
                  </div>
                  <Button className={BTN} onClick={handleDiscover} disabled={discovering || !discoverAddress}>
                    {discovering ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5 mr-1.5" />}
                    {discovering ? "Scanning..." : "Discover"}
                  </Button>
                </div>

                {discoveryResult && (
                  <div className="space-y-4">
                    {discoveryResult.message && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm text-amber-700">{discoveryResult.message}</p>
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
                          <div key={s.label} className="rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                            <p className={LABEL}>{s.label}</p>
                            <p className="mt-1 font-display text-xl font-extrabold text-[#171414]">{s.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {discoveryResult.selectedTopEvents && discoveryResult.selectedTopEvents.length > 0 && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-[#171414]/10">
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Protocol</TableHead>
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Event</TableHead>
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Token</TableHead>
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Value (USD)</TableHead>
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Weight</TableHead>
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Tx</TableHead>
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {discoveryResult.selectedTopEvents.map((event: any, i: number) => (
                              <TableRow key={i} className="border-[#171414]/5 hover:bg-[#E1BAC2]/5">
                                <TableCell>
                                  <Badge variant="outline" className="font-mono text-[10px] border-[#171414]/15">
                                    {event.protocolName || PROTOCOL_NAMES[event.protocol] || `Protocol ${event.protocol}`}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`font-mono text-[10px] ${
                                    event.eventType === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                    event.eventType === 1 || event.eventType === 2 ? "bg-red-50 text-red-600 border-red-200" :
                                    event.eventType === 4 ? "bg-blue-50 text-blue-600 border-blue-200" :
                                    "bg-[#171414]/5 text-[#171414] border-[#171414]/10"
                                  }`}>
                                    {event.eventTypeName || EVENT_TYPE_NAMES[event.eventType] || `Event ${event.eventType}`}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono text-[10px] border-[#171414]/15">
                                    {event.tokenSymbol || '—'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs font-bold text-[#171414] whitespace-nowrap">
                                  {formatVolume(event.volumeUSD)}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-[#4A4A4A]">
                                  {event.weightScore || "—"}
                                </TableCell>
                                <TableCell>
                                  <a href={event.etherscanUrl || `https://etherscan.io/tx/${event.sourceTxHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-[#171414] hover:text-[#E1BAC2] transition-colors">
                                    {event.sourceTxHash?.slice(0, 10)}...
                                    <ExternalLink className="inline h-3 w-3 ml-1" />
                                  </a>
                                </TableCell>
                                <TableCell>
                                  {isOwnWallet ? (
                                    <Button
                                      size="sm"
                                      className="rounded-full bg-[#171414] font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black px-3 py-1"
                                      onClick={() => handleFetchProof(event)}
                                      disabled={provingEvent === event.sourceTxHash}
                                    >
                                      {provingEvent === event.sourceTxHash ? (
                                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Proving...</>
                                      ) : (
                                        <><Shield className="h-3 w-3 mr-1" /> Prove</>
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="rounded-full bg-[#171414]/80 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2]/80 hover:bg-[#171414] px-3 py-1"
                                      onClick={() => handleFetchProof(event)}
                                    >
                                      <Shield className="h-3 w-3 mr-1" /> Prove
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ─── Attestcoin Proof Modal ─── */}
      {proofModal.open && proofModal.event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setProofModal({ open: false, step: 'idle' })}>
          <div className="glass-panel w-full max-w-lg mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#171414]/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171414]">
                  <Fingerprint className="h-4.5 w-4.5 text-[#E1BAC2]" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-[#171414]">Attestcoin Proof</p>
                  <p className="font-mono text-[10px] text-[#4A4A4A]">{proofModal.event.sourceTxHash?.slice(0, 18)}...</p>
                </div>
              </div>
              <button onClick={() => setProofModal({ open: false, step: 'idle' })} className="rounded-full p-1.5 hover:bg-[#171414]/5">
                <span className="sr-only">Close</span>
                <svg className="h-4 w-4 text-[#4A4A4A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Event Summary */}
            <div className="px-6 py-4 bg-[#FAFAF8] border-b border-[#171414]/5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className={LABEL}>Event</p>
                  <p className="font-display text-sm font-bold text-[#171414]">{proofModal.event.eventTypeName}</p>
                </div>
                <div>
                  <p className={LABEL}>Token</p>
                  <p className="font-display text-sm font-bold text-[#171414]">{proofModal.event.tokenSymbol || '—'}</p>
                </div>
                <div>
                  <p className={LABEL}>Value</p>
                  <p className="font-display text-sm font-bold text-[#171414]">{formatVolume(proofModal.event.volumeUSD)}</p>
                </div>
              </div>
            </div>

            {/* Step Progress */}
            <div className="px-6 py-5 space-y-4">
              {/* Step 1: Attestation */}
              <div className="flex items-start gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${proofModal.step === 'attesting' ? 'bg-[#171414] animate-pulse' : proofModal.step !== 'idle' ? 'bg-emerald-500' : 'bg-[#171414]/10'}`}>
                  {proofModal.step !== 'idle' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <span className="font-mono text-[10px] font-bold text-[#171414]">1</span>
                  )}
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-[#171414]">Block Attestation</p>
                  <p className="text-xs text-[#4A4A4A]">
                    {proofModal.step === 'attesting'
                      ? 'Waiting for Ethereum block to be attested by Attestcoin Prover...'
                      : proofModal.step !== 'idle'
                      ? `Block #${proofModal.event.blockHeight} attested ✓`
                      : 'Pending'
                    }
                  </p>
                </div>
              </div>

              {/* Step 2: Proof Generation */}
              <div className="flex items-start gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${proofModal.step === 'fetched' || proofModal.step === 'submitting' || proofModal.step === 'done' ? 'bg-emerald-500' : proofModal.step === 'attesting' ? 'bg-[#171414] animate-pulse' : 'bg-[#171414]/10'}`}>
                  {proofModal.step === 'fetched' || proofModal.step === 'submitting' || proofModal.step === 'done' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <span className="font-mono text-[10px] font-bold text-[#171414]">2</span>
                  )}
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-[#171414]">Proof Generated</p>
                  <p className="text-xs text-[#4A4A4A]">
                    {proofModal.step === 'attesting'
                      ? 'Waiting for attestation...'
                      : proofModal.step === 'fetched' || proofModal.step === 'submitting' || proofModal.step === 'done'
                      ? `Merkle proof + continuity proof ready ✓`
                      : 'Pending'
                    }
                  </p>
                </div>
              </div>

              {/* Step 3: Submit to CC3 */}
              <div className="flex items-start gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${proofModal.step === 'done' ? 'bg-emerald-500' : proofModal.step === 'submitting' ? 'bg-[#171414] animate-pulse' : 'bg-[#171414]/10'}`}>
                  {proofModal.step === 'done' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <span className="font-mono text-[10px] font-bold text-[#171414]">3</span>
                  )}
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-[#171414]">Submit to CC3</p>
                  <p className="text-xs text-[#4A4A4A]">
                    {proofModal.step === 'submitting'
                      ? 'Submitting proof to SanadCreditOracle on CC3...'
                      : proofModal.step === 'done'
                      ? 'Proof recorded on-chain ✓'
                      : proofModal.step === 'fetched'
                      ? 'Ready to submit — requires MetaMask signature'
                      : 'Pending'
                    }
                  </p>
                </div>
              </div>

              {/* Proof Data (when fetched) */}
              {proofModal.proofData && proofModal.step !== 'attesting' && (
                <div className="rounded-xl border border-[#171414]/10 bg-[#171414] p-4 space-y-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2]/60">Proof Data</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-[#E1BAC2]/50">Chain Key</span>
                      <span className="font-mono text-[10px] text-[#E1BAC2]">{proofModal.proofData.chainKey} ({proofModal.proofData.chainKey === 1 ? 'Ethereum Sepolia' : 'Ethereum Mainnet'})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-[#E1BAC2]/50">Block Height</span>
                      <span className="font-mono text-[10px] text-[#E1BAC2]">#{proofModal.proofData.blockHeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-[#E1BAC2]/50">Merkle Root</span>
                      <span className="font-mono text-[10px] text-[#E1BAC2] truncate ml-4">{proofModal.proofData.merkleProof?.root?.slice(0, 22)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-[#E1BAC2]/50">Merkle Siblings</span>
                      <span className="font-mono text-[10px] text-[#E1BAC2]">{proofModal.proofData.merkleProof?.siblings?.length || 0} hashes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-[#E1BAC2]/50">Continuity Roots</span>
                      <span className="font-mono text-[10px] text-[#E1BAC2]">{proofModal.proofData.continuityProof?.roots?.length || 0} roots</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {proofModal.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs text-red-600">{proofModal.error}</p>
                </div>
              )}

              {/* CC3 submission result */}
              {proofModal.step === 'done' && proofModal.proofData?.submitResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <p className="text-xs font-bold text-emerald-700">Proof Recorded on CC3</p>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-[#4A4A4A]">Credit Score</span>
                      <span className="font-mono text-[10px] font-bold text-[#171414]">{proofModal.proofData.submitResult.score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-[#4A4A4A]">Tier</span>
                      <span className="font-mono text-[10px] font-bold text-[#171414]">{proofModal.proofData.submitResult.tier}</span>
                    </div>
                    {proofModal.proofData.submitResult.transactionHash && (
                      <a
                        href={`https://creditcoin-testnet.blockscout.com/tx/${proofModal.proofData.submitResult.transactionHash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        {proofModal.proofData.submitResult.transactionHash.slice(0, 20)}... <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-[#171414]/10 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full font-mono text-[10px] text-[#4A4A4A]"
                onClick={() => setProofModal({ open: false, step: 'idle' })}
              >
                Close
              </Button>
              {proofModal.step === 'fetched' && (
                <Button
                  size="sm"
                  className="rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black px-4"
                  onClick={handleSubmitToCC3}
                >
                  <Shield className="h-3 w-3 mr-1.5" /> Submit to CC3
                </Button>
              )}
              {proofModal.step === 'submitting' && (
                <Button
                  size="sm"
                  disabled
                  className="rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] px-4"
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
