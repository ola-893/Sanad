"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { toast } from "sonner"
import {
  Gem,
  Clock,
  CheckCircle2,
  XCircle,
  Store,
  Weight,
  Sparkles,
  MessageSquare,
  Loader2,
  RefreshCw,
  FileText,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface GoldDetails {
  assetType: string
  karat: number
  weightG: number
  purity: number
  estimatedValue: number
  description?: string
  imageUrl?: string[]
}

interface PledgeRequest {
  id: string
  borrowerId: string
  borrowerWallet: string
  pawnshopId: string
  pawnshopWallet: string
  goldDetails: GoldDetails
  requestedAmount: string
  status: string
  pawnshopNotes: string
  sagId: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  completed: "border-blue-200 bg-blue-50 text-blue-700",
}

export default function PawnshopRequestsPage() {
  const [requests, setRequests] = useState<PledgeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [actionModal, setActionModal] = useState<{ id: string; action: "accept" | "reject" } | null>(null)
  const [notes, setNotes] = useState("")
  const [processing, setProcessing] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = filter !== "all" ? `?status=${filter}` : ""
      const res = await apiInstance.get(`/pledge-requests/mine${params}`)
      setRequests(res.data.data || [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const handleAction = async () => {
    if (!actionModal) return
    setProcessing(true)
    try {
      await apiInstance.patch(`/pledge-requests/${actionModal.id}/${actionModal.action}`, {
        notes: notes || undefined,
      })
      toast.success(
        actionModal.action === "accept"
          ? "Request accepted! The borrower will be notified."
          : "Request rejected. The borrower will be notified."
      )
      setActionModal(null)
      setNotes("")
      fetchRequests()
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Action failed")
    } finally {
      setProcessing(false)
    }
  }

  const pending = requests.filter((r) => r.status === "pending")
  const accepted = requests.filter((r) => r.status === "accepted")
  const others = requests.filter((r) => r.status !== "pending" && r.status !== "accepted")

  return (
    <ProtectedRoute requiredRole="pawnshop">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="kicker-gold">Pawnshop Portal</p>
              <h1 className="text-3xl font-display font-bold text-[#171414]">
                Pledge Requests
              </h1>
              <p className="text-muted-foreground mt-1">
                Review incoming gold pledge requests from borrowers
              </p>
            </div>
            <Button
              variant="outline"
              onClick={fetchRequests}
              disabled={loading}
              className="rounded-xl gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-4 grid-cols-3">
            <Card className={`${glass} border-l-4 border-l-amber-400`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-[#171414]">{pending.length}</p>
                  </div>
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={`${glass} border-l-4 border-l-emerald-400`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Accepted</p>
                    <p className="text-2xl font-bold text-[#171414]">{accepted.length}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={`${glass} border-l-4 border-l-slate-300`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Other</p>
                    <p className="text-2xl font-bold text-[#171414]">{others.length}</p>
                  </div>
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {["all", "pending", "accepted", "rejected"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-[#171414] text-[#E1BAC2]"
                    : "bg-[#171414]/5 text-muted-foreground hover:bg-[#171414]/10"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Request List */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <Card className={glass}>
              <CardContent className="p-12 text-center">
                <Gem className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No {filter !== "all" ? filter : ""} requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <Card key={req.id} className={glass}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Borrower + Gold Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E1BAC2]/20">
                            <Store className="h-4 w-4 text-[#171414]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#171414]">
                              Borrower: {req.borrowerWallet.slice(0, 6)}...{req.borrowerWallet.slice(-4)}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-lg border border-[#171414]/10 bg-[#FAFAF8] p-3">
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Asset</p>
                            <p className="text-sm font-medium text-[#171414]">
                              {req.goldDetails.assetType} {req.goldDetails.karat}K
                            </p>
                          </div>
                          <div className="rounded-lg border border-[#171414]/10 bg-[#FAFAF8] p-3">
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Weight</p>
                            <p className="text-sm font-medium text-[#171414]">{req.goldDetails.weightG}g</p>
                          </div>
                          <div className="rounded-lg border border-[#171414]/10 bg-[#FAFAF8] p-3">
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Purity</p>
                            <p className="text-sm font-medium text-[#171414]">{req.goldDetails.purity}</p>
                          </div>
                          <div className="rounded-lg border border-[#171414]/10 bg-[#FAFAF8] p-3">
                            <p className="text-[10px] font-mono uppercase text-muted-foreground">Est. Value</p>
                            <p className="text-sm font-bold text-[#171414]">
                              {req.goldDetails.estimatedValue?.toLocaleString()} MYR
                            </p>
                          </div>
                        </div>

                        {req.goldDetails.description && (
                          <p className="text-xs text-muted-foreground italic">
                            "{req.goldDetails.description}"
                          </p>
                        )}

                        {req.pawnshopNotes && (
                          <div className="rounded-lg border border-[#171414]/10 bg-[#FAFAF8] p-3">
                            <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Your Notes</p>
                            <p className="text-xs text-[#171414]">{req.pawnshopNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Status + Actions */}
                      <div className="flex flex-col items-end gap-2 min-w-[120px]">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${STATUS_COLORS[req.status] || ""}`}
                        >
                          {req.status}
                        </Badge>

                        {req.status === "pending" && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActionModal({ id: req.id, action: "reject" })}
                              className="rounded-lg gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setActionModal({ id: req.id, action: "accept" })}
                              className="rounded-lg gap-1 bg-[#171414] text-[#E1BAC2] hover:bg-black"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Accept
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accept/Reject Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="font-display">
                {actionModal.action === "accept" ? "Accept Request" : "Reject Request"}
              </CardTitle>
              <CardDescription>
                {actionModal.action === "accept"
                  ? "Add notes for the borrower about next steps (physical meeting, assessment, etc.)"
                  : "Optionally provide a reason for rejection"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder={
                    actionModal.action === "accept"
                      ? "e.g., Please bring the gold to our branch at Jalan Tun Razak. Open 9am-5pm."
                      : "e.g., We currently don't accept this type of gold."
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setActionModal(null); setNotes("") }}
                  disabled={processing}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={processing}
                  className={`rounded-xl gap-2 ${
                    actionModal.action === "accept"
                      ? "bg-[#171414] text-[#E1BAC2] hover:bg-black"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {actionModal.action === "accept" ? "Accept & Notify" : "Reject"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  )
}
