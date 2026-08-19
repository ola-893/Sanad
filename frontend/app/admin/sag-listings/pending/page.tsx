"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Clock, Eye, CheckCircle, XCircle, AlertTriangle, RefreshCw, Coins, Shield } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { toast } from "sonner"

interface SAGItem {
  sagId: string
  sagName: string
  sagDescription: string
  status: string
  approvalStatus: string
  sagProperties: {
    assetType: string
    weightG: number
    karat: number
    valuation: number
    loan: number
    currency: string
    tenorM: number
    investorRoiPercentage: number
    ltv?: number
    risk_level?: string
    rationale?: string
    mintShare: number
    soldShare: number
  }
  tokenId?: string
  certNo: string
  createdAt: string
}

interface SAGResponse {
  success: boolean
  data: SAGItem[]
  pagination: {
    totalCount: number
    totalPages: number
    currentPage: number
  }
}

export default function PendingSAGListingsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectSagId, setRejectSagId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-pending-sags"],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get("/sag?page_size=50&page_number=1&status=pending")
      return data
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (sagId: string) => {
      const { data } = await apiInstance.post("/sag/approval/approve", { sagId })
      return data
    },
    onSuccess: () => {
      toast.success("SAG approved and listed successfully")
      queryClient.invalidateQueries({ queryKey: ["admin-pending-sags"] })
      queryClient.invalidateQueries({ queryKey: ["admin-all-sags"] })
      queryClient.invalidateQueries({ queryKey: ["admin-active-sags"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to approve SAG")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ sagId, reason }: { sagId: string; reason: string }) => {
      const { data } = await apiInstance.post("/sag/approval/reject", { sagId, reason })
      return data
    },
    onSuccess: () => {
      toast.success("SAG rejected")
      setRejectDialogOpen(false)
      setRejectSagId(null)
      setRejectReason("")
      queryClient.invalidateQueries({ queryKey: ["admin-pending-sags"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to reject SAG")
    },
  })

  const sags = data?.data || []
  const filtered = sags.filter((sag) => {
    const q = searchTerm.toLowerCase()
    return (
      !q ||
      sag.sagName?.toLowerCase().includes(q) ||
      sag.sagId.toLowerCase().includes(q) ||
      sag.sagProperties?.assetType?.toLowerCase().includes(q) ||
      sag.certNo?.toLowerCase().includes(q)
    )
  })

  const totalValue = sags.reduce((sum, sag) => sum + (sag.sagProperties?.valuation || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-5 w-5 text-amber-500" />
            <h1 className="text-2xl font-bold">Pending SAG Listings</h1>
          </div>
          <p className="text-sm text-muted-foreground">Review and approve new SAG collateral listings.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{data?.pagination?.totalCount || 0}</p>
              </div>
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {totalValue > 0 ? `CTC ${(totalValue / 1000).toFixed(0)}K` : "—"}
                </p>
              </div>
              <Coins className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Approval</p>
                <p className="text-2xl font-bold text-amber-600">{sags.length}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search by name, ID, asset type, or cert number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Listings */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending SAG listings to review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((sag) => (
            <Card key={sag.sagId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-lg">
                        {sag.sagName || `SAG #${sag.sagId.slice(-8)}`}
                      </h3>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        PENDING
                      </Badge>
                      {sag.sagProperties?.risk_level && (
                        <Badge variant="outline" className="bg-muted">
                          <Shield className="h-3 w-3 mr-1" />
                          {sag.sagProperties.risk_level.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {sag.sagDescription || `${sag.sagProperties?.assetType} collateral listing`}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Asset Type</p>
                        <p className="font-medium">{sag.sagProperties?.assetType || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Weight</p>
                        <p className="font-medium">{sag.sagProperties?.weightG || "—"}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Karat</p>
                        <p className="font-medium">{sag.sagProperties?.karat || "—"}K</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Duration</p>
                        <p className="font-medium">{sag.sagProperties?.tenorM || "—"} months</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Valuation</p>
                        <p className="font-semibold text-emerald-700">
                          {sag.sagProperties?.currency} {sag.sagProperties?.valuation?.toLocaleString() || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Loan Amount</p>
                        <p className="font-medium">
                          {sag.sagProperties?.currency} {sag.sagProperties?.loan?.toLocaleString() || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">LTV</p>
                        <p className="font-medium">
                          {sag.sagProperties?.ltv ? `${(sag.sagProperties.ltv * 100).toFixed(1)}%` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">ROI</p>
                        <p className="font-medium text-primary">
                          {sag.sagProperties?.investorRoiPercentage || "—"}%
                        </p>
                      </div>
                    </div>

                    {sag.sagProperties?.rationale && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">AI Rationale</p>
                        <p className="text-sm text-muted-foreground">{sag.sagProperties.rationale}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>Cert: {sag.certNo}</span>
                      <span>ID: {sag.sagId.slice(0, 12)}...</span>
                      <span>Created: {new Date(sag.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => approveMutation.mutate(sag.sagId)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setRejectSagId(sag.sagId)
                        setRejectDialogOpen(true)
                      }}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Reject SAG Listing</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this SAG listing. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Input
                id="reject-reason"
                placeholder="e.g. Insufficient documentation, valuation discrepancy..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectSagId && rejectReason.trim()) {
                  rejectMutation.mutate({ sagId: rejectSagId, reason: rejectReason })
                }
              }}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
