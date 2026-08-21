"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Search,
  Eye,
  Coins,
  TrendingUp,
  Clock,
  ExternalLink,
  Loader2,
  Shield,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const LABEL = "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]/50"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"
const INPUT = "rounded-xl border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2]"
const BTN = "rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black"

interface SAGProperties {
  loan?: number
  karat: number
  tenorM: number
  weightG: number
  currency: string
  assetType: string
  mintShare: number
  valuation: number
  enableMinting: boolean
  loanPercentage?: number
  pawnerInterestP?: number
  investorFinancingType: string
  investorRoiPercentage: number
  investorRoiFixedAmount?: number
  ltv?: number
  risk_level?: string
  rationale?: string
  purity?: number
  action?: string
  soldShare?: number
  eval_id?: string
}

interface SAG {
  sagId: string
  tokenId: string
  sagName: string
  sagDescription: string
  sagProperties: SAGProperties
  sagType: string
  certNo: string
  status?: "active" | "closed"
  approvalStatus?: string
}

interface SAGResponse {
  success: boolean
  data: SAG[]
  pagination: {
    count: number
    totalCount: number
    currentPage: number
    totalPages: number
  }
}

function StatusBadge({ sag }: { sag: SAG }) {
  if (!sag.tokenId || sag.approvalStatus === "pending") {
    return <Badge className="bg-[#E1BAC2]/20 text-[#171414] border-[#E1BAC2]/30 font-mono text-[10px]">Pending</Badge>
  }
  if (sag.status === "closed") {
    return <Badge className="bg-red-50 text-red-600 border-red-200 font-mono text-[10px]">Closed</Badge>
  }
  return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">Active</Badge>
}

function RiskBadge({ level }: { level?: string }) {
  const l = (level || "").toUpperCase()
  if (l.includes("VERY_HIGH") || l.includes("VERYHIGH")) {
    return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-mono text-[10px]">Very High</Badge>
  }
  if (l.includes("HIGH")) {
    return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 font-mono text-[10px]">High</Badge>
  }
  if (l.includes("MEDIUM")) {
    return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-mono text-[10px]">Medium</Badge>
  }
  if (l.includes("LOW")) {
    return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-mono text-[10px]">Low</Badge>
  }
  return <Badge variant="outline" className="font-mono text-[10px]">{level || "—"}</Badge>
}

export default function SagListingsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sags"],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get("/sag?page_size=200&page_number=1")
      return data
    },
  })

  const sags = data?.data || []
  const total = data?.pagination?.totalCount || sags.length

  const filtered = sags.filter((sag) => {
    const matchStatus = selectedStatus === "all" ||
      (selectedStatus === "active" && (sag.status === "active" || (!sag.status && sag.tokenId))) ||
      (selectedStatus === "pending" && (!sag.tokenId || sag.approvalStatus === "pending")) ||
      (selectedStatus === "closed" && sag.status === "closed")
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || sag.sagName.toLowerCase().includes(q) || sag.sagId.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const activeCount = sags.filter((s) => s.status === "active" || (!s.status && s.tokenId)).length
  const pendingCount = sags.filter((s) => !s.tokenId || s.approvalStatus === "pending").length
  const closedCount = sags.filter((s) => s.status === "closed").length
  const totalValuation = sags.reduce((sum, s) => sum + (s.sagProperties?.valuation || 0), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className={LABEL}>Tokenized Collateral</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            SAG Listings
          </h1>
          <p className="mt-1 text-sm text-[#4A4A4A]">
            Surat Akuan Gadaian — gold-backed token management
          </p>
        </div>
        <Link href="/apply">
          <Button className={BTN}>
            <Coins className="h-3.5 w-3.5 mr-1.5" />
            New Listing
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: total, icon: FileText },
          { label: "Active", value: activeCount, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Pending", value: pendingCount, icon: Clock, color: "text-[#E1BAC2]" },
          { label: "Total Value", value: `CTC ${(totalValuation / 1000).toFixed(0)}K`, icon: Coins },
        ].map((s) => (
          <div key={s.label} className={`${GLASS} p-5`}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/10">
              <s.icon className={`h-4 w-4 ${s.color || "text-[#E1BAC2]"}`} />
            </div>
            <p className={LABEL}>{s.label}</p>
            <p className={`mt-1 ${VALUE}`}>{isLoading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className={`${GLASS} p-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
            <Input placeholder="Search by name or ID..." className={`pl-10 ${INPUT}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className={`w-40 ${INPUT}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1BAC2]/10">
              <FileText className="h-7 w-7 text-[#E1BAC2]" />
            </div>
            <p className="font-display text-lg font-bold text-[#171414]">No listings found</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">SAG listings will appear here after creation</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#171414]/10">
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">SAG</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Asset</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Valuation</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Investment</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Status</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Risk</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sag) => (
                  <TableRow key={sag.sagId} className="border-[#171414]/5 hover:bg-[#E1BAC2]/5">
                    <TableCell>
                      <p className="font-display text-sm font-bold text-[#171414]">{sag.sagName}</p>
                      <p className="font-mono text-[10px] text-[#4A4A4A]">{sag.sagId.slice(0, 12)}...</p>
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
                      <p className="font-mono text-xs text-[#171414]">{sag.sagProperties.mintShare.toLocaleString()} shares</p>
                      <p className="font-mono text-[10px] text-[#4A4A4A]">{sag.sagProperties.investorRoiPercentage}% ROI · {sag.sagProperties.tenorM}mo</p>
                    </TableCell>
                    <TableCell><StatusBadge sag={sag} /></TableCell>
                    <TableCell><RiskBadge level={sag.sagProperties.risk_level} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {sag.sagProperties.rationale && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5">
                                <Shield className="h-3 w-3 mr-1" /> AI
                              </Button>
                            </DialogTrigger>
                            <DialogContent className={`${GLASS} sm:max-w-2xl max-h-[85vh] overflow-y-auto`}>
                              <DialogHeader>
                                <DialogTitle className="font-display text-xl font-bold text-[#171414] flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-[#E1BAC2]" /> AI Risk Analysis
                                </DialogTitle>
                                <DialogDescription className="text-[#4A4A4A]">{sag.sagName}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                                    <p className={LABEL}>Risk</p>
                                    <div className="mt-1"><RiskBadge level={sag.sagProperties.risk_level} /></div>
                                  </div>
                                  {sag.sagProperties.ltv && (
                                    <div className="rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                                      <p className={LABEL}>LTV</p>
                                      <p className="mt-1 font-display text-xl font-extrabold text-[#171414]">{(sag.sagProperties.ltv * 100).toFixed(1)}%</p>
                                    </div>
                                  )}
                                  {sag.sagProperties.action && (
                                    <div className="rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                                      <p className={LABEL}>Action</p>
                                      <p className="mt-1 font-display text-sm font-bold text-[#171414] capitalize">{sag.sagProperties.action.replace(/_/g, " ")}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                                  <p className={LABEL}>Rationale</p>
                                  <p className="mt-2 text-sm text-[#171414] whitespace-pre-wrap">{sag.sagProperties.rationale}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {sag.tokenId && (
                          <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" asChild>
                            <a href={`${process.env.NEXT_PUBLIC_ENV_URL}/${sag.tokenId}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" /> View
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
