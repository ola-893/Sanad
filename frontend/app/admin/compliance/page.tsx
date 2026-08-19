"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Scale,
  Shield,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Lock,
  Unlock,
  Flame,
  Search,
  RefreshCw,
  Clock,
  Coins,
  FileCheck
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

interface AuditLogEntry {
  id: string
  eventType: string
  tokenId: string
  blockNumber: number
  transactionHash: string
  timestamp: string
  details: any
}

export default function CompliancePage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>("ALL")
  
  // Action Form State
  const [actionType, setActionType] = useState<"token" | "address">("token")
  const [targetInput, setTargetInput] = useState("")
  const [reasonInput, setReasonInput] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Wipe Modal State
  const [wipeTokenId, setWipeTokenId] = useState("")
  const [wipeReason, setWipeReason] = useState("")
  const [isWipeOpen, setIsWipeOpen] = useState(false)

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const { data } = await apiInstance.get("/creditcoin/audit-logs")
      if (data.success && Array.isArray(data.logs)) {
        setAuditLogs(data.logs)
      }
    } catch (err) {
      console.warn("Could not fetch audit logs from backend:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
    const interval = setInterval(fetchAuditLogs, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleComplianceAction = async (action: "freeze" | "unfreeze") => {
    if (!targetInput || !reasonInput) {
      setActionMessage({ type: "error", text: "Please provide both a target identifier and compliance rationale." })
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
        setActionMessage({
          type: "success",
          text: `Successfully executed ${action.toUpperCase()} on ${actionType} ${targetInput}. Tx: ${data.transactionHash?.slice(0, 16)}...`,
        })
        setTargetInput("")
        setReasonInput("")
        fetchAuditLogs()
      } else {
        setActionMessage({ type: "error", text: data.error || `Failed to execute ${action}` })
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err?.response?.data?.error || err.message || "Network error submitting compliance action" })
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
        setActionMessage({
          type: "success",
          text: `Token #${wipeTokenId} administratively wiped & seized under legal forfeiture.`,
        })
        setIsWipeOpen(false)
        setWipeTokenId("")
        setWipeReason("")
        fetchAuditLogs()
      } else {
        setActionMessage({ type: "error", text: data.error || "Wipe action failed" })
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err?.response?.data?.error || err.message || "Network error" })
    } finally {
      setActionLoading(false)
    }
  }

  const filteredLogs = auditLogs.filter((log) => {
    if (filterType === "ALL") return true
    if (filterType === "COMPLIANCE") return log.eventType.includes("FROZEN") || log.eventType.includes("WIPED")
    if (filterType === "MINT") return log.eventType === "COLLATERAL_MINTED"
    if (filterType === "SETTLEMENT") return log.eventType === "REPAYMENT_VERIFIED" || log.eventType === "COLLATERAL_UNLOCKED"
    if (filterType === "LIQUIDATION") return log.eventType.includes("LIQUIDAT") || log.eventType.includes("SURPLUS") || log.eventType.includes("SHORTFALL")
    return true
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono">
              Creditcoin CC3 L1
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
              Shariah Compliant (AAOIFI)
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Regulator & Compliance Oversight</h1>
          <p className="text-gray-600">
            Real-time on-chain audit trail, role-gated asset freezing, AML enforcement, and Shariah surplus inspection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Sync Ledger
          </Button>
          <Dialog open={isWipeOpen} onOpenChange={setIsWipeOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                <Flame className="h-4 w-4 mr-2" />
                Administrative Seizure / Wipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Execute Administrative Token Wipe
                </DialogTitle>
                <DialogDescription>
                  This action executes a forced administrative burn (<code>_burn()</code>) on the selected SAG NFT,
                  seizing the collateral receipt permanently under court order or civil forfeiture.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-1">
                  <Label htmlFor="wipe-token">SAG Token ID</Label>
                  <Input
                    id="wipe-token"
                    placeholder="e.g. 1"
                    value={wipeTokenId}
                    onChange={(e) => setWipeTokenId(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wipe-reason">Regulatory / Legal Reason</Label>
                  <Input
                    id="wipe-reason"
                    placeholder="e.g. High Court Order HC-2026-881 / Counterfeit Ingot Seizure"
                    value={wipeReason}
                    onChange={(e) => setWipeReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsWipeOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleAdminWipe} disabled={actionLoading}>
                  {actionLoading ? "Executing Wipe..." : "Confirm Forced Seizure"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {actionMessage && (
        <Alert className={actionMessage.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}>
          <AlertTitle className="font-semibold">{actionMessage.type === "success" ? "Compliance Action Broadcast" : "Action Reverted"}</AlertTitle>
          <AlertDescription>{actionMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* High-Level Compliance Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              Shariah Compliance
              <Scale className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">100% Compliant</div>
            <p className="text-xs text-gray-500 mt-1">Zero interest/riba • 100% surplus returned</p>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              Gold Collateral Purity
              <Coins className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">916 Standard (22K)</div>
            <p className="text-xs text-gray-500 mt-1">22K gold standard (916 purity)</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 shadow-sm bg-gradient-to-br from-white to-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              On-Chain Audit Records
              <FileCheck className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{auditLogs.length} Events</div>
            <p className="text-xs text-gray-500 mt-1">Indexed in PostgreSQL from CC3</p>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm bg-gradient-to-br from-white to-gray-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              Grace Period Protection
              <Clock className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">14 Days Protected</div>
            <p className="text-xs text-gray-500 mt-1">No penalty interest during grace</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Compliance Action Control Box */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Enforcement Controls (COMPLIANCE_ROLE)
          </CardTitle>
          <CardDescription>
            Targeted on-chain asset freeze (individual loan dispute) or address freeze (AML blacklist/sanction flag).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-600">Target Type</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={actionType === "token" ? "default" : "outline"}
                  onClick={() => setActionType("token")}
                  className={actionType === "token" ? "bg-emerald-600" : ""}
                >
                  Token ID (Loan)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={actionType === "address" ? "default" : "outline"}
                  onClick={() => setActionType("address")}
                  className={actionType === "address" ? "bg-emerald-600" : ""}
                >
                  EVM Address (Account)
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600">
                {actionType === "token" ? "Token ID" : "EVM Address"}
              </Label>
              <Input
                placeholder={actionType === "token" ? "e.g. 1" : "0x..."}
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="mt-1 font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600">Compliance Reason / Case ID</Label>
              <Input
                placeholder="e.g. AML Sanction Alert CC-2026-44"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => handleComplianceAction("freeze")}
              disabled={actionLoading}
            >
              <Lock className="h-4 w-4 mr-2" />
              {actionLoading ? "Processing..." : `Freeze ${actionType === "token" ? "Token" : "Address"}`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => handleComplianceAction("unfreeze")}
              disabled={actionLoading}
            >
              <Unlock className="h-4 w-4 mr-2" />
              {actionLoading ? "Processing..." : `Unfreeze ${actionType === "token" ? "Token" : "Address"}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Audit Trail Explorer */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-emerald-600" />
                Immutable Regulatory Audit Ledger
              </CardTitle>
              <CardDescription>
                Direct on-chain events indexed from Creditcoin 3 (CC3) with full cryptographic verification hashes.
              </CardDescription>
            </div>
            <Tabs value={filterType} onValueChange={setFilterType} className="w-auto">
              <TabsList className="grid grid-cols-5 text-xs">
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="COMPLIANCE">Compliance</TabsTrigger>
                <TabsTrigger value="MINT">Mint</TabsTrigger>
                <TabsTrigger value="SETTLEMENT">Settlement</TabsTrigger>
                <TabsTrigger value="LIQUIDATION">Liquidation</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-400 opacity-50" />
              <p>No audit events recorded under this filter yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-600 uppercase bg-gray-50/80 border-b">
                  <tr>
                    <th className="px-6 py-3">Event Type</th>
                    <th className="px-6 py-3">Token / Target</th>
                    <th className="px-6 py-3">Block #</th>
                    <th className="px-6 py-3">Details / Rationale</th>
                    <th className="px-6 py-3">Tx Hash & Explorer</th>
                    <th className="px-6 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map((log) => {
                    const isFreeze = log.eventType.includes("FROZEN")
                    const isWipe = log.eventType.includes("WIPED")
                    const isRepay = log.eventType.includes("REPAYMENT")
                    const isLiq = log.eventType.includes("LIQUIDAT")
                    const isSurplus = log.eventType.includes("SURPLUS")

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={
                              isWipe
                                ? "bg-red-100 text-red-800 border-red-300"
                                : isFreeze
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : isSurplus
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : isRepay
                                ? "bg-blue-100 text-blue-800 border-blue-300"
                                : isLiq
                                ? "bg-purple-100 text-purple-800 border-purple-300"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {log.eventType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {log.tokenId ? `Token #${log.tokenId}` : log.details?.account || "N/A"}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">{log.blockNumber || "Pending"}</td>
                        <td className="px-6 py-4 text-xs max-w-xs truncate text-gray-700">
                          {log.details?.reason ||
                            (log.details?.appraisedValueUSD && `Val: $${log.details.appraisedValueUSD} (Loan: $${log.details.loanAmount})`) ||
                            (log.details?.amountUSD && `Amount: $${log.details.amountUSD}`) ||
                            JSON.stringify(log.details)}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <a
                            href={`${process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || 'https://creditcoin-testnet.blockscout.com'}/tx/${log.transactionHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                          >
                            {log.transactionHash ? `${log.transactionHash.slice(0, 10)}...` : "Genesis"}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
