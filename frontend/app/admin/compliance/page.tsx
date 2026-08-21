"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Shield,
  Scale,
  Lock,
  Unlock,
  Flame,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Clock,
  Coins,
  FileCheck,
  Loader2,
  CheckCircle,
  Search,
  Link2,
  Fingerprint,
} from "lucide-react"

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const LABEL = "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]/50"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"
const INPUT = "rounded-xl border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2]"
const BTN = "rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black"

interface AuditLogEntry {
  id: string
  eventType: string
  tokenId: string
  blockNumber: number
  transactionHash: string
  timestamp: string
  details: any
}

interface KycAuditEntry {
  id: string
  userId: string
  eventType: string
  actor: string
  details: any
  timestamp: string
}

interface OracleInfo {
  oracleAddress: string
  network: string
  sourceChain: string
  proofApiUrl: string
  explorerUrl: string
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("audit")
  const [filterType, setFilterType] = useState("ALL")

  /* ─── On-chain audit logs ─── */
  const { data: chainLogsData, isLoading: chainLoading, refetch: refetchChain } = useQuery({
    queryKey: ["compliance-chain-logs"],
    queryFn: async () => {
      const { data } = await apiInstance.get("/creditcoin/audit-logs")
      return (data?.logs || []) as AuditLogEntry[]
    },
    refetchInterval: 15_000,
  })

  /* ─── KYC audit logs ─── */
  const { data: kycLogsData, isLoading: kycLoading, refetch: refetchKyc } = useQuery({
    queryKey: ["compliance-kyc-logs"],
    queryFn: async () => {
      const { data } = await apiInstance.get("/kyc/audit-logs")
      return (data?.data || []) as KycAuditEntry[]
    },
  })

  /* ─── Attestcoin Oracle info ─── */
  const { data: oracleInfo } = useQuery({
    queryKey: ["oracle-info"],
    queryFn: async (): Promise<OracleInfo> => {
      const { data } = await apiInstance.get("/credit-oracle/info")
      return data?.data || data
    },
  })

  const chainLogs = chainLogsData || []
  const kycLogs = kycLogsData || []

  const filteredChainLogs = chainLogs.filter((log) => {
    if (filterType === "ALL") return true
    if (filterType === "COMPLIANCE") return log.eventType.includes("FROZEN") || log.eventType.includes("WIPED")
    if (filterType === "MINT") return log.eventType === "COLLATERAL_MINTED"
    if (filterType === "SETTLEMENT") return log.eventType === "REPAYMENT_VERIFIED" || log.eventType.includes("UNLOCKED")
    if (filterType === "LIQUIDATION") return log.eventType.includes("LIQUIDAT") || log.eventType.includes("SURPLUS")
    return true
  })

  const totalEvents = chainLogs.length + kycLogs.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className={LABEL}>Regulatory Oversight</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            Compliance & Attestcoin
          </h1>
          <p className="mt-1 text-sm text-[#4A4A4A]">
            On-chain audit trail, Attestcoin credit proofs, and Shariah enforcement
          </p>
        </div>
        <Button variant="ghost" className="rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" onClick={() => { refetchChain(); refetchKyc() }}>
          <RefreshCw className="h-3 w-3 mr-1" /> Sync
        </Button>
      </div>

      {/* Attestcoin Protocol Banner */}
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
            <p className="text-sm text-[#4A4A4A] mb-3">
              Cryptographic proof of borrower DeFi history on Ethereum Mainnet, verified on-chain via Attestcoin&apos;s Block Prover precompile. Credit scores derived from proven repayment events across 10+ lending protocols.
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              {oracleInfo?.oracleAddress && (
                <div className="flex items-center gap-1.5">
                  <span className={LABEL}>Oracle</span>
                  <a href={oracleInfo.explorerUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-[#171414] hover:text-[#E1BAC2] transition-colors">
                    {oracleInfo.oracleAddress.slice(0, 10)}...{oracleInfo.oracleAddress.slice(-6)}
                    <ExternalLink className="inline h-3 w-3 ml-1" />
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className={LABEL}>Source</span>
                <span className="font-mono text-[10px] text-[#171414]">Ethereum Mainnet</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={LABEL}>Prover</span>
                <span className="font-mono text-[10px] text-[#171414]">Block Prover 0xFD2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "On-Chain Events", value: chainLogs.length, icon: Coins, loading: chainLoading },
          { label: "KYC Events", value: kycLogs.length, icon: FileCheck, loading: kycLoading },
          { label: "Total Audit Records", value: totalEvents, icon: Scale },
          { label: "Compliance Status", value: "AAOIFI", icon: Shield, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className={`${GLASS} p-5`}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/10">
              <s.icon className={`h-4 w-4 ${s.color || "text-[#E1BAC2]"}`} />
            </div>
            <p className={LABEL}>{s.label}</p>
            <p className={`mt-1 ${VALUE} text-xl`}>{s.loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3 rounded-full bg-[#171414]/5 p-1">
          <TabsTrigger value="audit" className="rounded-full font-display text-sm font-bold data-[state=active]:bg-[#171414] data-[state=active]:text-[#E1BAC2]">
            <Coins className="h-4 w-4 mr-1.5" /> On-Chain
          </TabsTrigger>
          <TabsTrigger value="kyc" className="rounded-full font-display text-sm font-bold data-[state=active]:bg-[#171414] data-[state=active]:text-[#E1BAC2]">
            <Shield className="h-4 w-4 mr-1.5" /> KYC Trail
          </TabsTrigger>
          <TabsTrigger value="enforcement" className="rounded-full font-display text-sm font-bold data-[state=active]:bg-[#171414] data-[state=active]:text-[#E1BAC2]">
            <Lock className="h-4 w-4 mr-1.5" /> Enforcement
          </TabsTrigger>
        </TabsList>

        {/* ─── On-Chain Audit Trail ─── */}
        <TabsContent value="audit">
          <div className={`${GLASS} p-6`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
                <Input placeholder="Filter events..." className={`pl-10 ${INPUT}`} disabled />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["ALL", "MINT", "SETTLEMENT", "COMPLIANCE", "LIQUIDATION"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                      filterType === f
                        ? "bg-[#171414] text-[#E1BAC2]"
                        : "bg-[#171414]/5 text-[#171414]/60 hover:bg-[#171414]/10"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {chainLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
              </div>
            ) : filteredChainLogs.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1BAC2]/10">
                  <Coins className="h-7 w-7 text-[#E1BAC2]" />
                </div>
                <p className="font-display text-lg font-bold text-[#171414]">No on-chain events</p>
                <p className="mt-1 text-sm text-[#4A4A4A]">Events will appear as SAGs are minted, settled, and managed</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#171414]/10">
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Event</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Token</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Block</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Details</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Tx Hash</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChainLogs.map((log) => {
                      const isWipe = log.eventType.includes("WIPED")
                      const isFreeze = log.eventType.includes("FROZEN")
                      const isMint = log.eventType === "COLLATERAL_MINTED"
                      const isRepay = log.eventType.includes("REPAYMENT")
                      const isLiq = log.eventType.includes("LIQUIDAT") || log.eventType.includes("SURPLUS")

                      return (
                        <TableRow key={log.id} className="border-[#171414]/5 hover:bg-[#E1BAC2]/5">
                          <TableCell>
                            <Badge className={`font-mono text-[10px] ${
                              isWipe ? "bg-red-50 text-red-600 border-red-200" :
                              isFreeze ? "bg-amber-50 text-amber-600 border-amber-200" :
                              isMint ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                              isRepay ? "bg-blue-50 text-blue-600 border-blue-200" :
                              isLiq ? "bg-purple-50 text-purple-600 border-purple-200" :
                              "bg-[#171414]/5 text-[#171414] border-[#171414]/10"
                            }`}>
                              {log.eventType.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-[#171414]">
                            {log.tokenId ? `#${log.tokenId}` : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-[#4A4A4A]">
                            {log.blockNumber || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-[#4A4A4A] max-w-[200px] truncate">
                            {log.details?.reason ||
                              (log.details?.appraisedValueUSD && `$${log.details.appraisedValueUSD}`) ||
                              (log.details?.amountUSD && `$${log.details.amountUSD}`) ||
                              "—"}
                          </TableCell>
                          <TableCell>
                            {log.transactionHash ? (
                              <a href={`${process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"}/tx/${log.transactionHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-[#171414] hover:text-[#E1BAC2] transition-colors">
                                {log.transactionHash.slice(0, 10)}...
                                <ExternalLink className="inline h-3 w-3 ml-1" />
                              </a>
                            ) : (
                              <span className="font-mono text-[10px] text-[#4A4A4A]">Genesis</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-[10px] text-[#4A4A4A] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
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

        {/* ─── KYC Audit Trail ─── */}
        <TabsContent value="kyc">
          <div className={`${GLASS} p-6`}>
            {kycLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
              </div>
            ) : kycLogs.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1BAC2]/10">
                  <Shield className="h-7 w-7 text-[#E1BAC2]" />
                </div>
                <p className="font-display text-lg font-bold text-[#171414]">No KYC audit events</p>
                <p className="mt-1 text-sm text-[#4A4A4A]">Events will appear as KYC submissions are reviewed</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#171414]/10">
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Event</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">User</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Actor</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Details</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kycLogs.map((log) => {
                      const isApproved = log.eventType.includes("approved")
                      const isRejected = log.eventType.includes("rejected")
                      const isSubmitted = log.eventType.includes("submitted")

                      return (
                        <TableRow key={log.id} className="border-[#171414]/5 hover:bg-[#E1BAC2]/5">
                          <TableCell>
                            <Badge className={`font-mono text-[10px] ${
                              isApproved ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                              isRejected ? "bg-red-50 text-red-600 border-red-200" :
                              isSubmitted ? "bg-[#E1BAC2]/20 text-[#171414] border-[#E1BAC2]/30" :
                              "bg-[#171414]/5 text-[#171414] border-[#171414]/10"
                            }`}>
                              {log.eventType.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-[#171414]">{log.userId?.slice(0, 16)}...</TableCell>
                          <TableCell className="font-mono text-xs text-[#4A4A4A]">{log.actor}</TableCell>
                          <TableCell className="text-xs text-[#4A4A4A] max-w-[250px] truncate">
                            {log.details?.notes || log.details?.riskScore ? `Risk: ${log.details.riskScore}` : JSON.stringify(log.details)}
                          </TableCell>
                          <TableCell className="font-mono text-[10px] text-[#4A4A4A] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
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

        {/* ─── Enforcement Controls ─── */}
        <TabsContent value="enforcement">
          <EnforcementPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   ENFORCEMENT PANEL
   ════════════════════════════════════════════════════════════════════════ */
function EnforcementPanel() {
  const [actionType, setActionType] = useState<"token" | "address">("token")
  const [targetInput, setTargetInput] = useState("")
  const [reasonInput, setReasonInput] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [wipeTokenId, setWipeTokenId] = useState("")
  const [wipeReason, setWipeReason] = useState("")
  const [isWipeOpen, setIsWipeOpen] = useState(false)

  const handleComplianceAction = async (action: "freeze" | "unfreeze") => {
    if (!targetInput || !reasonInput) {
      setActionMessage({ type: "error", text: "Target and reason are required." })
      return
    }
    setActionLoading(true)
    setActionMessage(null)
    try {
      const { data } = await apiInstance.post(`/creditcoin/compliance/${action}`, {
        type: actionType,
        target: targetInput,
        reason: reasonInput,
      })
      if (data.success) {
        setActionMessage({ type: "success", text: `${action.toUpperCase()} executed. Tx: ${data.transactionHash?.slice(0, 16)}...` })
        setTargetInput("")
        setReasonInput("")
      } else {
        setActionMessage({ type: "error", text: data.error || `Failed to ${action}` })
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err?.response?.data?.error || err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdminWipe = async () => {
    if (!wipeTokenId || !wipeReason) return
    setActionLoading(true)
    try {
      const { data } = await apiInstance.post("/creditcoin/compliance/wipe", {
        tokenId: wipeTokenId,
        reason: wipeReason,
      })
      if (data.success) {
        setActionMessage({ type: "success", text: `Token #${wipeTokenId} administratively wiped.` })
        setIsWipeOpen(false)
        setWipeTokenId("")
        setWipeReason("")
      } else {
        setActionMessage({ type: "error", text: data.error || "Wipe failed" })
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err?.response?.data?.error || err.message })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div className={`${GLASS} flex items-center gap-3 px-5 py-4 ${
          actionMessage.type === "success"
            ? "border-l-4 border-l-emerald-500"
            : "border-l-4 border-l-red-500"
        }`}>
          {actionMessage.type === "success"
            ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            : <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />}
          <p className="text-sm text-[#171414]">{actionMessage.text}</p>
        </div>
      )}

      {/* Freeze/Unfreeze Controls */}
      <div className={`${GLASS} p-6`}>
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-5 w-5 text-[#E1BAC2]" />
          <h3 className="font-display text-lg font-bold text-[#171414]">Asset Freeze Controls</h3>
        </div>
        <p className="text-sm text-[#4A4A4A] mb-6">On-chain freeze for individual loans (token) or AML sanctions (address).</p>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label className={LABEL}>Target Type</Label>
            <div className="flex gap-2 mt-2">
              {(["token", "address"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActionType(t)}
                  className={`flex-1 rounded-xl px-3 py-2.5 font-display text-sm font-bold transition-all ${
                    actionType === t
                      ? "bg-[#171414] text-[#E1BAC2]"
                      : "bg-[#171414]/5 text-[#171414]/60 hover:bg-[#171414]/10"
                  }`}
                >
                  {t === "token" ? "Token ID" : "EVM Address"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className={LABEL}>{actionType === "token" ? "Token ID" : "EVM Address"}</Label>
            <Input placeholder={actionType === "token" ? "e.g. 1" : "0x..."} className={`mt-2 font-mono text-sm ${INPUT}`} value={targetInput} onChange={(e) => setTargetInput(e.target.value)} />
          </div>
          <div>
            <Label className={LABEL}>Compliance Reason</Label>
            <Input placeholder="e.g. AML Sanction Alert CC-2026-44" className={`mt-2 ${INPUT}`} value={reasonInput} onChange={(e) => setReasonInput(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" className="rounded-full font-mono text-[10px] font-bold text-amber-600 hover:bg-amber-50" disabled={actionLoading} onClick={() => handleComplianceAction("freeze")}>
            {actionLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Lock className="h-3.5 w-3.5 mr-1.5" />}
            Freeze
          </Button>
          <Button variant="ghost" className="rounded-full font-mono text-[10px] font-bold text-emerald-600 hover:bg-emerald-50" disabled={actionLoading} onClick={() => handleComplianceAction("unfreeze")}>
            {actionLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5 mr-1.5" />}
            Unfreeze
          </Button>
        </div>
      </div>

      {/* Administrative Wipe */}
      <div className={`${GLASS} p-6 border-l-4 border-l-red-400`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-5 w-5 text-red-500" />
              <h3 className="font-display text-lg font-bold text-[#171414]">Administrative Seizure</h3>
            </div>
            <p className="text-sm text-[#4A4A4A]">Forced burn under court order or civil forfeiture. Irreversible.</p>
          </div>
          <Dialog open={isWipeOpen} onOpenChange={setIsWipeOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="rounded-full font-mono text-[10px] font-bold">
                <Flame className="h-3.5 w-3.5 mr-1.5" /> Execute Wipe
              </Button>
            </DialogTrigger>
            <DialogContent className={`${GLASS} sm:max-w-md`}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-bold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Administrative Token Wipe
                </DialogTitle>
                <DialogDescription className="text-[#4A4A4A]">
                  Forced burn (<code>_burn()</code>) on a SAG NFT. Irreversible seizure.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className={LABEL}>SAG Token ID *</Label>
                  <Input placeholder="e.g. 1" className={`mt-1.5 font-mono ${INPUT}`} value={wipeTokenId} onChange={(e) => setWipeTokenId(e.target.value)} />
                </div>
                <div>
                  <Label className={LABEL}>Legal Reason *</Label>
                  <Textarea placeholder="e.g. High Court Order HC-2026-881" className={`mt-1.5 ${INPUT}`} value={wipeReason} onChange={(e) => setWipeReason(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="rounded-full font-display text-sm font-bold" onClick={() => setIsWipeOpen(false)}>Cancel</Button>
                <Button variant="destructive" className="rounded-full font-mono text-[10px] font-bold" disabled={!wipeTokenId || !wipeReason || actionLoading} onClick={handleAdminWipe}>
                  {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Flame className="h-4 w-4 mr-1" />}
                  Confirm Seizure
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
