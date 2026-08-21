"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye, CheckCircle, XCircle, Clock, Loader2, FileText, AlertTriangle } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const LABEL = "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]/50"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"
const INPUT = "rounded-xl border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2]"
const BTN = "rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black"

interface SAGItem {
  sagId: string
  sagName: string
  sagDescription: string
  status: string
  approvalStatus: string
  sagProperties: {
    loan?: number
    karat: number
    tenorM: number
    weightG: number
    currency: string
    assetType: string
    mintShare: number
    valuation: number
    loanPercentage?: number
    investorRoiPercentage: number
  }
}

export default function PendingSagPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewSag, setViewSag] = useState<SAGItem | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pending-sags"],
    queryFn: async () => {
      const { data } = await apiInstance.get("/sag?page_size=200&page_number=1&status=pending")
      return data
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (sagId: string) => {
      await apiInstance.patch(`/sag/${sagId}/approval`, { approvalStatus: "approved" })
    },
    onSuccess: () => {
      toast.success("SAG approved successfully")
      queryClient.invalidateQueries({ queryKey: ["admin-pending-sags"] })
      queryClient.invalidateQueries({ queryKey: ["admin-sags"] })
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to approve"),
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ sagId, reason }: { sagId: string; reason: string }) => {
      await apiInstance.patch(`/sag/${sagId}/approval`, { approvalStatus: "rejected", rejectionReason: reason })
    },
    onSuccess: () => {
      toast.success("SAG rejected")
      setShowRejectDialog(false)
      setViewSag(null)
      setRejectReason("")
      queryClient.invalidateQueries({ queryKey: ["admin-pending-sags"] })
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to reject"),
  })

  const sags: SAGItem[] = data?.data || []
  const total = data?.pagination?.totalCount || sags.length

  const filtered = sags.filter((sag) => {
    const q = searchQuery.toLowerCase()
    return !q || sag.sagName.toLowerCase().includes(q) || sag.sagId.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className={LABEL}>Pending Approval</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            SAG Review Queue
          </h1>
          <p className="mt-1 text-sm text-[#4A4A4A]">
            Review and approve new SAG listings before tokenization
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`${GLASS} p-5`}>
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/10">
            <Clock className="h-4 w-4 text-[#E1BAC2]" />
          </div>
          <p className={LABEL}>Awaiting Review</p>
          <p className={`mt-1 ${VALUE}`}>{isLoading ? "—" : total}</p>
        </div>
        <div className={`${GLASS} p-5`}>
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/10">
            <FileText className="h-4 w-4 text-[#E1BAC2]" />
          </div>
          <p className={LABEL}>Total Valuation</p>
          <p className={`mt-1 ${VALUE}`}>
            CTC {sags.reduce((sum, s) => sum + (s.sagProperties?.valuation || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className={`${GLASS} p-5`}>
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/10">
            <AlertTriangle className="h-4 w-4 text-[#E1BAC2]" />
          </div>
          <p className={LABEL}>Avg Loan %</p>
          <p className={`mt-1 ${VALUE}`}>
            {sags.length > 0
              ? `${(sags.reduce((sum, s) => sum + (s.sagProperties?.loanPercentage || 0), 0) / sags.length).toFixed(0)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className={`${GLASS} p-6`}>
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
          <Input placeholder="Search by name or ID..." className={`pl-10 ${INPUT}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-display text-lg font-bold text-[#171414]">All caught up</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">No pending SAG listings to review</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#171414]/10">
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">SAG</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Asset</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Valuation</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Terms</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sag) => (
                  <TableRow key={sag.sagId} className="border-[#171414]/5 hover:bg-[#E1BAC2]/5">
                    <TableCell>
                      <p className="font-display text-sm font-bold text-[#171414]">{sag.sagName}</p>
                      <p className="font-mono text-[10px] text-[#4A4A4A]">{sag.sagId.slice(0, 12)}...</p>
                      <p className="text-xs text-[#4A4A4A] mt-0.5 max-w-[200px] truncate">{sag.sagDescription}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-[#171414]">{sag.sagProperties.assetType}</p>
                      <p className="font-mono text-[10px] text-[#4A4A4A]">{sag.sagProperties.weightG}g · {sag.sagProperties.karat}K</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs font-bold text-[#171414]">
                        {sag.sagProperties.currency} {sag.sagProperties.valuation.toLocaleString()}
                      </p>
                      <p className="font-mono text-[10px] text-[#4A4A4A]">{sag.sagProperties.loanPercentage}% LTV</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs text-[#171414]">{sag.sagProperties.investorRoiPercentage}% ROI</p>
                      <p className="font-mono text-[10px] text-[#4A4A4A]">{sag.sagProperties.tenorM} months</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" onClick={() => setViewSag(sag)}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                        <Button size="sm" className={`h-8 ${BTN}`} disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(sag.sagId)}>
                          {approveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" /> Approve</>}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-red-500 hover:bg-red-50" onClick={() => { setViewSag(sag); setRejectReason(""); setShowRejectDialog(true) }}>
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewSag && !showRejectDialog} onOpenChange={(o) => !o && setViewSag(null)}>
        <DialogContent className={`${GLASS} sm:max-w-xl`}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-[#171414]">{viewSag?.sagName}</DialogTitle>
            <DialogDescription className="text-[#4A4A4A]">SAG listing details for review</DialogDescription>
          </DialogHeader>
          {viewSag && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                <div><p className={LABEL}>Asset Type</p><p className="text-xs text-[#171414] mt-1">{viewSag.sagProperties.assetType}</p></div>
                <div><p className={LABEL}>Weight</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.weightG}g</p></div>
                <div><p className={LABEL}>Karat</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.karat}K</p></div>
                <div><p className={LABEL}>Valuation</p><p className="font-mono text-xs font-bold text-[#171414] mt-1">{viewSag.sagProperties.currency} {viewSag.sagProperties.valuation.toLocaleString()}</p></div>
                <div><p className={LABEL}>Loan %</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.loanPercentage}%</p></div>
                <div><p className={LABEL}>ROI</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.investorRoiPercentage}%</p></div>
                <div><p className={LABEL}>Tenor</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.tenorM} months</p></div>
                <div><p className={LABEL}>Shares</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.mintShare.toLocaleString()}</p></div>
              </div>
              {viewSag.sagDescription && (
                <div className="rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                  <p className={LABEL}>Description</p>
                  <p className="mt-1 text-xs text-[#171414]">{viewSag.sagDescription}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-full font-display text-sm font-bold" onClick={() => setViewSag(null)}>Close</Button>
            {viewSag && (
              <>
                <Button className={BTN} disabled={approveMutation.isPending} onClick={() => { approveMutation.mutate(viewSag.sagId); setViewSag(null) }}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button variant="ghost" className="rounded-full font-mono text-[10px] text-red-500 hover:bg-red-50" onClick={() => setShowRejectDialog(true)}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className={`${GLASS} sm:max-w-md`}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-[#171414]">Reject SAG Listing</DialogTitle>
            <DialogDescription className="text-[#4A4A4A]">Provide a reason for rejecting {viewSag?.sagName}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className={LABEL}>Rejection Reason *</Label>
            <Textarea placeholder="e.g. Incomplete documentation, valuation discrepancy..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className={`mt-1.5 ${INPUT}`} rows={4} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-full font-display text-sm font-bold" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" className="rounded-full font-mono text-[10px] font-bold" disabled={!rejectReason.trim() || rejectMutation.isPending} onClick={() => viewSag && rejectMutation.mutate({ sagId: viewSag.sagId, reason: rejectReason })}>
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
