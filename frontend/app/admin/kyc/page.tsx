"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  Loader2,
  ShieldAlert,
  Store,
  Building2,
  MapPin,
  Phone,
  ArrowRight,
  FileText,
  Shield,
} from "lucide-react"
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

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const LABEL = "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]/50"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"
const INPUT = "rounded-xl border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2]"
const BTN_PRIMARY = "rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black"

/* ─── Borrower KYC types ─── */
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

/* ─── Pawnshop KYC types ─── */
interface PawnshopProfile {
  id: string
  userId: string
  walletAddress: string
  businessName: string
  businessRegistrationNo: string
  licenseNumber: string
  licenseExpiry: string
  businessType: string
  yearEstablished: string
  numberOfEmployees: string
  branchCount: string
  businessPhone: string
  businessEmail: string
  website: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  latitude: string
  longitude: string
  operatingHours: Record<string, string>
  servicesOffered: string[]
  kycStatus: string
  kycSubmittedAt: string | null
  kycApprovedAt: string | null
  kycRejectionReason: string | null
  documents: Array<{ name: string; url: string; type: string }>
  status: string
  createdAt: string
  updatedAt: string
}

/* ─── Shared helpers ─── */
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() || ""
  if (s === "approved" || s === "approved_with_edd") {
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">{s === "approved_with_edd" ? "Approved (EDD)" : "Approved"}</Badge>
  }
  if (["submitted", "pending", "screening", "under_review"].includes(s)) {
    return <Badge className="bg-[#E1BAC2]/20 text-[#171414] border-[#E1BAC2]/30 font-mono text-[10px]">Pending</Badge>
  }
  if (s === "rejected") {
    return <Badge className="bg-red-50 text-red-600 border-red-200 font-mono text-[10px]">Rejected</Badge>
  }
  return <Badge variant="secondary" className="font-mono text-[10px]">{status}</Badge>
}

function RiskBadge({ risk }: { risk: number | string }) {
  const num = typeof risk === "number" ? risk : parseInt(String(risk), 10) || 0
  if (num < 30) return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">Low ({num})</Badge>
  if (num < 70) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-mono text-[10px]">Med ({num})</Badge>
  return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-mono text-[10px]">High ({num})</Badge>
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1BAC2]/10">
        <Icon className="h-7 w-7 text-[#E1BAC2]" />
      </div>
      <p className="font-display text-lg font-bold text-[#171414]">{title}</p>
      <p className="mt-1 text-sm text-[#4A4A4A]">{subtitle}</p>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════════════════ */
export default function KycPage() {
  const [activeTab, setActiveTab] = useState("borrower")

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className={LABEL}>Verification Pipeline</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            KYC & AML Review
          </h1>
          <p className="mt-1 text-sm text-[#4A4A4A]">
            Shariah-compliant borrower & pawnshop verification
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-full bg-[#171414]/5 p-1">
          <TabsTrigger
            value="borrower"
            className="flex items-center gap-2 rounded-full font-display text-sm font-bold data-[state=active]:bg-[#171414] data-[state=active]:text-[#E1BAC2]"
          >
            <Users className="h-4 w-4" />
            Borrower KYC
          </TabsTrigger>
          <TabsTrigger
            value="pawnshop"
            className="flex items-center gap-2 rounded-full font-display text-sm font-bold data-[state=active]:bg-[#171414] data-[state=active]:text-[#E1BAC2]"
          >
            <Store className="h-4 w-4" />
            Pawnshop KYC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="borrower">
          <BorrowerKycPanel />
        </TabsContent>

        <TabsContent value="pawnshop">
          <PawnshopKycPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   BORROWER KYC PANEL
   ════════════════════════════════════════════════════════════════════════ */
function BorrowerKycPanel() {
  const [applications, setApplications] = useState<KycApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewApp, setViewApp] = useState<KycApplication | null>(null)
  const [showEddModal, setShowEddModal] = useState(false)
  const [eddSourceOfFunds, setEddSourceOfFunds] = useState("")
  const [eddApprovedBy, setEddApprovedBy] = useState("")
  const [eddNotes, setEddNotes] = useState("")

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/kyc/all")
      if (res.data?.data && Array.isArray(res.data.data)) setApplications(res.data.data)
    } catch (err) {
      console.warn("Could not fetch KYC applications:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchApplications() }, [])

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
      alert(`Review error: ${err.response?.data?.error || err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEddApprove = async () => {
    if (!viewApp) return
    if (!eddSourceOfFunds.trim()) { alert("Source of Funds is required."); return }
    if (!eddApprovedBy.trim()) { alert("Named senior approver is required."); return }
    setActionLoading(viewApp.id)
    try {
      await apiInstance.post(`/kyc/${viewApp.id}/review`, {
        status: "approved_with_edd",
        reviewerId: "USR_COMPLIANCE_001",
        eddSourceOfFunds,
        eddApprovedBy,
        notes: eddNotes || "Enhanced Due Diligence completed.",
      })
      setShowEddModal(false)
      setViewApp(null)
      await fetchApplications()
    } catch (err: any) {
      alert(`EDD error: ${err.response?.data?.error || err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = applications.filter((app) => {
    const matchStatus = selectedStatus === "all" ||
      (selectedStatus === "pending"
        ? ["pending", "submitted", "under_review"].includes(app.status)
        : app.status === selectedStatus || (selectedStatus === "approved" && app.status === "approved_with_edd"))
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || (app.name || "").toLowerCase().includes(q) || (app.email || "").toLowerCase().includes(q) || (app.icNo || "").toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const total = applications.length
  const approved = applications.filter((a) => ["approved", "approved_with_edd"].includes(a.status)).length
  const pending = applications.filter((a) => ["submitted", "pending", "screening", "under_review"].includes(a.status)).length
  const rejected = applications.filter((a) => a.status === "rejected").length

  return (
    <div className="space-y-6 mt-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: total, icon: Users },
          { label: "Approved", value: approved, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Pending", value: pending, icon: Clock, color: "text-[#E1BAC2]" },
          { label: "Rejected", value: rejected, icon: XCircle, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className={`${GLASS} p-5`}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/10">
              <s.icon className={`h-4 w-4 ${s.color || "text-[#E1BAC2]"}`} />
            </div>
            <p className={LABEL}>{s.label}</p>
            <p className={`mt-1 ${VALUE}`}>{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className={`${GLASS} p-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
            <Input
              placeholder="Search by name, email, or IC..."
              className={`pl-10 ${INPUT}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className={`w-40 ${INPUT}`}>
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

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No applications found" subtitle="Borrower KYC submissions will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#171414]/10">
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Applicant</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Status</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Risk</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Submitted</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((app) => {
                  const isPending = ["submitted", "pending", "screening", "under_review"].includes(app.status)
                  return (
                    <TableRow key={app.id} className="border-[#171414]/5 hover:bg-[#E1BAC2]/5">
                      <TableCell>
                        <p className="font-display text-sm font-bold text-[#171414]">{app.name || "Unknown"}</p>
                        <p className="font-mono text-[10px] text-[#4A4A4A]">{app.email}</p>
                        {app.icNo && <p className="font-mono text-[10px] text-[#4A4A4A]">IC: {app.icNo}</p>}
                      </TableCell>
                      <TableCell><StatusBadge status={app.status} /></TableCell>
                      <TableCell><RiskBadge risk={app.riskScore} /></TableCell>
                      <TableCell className="font-mono text-xs text-[#4A4A4A]">{app.submittedDate || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" onClick={() => setViewApp(app)}>
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                          {isPending && (
                            <>
                              <Button size="sm" className={`h-8 rounded-full font-mono text-[10px] font-bold ${BTN_PRIMARY}`} disabled={actionLoading === app.id} onClick={() => handleReview(app.id, "approved")}>
                                {actionLoading === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" /> Approve</>}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-amber-600 hover:bg-amber-50" disabled={actionLoading === app.id} onClick={() => { setViewApp(app); setShowEddModal(true) }}>
                                <ShieldAlert className="h-3 w-3 mr-1" /> EDD
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-red-500 hover:bg-red-50" disabled={actionLoading === app.id} onClick={() => handleReview(app.id, "rejected")}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={!!viewApp && !showEddModal} onOpenChange={(o) => !o && setViewApp(null)}>
        <DialogContent className={`${GLASS} sm:max-w-xl`}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-[#171414]">KYC Verification Details</DialogTitle>
            <DialogDescription className="text-[#4A4A4A]">{viewApp?.name}</DialogDescription>
          </DialogHeader>
          {viewApp && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                <div><p className={LABEL}>User ID</p><p className="font-mono text-xs text-[#171414] mt-1">{viewApp.userId}</p></div>
                <div><p className={LABEL}>IC Number</p><p className="font-mono text-xs text-[#171414] mt-1">{viewApp.icNo || "—"}</p></div>
                <div><p className={LABEL}>Email</p><p className="text-xs text-[#171414] mt-1">{viewApp.email}</p></div>
                <div><p className={LABEL}>Phone</p><p className="text-xs text-[#171414] mt-1">{viewApp.phone}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-4 rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                <div><p className={LABEL}>Status</p><div className="mt-1"><StatusBadge status={viewApp.status} /></div></div>
                <div><p className={LABEL}>Risk</p><div className="mt-1"><RiskBadge risk={viewApp.riskScore} /></div></div>
                <div><p className={LABEL}>AML</p><Badge variant="outline" className="mt-1 font-mono text-[10px]">{viewApp.amlStatus || "clear"}</Badge></div>
              </div>
              {viewApp.reviewerNotes && (
                <div className="rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                  <p className={LABEL}>Reviewer Notes</p>
                  <p className="mt-1 text-xs text-[#171414]">{viewApp.reviewerNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="rounded-full font-display text-sm font-bold" onClick={() => setViewApp(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDD Modal */}
      <Dialog open={showEddModal} onOpenChange={setShowEddModal}>
        <DialogContent className={`${GLASS} sm:max-w-lg`}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-[#171414]">Enhanced Due Diligence (EDD)</DialogTitle>
            <DialogDescription className="text-[#4A4A4A]">For high-risk / PEP profiles per BNM AML/CFT Policy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className={LABEL}>Applicant</Label>
              <Input value={viewApp ? `${viewApp.name} (${viewApp.id})` : ""} disabled className={`mt-1.5 ${INPUT}`} />
            </div>
            <div>
              <Label className={LABEL}>Source of Funds *</Label>
              <Input placeholder="e.g. Verified business equity, audited dividends" value={eddSourceOfFunds} onChange={(e) => setEddSourceOfFunds(e.target.value)} className={`mt-1.5 ${INPUT}`} />
            </div>
            <div>
              <Label className={LABEL}>Named Senior Approver *</Label>
              <Input placeholder="e.g. Head of Compliance" value={eddApprovedBy} onChange={(e) => setEddApprovedBy(e.target.value)} className={`mt-1.5 ${INPUT}`} />
            </div>
            <div>
              <Label className={LABEL}>Notes</Label>
              <Textarea placeholder="Audit trail notes..." value={eddNotes} onChange={(e) => setEddNotes(e.target.value)} className={`mt-1.5 ${INPUT}`} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-full font-display text-sm font-bold" onClick={() => setShowEddModal(false)}>Cancel</Button>
            <Button className={BTN_PRIMARY} onClick={handleEddApprove}>Submit EDD</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   PAWNSHOP KYC PANEL
   ════════════════════════════════════════════════════════════════════════ */
function PawnshopKycPanel() {
  const [pawnshops, setPawnshops] = useState<PawnshopProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewShop, setViewShop] = useState<PawnshopProfile | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  const fetchPawnshops = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/pawnshop/admin/pawnshops")
      if (res.data?.data && Array.isArray(res.data.data)) setPawnshops(res.data.data)
    } catch (err) {
      console.warn("Could not fetch pawnshop profiles:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPawnshops() }, [])

  const handleApprove = async (userId: string) => {
    setActionLoading(userId)
    try {
      await apiInstance.post(`/pawnshop/admin/pawnshops/${userId}/kyc`, { action: "approve" })
      await fetchPawnshops()
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.error || err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!viewShop || !rejectReason.trim()) { alert("Rejection reason required."); return }
    setActionLoading(viewShop.userId)
    try {
      await apiInstance.post(`/pawnshop/admin/pawnshops/${viewShop.userId}/kyc`, { action: "reject", rejectionReason: rejectReason.trim() })
      setShowRejectDialog(false)
      setViewShop(null)
      setRejectReason("")
      await fetchPawnshops()
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.error || err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = pawnshops.filter((shop) => {
    const matchStatus = selectedStatus === "all" || shop.kycStatus === selectedStatus
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || (shop.businessName || "").toLowerCase().includes(q) || (shop.businessEmail || "").toLowerCase().includes(q) || (shop.businessRegistrationNo || "").toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const total = pawnshops.length
  const pending = pawnshops.filter((p) => p.kycStatus === "pending").length
  const approved = pawnshops.filter((p) => p.kycStatus === "approved").length
  const rejected = pawnshops.filter((p) => p.kycStatus === "rejected").length

  return (
    <div className="space-y-6 mt-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: total, icon: Store },
          { label: "Approved", value: approved, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Pending", value: pending, icon: Clock, color: "text-[#E1BAC2]" },
          { label: "Rejected", value: rejected, icon: XCircle, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className={`${GLASS} p-5`}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/10">
              <s.icon className={`h-4 w-4 ${s.color || "text-[#E1BAC2]"}`} />
            </div>
            <p className={LABEL}>{s.label}</p>
            <p className={`mt-1 ${VALUE}`}>{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className={`${GLASS} p-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
            <Input placeholder="Search business name, registration..." className={`pl-10 ${INPUT}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className={`w-40 ${INPUT}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Store} title="No pawnshops found" subtitle="Pawnshop registrations will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#171414]/10">
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Business</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Registration</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Location</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Status</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((shop) => {
                  const isPending = shop.kycStatus === "pending"
                  return (
                    <TableRow key={shop.id} className="border-[#171414]/5 hover:bg-[#E1BAC2]/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171414]">
                            <Building2 className="h-3.5 w-3.5 text-[#E1BAC2]" />
                          </div>
                          <div>
                            <p className="font-display text-sm font-bold text-[#171414]">{shop.businessName || "Unnamed"}</p>
                            <p className="font-mono text-[10px] text-[#4A4A4A]">{shop.businessType || "ar-rahnu"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs text-[#171414]">{shop.businessRegistrationNo || "—"}</p>
                        <p className="font-mono text-[10px] text-[#4A4A4A]">Lic: {shop.licenseNumber || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-[#4A4A4A]">
                          <MapPin className="h-3 w-3" />
                          {[shop.city, shop.state].filter(Boolean).join(", ") || "—"}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={shop.kycStatus} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" onClick={() => setViewShop(shop)}>
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                          {isPending && (
                            <>
                              <Button size="sm" className={`h-8 rounded-full font-mono text-[10px] font-bold ${BTN_PRIMARY}`} disabled={actionLoading === shop.userId} onClick={() => handleApprove(shop.userId)}>
                                {actionLoading === shop.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" /> Approve</>}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-red-500 hover:bg-red-50" disabled={actionLoading === shop.userId} onClick={() => { setViewShop(shop); setRejectReason(""); setShowRejectDialog(true) }}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pawnshop Details Dialog */}
      <Dialog open={!!viewShop && !showRejectDialog} onOpenChange={(o) => !o && setViewShop(null)}>
        <DialogContent className={`${GLASS} sm:max-w-2xl max-h-[85vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-[#171414] flex items-center gap-2">
              <Store className="h-5 w-5 text-[#E1BAC2]" />
              {viewShop?.businessName || "Pawnshop Profile"}
            </DialogTitle>
            <DialogDescription className="text-[#4A4A4A]">Business verification details</DialogDescription>
          </DialogHeader>
          {viewShop && (
            <div className="space-y-4 py-2 text-sm">
              {/* KYC Status */}
              <div className={`rounded-2xl border p-4 ${
                viewShop.kycStatus === "approved" ? "bg-emerald-50 border-emerald-200" :
                viewShop.kycStatus === "rejected" ? "bg-red-50 border-red-200" :
                "bg-[#E1BAC2]/10 border-[#E1BAC2]/30"
              }`}>
                <div className="flex items-center justify-between">
                  <div><p className={LABEL}>KYC Status</p><div className="mt-1"><StatusBadge status={viewShop.kycStatus} /></div></div>
                  {viewShop.kycApprovedAt && <div className="text-right"><p className={LABEL}>Approved</p><p className="font-mono text-xs text-[#171414] mt-1">{new Date(viewShop.kycApprovedAt).toLocaleDateString()}</p></div>}
                </div>
                {viewShop.kycRejectionReason && (
                  <div className="mt-3 rounded-xl bg-red-100 p-3">
                    <p className="font-mono text-[10px] font-bold uppercase text-red-700">Rejection Reason</p>
                    <p className="mt-1 text-xs text-red-600">{viewShop.kycRejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Business Info */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                <div><p className={LABEL}>User ID</p><p className="font-mono text-xs text-[#171414] mt-1">{viewShop.userId}</p></div>
                <div><p className={LABEL}>Wallet</p><p className="font-mono text-[10px] text-[#171414] mt-1 truncate">{viewShop.walletAddress}</p></div>
                <div><p className={LABEL}>Business Name</p><p className="font-display text-sm font-bold text-[#171414] mt-1">{viewShop.businessName || "—"}</p></div>
                <div><p className={LABEL}>Type</p><p className="text-xs text-[#171414] mt-1 capitalize">{viewShop.businessType || "ar-rahnu"}</p></div>
                <div><p className={LABEL}>Registration No.</p><p className="font-mono text-xs text-[#171414] mt-1">{viewShop.businessRegistrationNo || "—"}</p></div>
                <div><p className={LABEL}>License No.</p><p className="font-mono text-xs text-[#171414] mt-1">{viewShop.licenseNumber || "—"}</p></div>
                <div><p className={LABEL}>Year Established</p><p className="text-xs text-[#171414] mt-1">{viewShop.yearEstablished || "—"}</p></div>
                <div><p className={LABEL}>Branches</p><p className="text-xs text-[#171414] mt-1">{viewShop.branchCount || "1"}</p></div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                <div><p className={LABEL}>Phone</p><p className="text-xs text-[#171414] mt-1">{viewShop.businessPhone || "—"}</p></div>
                <div><p className={LABEL}>Email</p><p className="text-xs text-[#171414] mt-1">{viewShop.businessEmail || "—"}</p></div>
                <div className="col-span-2"><p className={LABEL}>Address</p><p className="text-xs text-[#171414] mt-1">{[viewShop.addressLine1, viewShop.city, viewShop.state, viewShop.postalCode].filter(Boolean).join(", ") || "—"}</p></div>
              </div>

              {/* Services */}
              {viewShop.servicesOffered?.length > 0 && (
                <div className="rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                  <p className={LABEL}>Services</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewShop.servicesOffered.map((s, i) => <Badge key={i} variant="outline" className="font-mono text-[10px] border-[#171414]/15">{s}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-full font-display text-sm font-bold" onClick={() => setViewShop(null)}>Close</Button>
            {viewShop?.kycStatus === "pending" && (
              <>
                <Button className={BTN_PRIMARY} disabled={actionLoading === viewShop?.userId} onClick={() => { if (viewShop) handleApprove(viewShop.userId); setViewShop(null) }}>
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
            <DialogTitle className="font-display text-xl font-bold text-[#171414]">Reject Pawnshop KYC</DialogTitle>
            <DialogDescription className="text-[#4A4A4A]">Provide a reason for rejecting {viewShop?.businessName}&apos;s application.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className={LABEL}>Rejection Reason *</Label>
            <Textarea placeholder="e.g. Missing documents, license expired..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className={`mt-1.5 ${INPUT}`} rows={4} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-full font-display text-sm font-bold" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" className="rounded-full font-mono text-[10px] font-bold" disabled={!rejectReason.trim() || actionLoading === viewShop?.userId} onClick={handleReject}>
              {actionLoading === viewShop?.userId ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
