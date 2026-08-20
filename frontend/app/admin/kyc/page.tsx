"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, CheckCircle, XCircle, Clock, Search, Download, Eye, UserCheck, Loader2, ShieldAlert } from "lucide-react"
import apiInstance from "@/lib/axios-v1"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface KycApplication {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  icNo?: string
  status: string
  riskScore: number | string
  amlStatus?: string
  submittedDate: string
  reviewedDate: string | null
  documents: string[]
  rejectionReason?: string
  flags?: string[]
  eddSourceOfFunds?: string
  eddApprovedBy?: string
  reviewerNotes?: string
}

export default function KycPage() {
  const [applications, setApplications] = useState<KycApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // View / EDD Modal state
  const [viewApp, setViewApp] = useState<KycApplication | null>(null)
  const [showEddModal, setShowEddModal] = useState(false)
  const [eddSourceOfFunds, setEddSourceOfFunds] = useState("")
  const [eddApprovedBy, setEddApprovedBy] = useState("Compliance Officer - Nadia")
  const [eddNotes, setEddNotes] = useState("")

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/kyc/all")
      if (res.data?.data && Array.isArray(res.data.data)) {
        setApplications(res.data.data)
      }
    } catch (err) {
      console.warn("Could not fetch KYC applications, using current view:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(id)
    try {
      await apiInstance.post(`/kyc/${id}/review`, {
        status,
        reviewerId: "USR_COMPLIANCE_001",
        notes: status === "approved" ? "Standard CDD verification approved." : "Application rejected.",
      })
      await fetchApplications()
    } catch (err: any) {
      console.error("Error updating KYC:", err)
      alert(`Review error: ${err.response?.data?.error || err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEddApprove = async () => {
    if (!viewApp) return
    if (!eddSourceOfFunds.trim()) {
      alert("Source of Funds is required for EDD approval.")
      return
    }
    if (!eddApprovedBy.trim()) {
      alert("Named senior approver is required for EDD approval.")
      return
    }

    setActionLoading(viewApp.id)
    try {
      await apiInstance.post(`/kyc/${viewApp.id}/review`, {
        status: "approved_with_edd",
        reviewerId: "USR_COMPLIANCE_001",
        eddSourceOfFunds,
        eddApprovedBy,
        notes: eddNotes || "Enhanced Due Diligence completed and approved.",
      })
      setShowEddModal(false)
      setViewApp(null)
      await fetchApplications()
    } catch (err: any) {
      console.error("Error submitting EDD approval:", err)
      alert(`EDD Review error: ${err.response?.data?.error || err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredApplications = applications.filter((app) => {
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "pending"
        ? app.status === "pending" || app.status === "submitted" || app.status === "under_review"
        : app.status === selectedStatus || (selectedStatus === "approved" && app.status === "approved_with_edd"))

    const matchesSearch =
      (app.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.icNo || "").toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

  // Calculate live stats
  const totalCount = applications.length
  const approvedCount = applications.filter((a) => a.status === "approved" || a.status === "approved_with_edd").length
  const pendingCount = applications.filter((a) => ["submitted", "pending", "screening", "under_review"].includes(a.status)).length
  const rejectedCount = applications.filter((a) => a.status === "rejected").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Approved</Badge>
      case "approved_with_edd":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Approved (EDD)</Badge>
      case "submitted":
      case "pending":
      case "screening":
      case "under_review":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Pending Review</Badge>
      case "rejected":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRiskBadge = (risk: number | string) => {
    const num = typeof risk === "number" ? risk : parseInt(risk, 10) || 0
    if (num < 30) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
          Low ({num})
        </Badge>
      )
    }
    if (num < 70) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
          Medium ({num})
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300">
        High ({num})
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 font-display">
            <Users className="h-6 w-6 text-primary" />
            KYC & AML Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Malaysia BNM AML/CFT Compliance Pipeline • CDD & Enhanced Due Diligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchApplications}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-panel border border-[#171414]/15">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Registered pipeline records</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border border-[#171414]/15">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : 0}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel border border-[#171414]/15">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting compliance sign-off</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border border-[#171414]/15">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Non-compliant applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border border-[#171414]/15 bg-white/70">
        <CardHeader>
          <CardTitle className="font-display">KYC Applications Queue</CardTitle>
          <CardDescription>Review and manage customer verification requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Applications</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, IC, or ID..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Status Filter</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Applications Table */}
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No KYC applications found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApplications.map((app) => {
                      const isPending = ["submitted", "pending", "screening", "under_review"].includes(app.status)
                      return (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-xs font-medium">
                            {app.id.length > 12 ? app.id.slice(0, 8) + "..." : app.id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{app.name}</div>
                              <div className="text-xs text-muted-foreground">{app.email}</div>
                              {app.icNo && <div className="text-xs font-mono text-muted-foreground">IC: {app.icNo}</div>}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>{getRiskBadge(app.riskScore)}</TableCell>
                          <TableCell className="text-xs">{app.submittedDate || "Recent"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {app.documents?.[0] || "MyKad"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => setViewApp(app)}>
                                <Eye className="h-3 w-3 mr-1" />
                                Details
                              </Button>
                              {isPending && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                                    disabled={actionLoading === app.id}
                                    onClick={() => handleReview(app.id, "approved")}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-amber-600 text-amber-700 hover:bg-amber-50"
                                    disabled={actionLoading === app.id}
                                    onClick={() => {
                                      setViewApp(app)
                                      setShowEddModal(true)
                                    }}
                                  >
                                    <ShieldAlert className="h-3 w-3 mr-1" />
                                    EDD
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={actionLoading === app.id}
                                    onClick={() => handleReview(app.id, "rejected")}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!viewApp && !showEddModal} onOpenChange={(open) => !open && setViewApp(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>KYC Verification Details</DialogTitle>
            <DialogDescription>Full compliance profile for {viewApp?.name}</DialogDescription>
          </DialogHeader>
          {viewApp && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-muted/20">
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase">User ID</p>
                  <p className="font-medium font-mono">{viewApp.userId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase">IC Number</p>
                  <p className="font-medium font-mono">{viewApp.icNo || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase">Email</p>
                  <p className="font-medium">{viewApp.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase">Phone</p>
                  <p className="font-medium">{viewApp.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border p-4 rounded-xl bg-muted/20">
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase">Status</p>
                  <div className="mt-1">{getStatusBadge(viewApp.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase">Risk Score</p>
                  <div className="mt-1">{getRiskBadge(viewApp.riskScore)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase">AML Status</p>
                  <Badge variant="outline" className="mt-1">
                    {viewApp.amlStatus || "clear"}
                  </Badge>
                </div>
              </div>

              {viewApp.eddSourceOfFunds && (
                <div className="border border-amber-200 bg-amber-50/50 p-4 rounded-xl">
                  <p className="text-xs font-bold text-amber-900 uppercase">Enhanced Due Diligence (EDD) Record</p>
                  <p className="mt-1 text-xs text-amber-800">
                    <strong>Source of Funds:</strong> {viewApp.eddSourceOfFunds}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    <strong>Senior Approver:</strong> {viewApp.eddApprovedBy}
                  </p>
                </div>
              )}

              {viewApp.reviewerNotes && (
                <div className="border p-4 rounded-xl bg-muted/10">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Reviewer Notes</p>
                  <p className="mt-1 text-xs text-foreground">{viewApp.reviewerNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewApp(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDD Modal */}
      <Dialog open={showEddModal} onOpenChange={setShowEddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve with Enhanced Due Diligence (EDD)</DialogTitle>
            <DialogDescription>
              Mandated by Bank Negara Malaysia AML/CFT Policy for high-risk / PEP profiles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edd-applicant">Applicant</Label>
              <Input id="edd-applicant" value={viewApp ? `${viewApp.name} (${viewApp.id})` : ""} disabled />
            </div>
            <div>
              <Label htmlFor="edd-funds">Source of Funds / Wealth *</Label>
              <Input
                id="edd-funds"
                placeholder="e.g. Verified business equity, audited dividend returns"
                value={eddSourceOfFunds}
                onChange={(e) => setEddSourceOfFunds(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edd-approver">Named Senior Approver *</Label>
              <Input
                id="edd-approver"
                placeholder="e.g. Head of Compliance - Dato Rahman"
                value={eddApprovedBy}
                onChange={(e) => setEddApprovedBy(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edd-notes">Compliance Notes</Label>
              <Textarea
                id="edd-notes"
                placeholder="Additional audit trail notes..."
                value={eddNotes}
                onChange={(e) => setEddNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEddModal(false)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleEddApprove}>
              Submit EDD Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
