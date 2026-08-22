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
  Coins,
  Activity,
  Link2,
  Wallet,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const LABEL = "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]/50"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"
const INPUT = "rounded-xl border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2]"
const BTN = "rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black"

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
}

const TIER_INFO: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Unrated", color: "text-gray-500", bg: "bg-gray-100" },
  1: { label: "Poor", color: "text-red-600", bg: "bg-red-50" },
  2: { label: "Fair", color: "text-orange-600", bg: "bg-orange-50" },
  3: { label: "Good", color: "text-amber-600", bg: "bg-amber-50" },
  4: { label: "Very Good", color: "text-emerald-600", bg: "bg-emerald-50" },
  5: { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-100" },
}

interface CreditProfile {
  borrower: string
  score: string
  tier: number
  totalRepaidUSD: string
  totalLiquidatedUSD: string
  totalDefaultedUSD: string
  cleanRepaymentCount: number
  liquidationCount: number
  defaultCount: number
  lastEvaluatedTimestamp: string
  provenEventsCount: number
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
  const [proofResult, setProofResult] = useState<{ txHash?: string; score?: string; tier?: string; message?: string } | null>(null)

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

  /* ─── Prove an event (MetaMask signature → backend → CC3) ─── */
  const handleProveEvent = async (event: any) => {
    try {
      setProvingEvent(event.sourceTxHash)
      setProofResult(null)

      // Request MetaMask signature
      if (!window.ethereum) {
        throw new Error('MetaMask not found — please install MetaMask')
      }

      const message = `Sanad Protocol: Verify DeFi credit event for ${discoverAddress}\nEvent: ${event.eventTypeName || 'DeFi Event'}\nTxHash: ${event.sourceTxHash}\nTimestamp: ${event.timestamp}`
      const signature = await (window.ethereum as any).request({
        method: 'personal_sign',
        params: [message, discoverAddress],
      })

      if (!signature) throw new Error('Signature was rejected')

      // Submit to backend → Attestcoin Prover → CC3
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
      setProofResult({
        txHash: result.transactionHash,
        score: result.score,
        tier: result.tier,
        message: result.success ? `Proof submitted! Score: ${result.score} (${result.tier})` : result.error,
      })

      // Refresh credit profile
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['credit-profile', walletAddress] })
        queryClient.invalidateQueries({ queryKey: ['proven-events', walletAddress] })
      }
    } catch (err: any) {
      console.error('Proof error:', err)
      setProofResult({ message: err.message || 'Proof failed — see console for details' })
    } finally {
      setProvingEvent(null)
    }
  }

  const score = profile ? Number(profile.score) : 0
  const tier = profile ? Number(profile.tier) : 0
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
              Your credit score is derived from cryptographically proven DeFi repayment events on Ethereum Mainnet, verified on-chain via Attestcoin&apos;s Block Prover. Each event is independently verified against the Ethereum state trie.
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
                { label: "Total Repaid", value: `$${totalRepaid.toLocaleString()}`, icon: CheckCircle, color: "text-emerald-600" },
                { label: "Liquidations", value: `$${totalLiquidated.toLocaleString()}`, icon: AlertTriangle, color: "text-amber-600" },
                { label: "Defaults", value: `$${totalDefaulted.toLocaleString()}`, icon: AlertTriangle, color: "text-red-500" },
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
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Volume</TableHead>
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
                              <TableCell className="font-mono text-xs font-bold text-[#171414]">
                                ${Number(event.volumeUSD).toLocaleString()}
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
                                  onClick={() => handleProveEvent(event)}
                                  disabled={provingEvent === event.sourceTxHash}
                                >
                                  {provingEvent === event.sourceTxHash ? (
                                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Proving...</>
                                  ) : (
                                    <><Shield className="h-3 w-3 mr-1" /> Prove</>
                                  )}
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
                  Scan your Ethereum Mainnet wallet for DeFi lending activity. Attestcoin will generate cryptographic proofs for verified events.
                </p>

                {/* Demo Profiles for Judges */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#171414]/50">
                      Try Demo Profiles
                    </p>
                    <span className="font-mono text-[9px] text-[#4A4A4A] italic">
                      Prove is only available for your own wallet
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      {
                        label: "Prime Borrower",
                        address: "0x891775eDdcaBABdCE4b476E335a9EEF73123C75b",
                        desc: "1 Clean Repayment · $4K",
                        risk: "low",
                        icon: <CheckCircle className="h-3.5 w-3.5" />,
                      },
                      {
                        label: "Retail DeFi User",
                        address: "0xcad85e1ec294f71f3ca68ef3261f894f50c1c4c3",
                        desc: "1 Clean Repayment · $60",
                        risk: "low",
                        icon: <CheckCircle className="h-3.5 w-3.5" />,
                      },
                      {
                        label: "Collateral Supplier",
                        address: "0x424ae0175afdc844cc3ca87067d959fddae8ff8a",
                        desc: "1 Supply · $600 collateral",
                        risk: "neutral",
                        icon: <Coins className="h-3.5 w-3.5" />,
                      },
                      {
                        label: "⚠️ Liquidated Borrower",
                        address: "0x08cbf44086a86566b38cac15bc38d201689281d5",
                        desc: "1 Liquidation on Aave V2 · Real tx",
                        risk: "high",
                        icon: <AlertTriangle className="h-3.5 w-3.5" />,
                      },
                    ].map((demo) => (
                      <button
                        key={demo.address}
                        onClick={() => {
                          setDiscoverAddress(demo.address)
                          handleDiscoverWithAddress(demo.address)
                        }}
                        disabled={discovering}
                        className={`rounded-xl border p-3 text-left transition-all hover:shadow-md disabled:opacity-50 ${
                          demo.risk === 'high'
                            ? 'border-red-200 bg-red-50/50 hover:bg-red-50'
                            : demo.risk === 'neutral'
                            ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                            : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                        } ${discoverAddress === demo.address ? 'ring-2 ring-[#E1BAC2] shadow-md' : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`
                            ${demo.risk === 'high' ? 'text-red-600' : demo.risk === 'neutral' ? 'text-amber-600' : 'text-emerald-600'}
                          `}>{demo.icon}</span>
                          <span className="text-xs font-bold text-[#171414]">{demo.label}</span>
                        </div>
                        <p className="text-[10px] text-[#4A4A4A] font-mono truncate">{demo.address.slice(0, 10)}...{demo.address.slice(-6)}</p>
                        <p className="text-[10px] text-[#4A4A4A] mt-1">{demo.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

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

                    {/* Proof result feedback */}
                    {proofResult && (
                      <div className={`rounded-2xl border p-4 ${proofResult.txHash ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {proofResult.txHash ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                          <p className={`text-sm font-bold ${proofResult.txHash ? 'text-emerald-700' : 'text-red-600'}`}>
                            {proofResult.txHash ? 'Proof Submitted Successfully' : 'Proof Failed'}
                          </p>
                        </div>
                        <p className="text-xs text-[#4A4A4A] mt-1">{proofResult.message}</p>
                        {proofResult.txHash && (
                          <div className="mt-2 flex items-center gap-3">
                            <a
                              href={`https://creditcoin-testnet.blockscout.com/tx/${proofResult.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-[#171414] hover:text-[#E1BAC2] transition-colors flex items-center gap-1"
                            >
                              {proofResult.txHash.slice(0, 18)}... <ExternalLink className="h-3 w-3" />
                            </a>
                            {proofResult.score && (
                              <Badge className="bg-[#171414] text-[#E1BAC2] font-mono text-[10px]">
                                Score: {proofResult.score} · {proofResult.tier}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {discoveryResult.selectedTopEvents && discoveryResult.selectedTopEvents.length > 0 && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-[#171414]/10">
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Protocol</TableHead>
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Event</TableHead>
                              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Volume</TableHead>
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
                                <TableCell className="font-mono text-xs font-bold text-[#171414]">
                                  ${Number(event.volumeUSD).toLocaleString()}
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
                                      onClick={() => handleProveEvent(event)}
                                      disabled={provingEvent === event.sourceTxHash}
                                    >
                                      {provingEvent === event.sourceTxHash ? (
                                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Proving...</>
                                      ) : (
                                        <><Shield className="h-3 w-3 mr-1" /> Prove</>
                                      )}
                                    </Button>
                                  ) : (
                                    <span className="font-mono text-[9px] text-[#4A4A4A] italic">
                                      Demo only
                                    </span>
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
    </div>
  )
}
