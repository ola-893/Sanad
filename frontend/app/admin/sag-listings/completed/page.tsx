"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, CheckCircle, XCircle, Loader2, FileText, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const LABEL = "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]/50"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"
const INPUT = "rounded-xl border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2]"

interface SAGProperties {
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

interface SAG {
  sagId: string
  tokenId: string
  sagName: string
  sagDescription: string
  sagProperties: SAGProperties
  sagType: string
  certNo: string
  status?: string
  approvalStatus?: string
  closedAt?: string
}

interface SAGResponse {
  success: boolean
  data: SAG[]
  pagination: { totalCount: number; currentPage: number; totalPages: number }
}

export default function CompletedSagPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [viewSag, setViewSag] = useState<SAG | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin-completed-sags"],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get("/sag?page_size=200&page_number=1&status=closed")
      return data
    },
  })

  const sags: SAG[] = data?.data || []
  const total = data?.pagination?.totalCount || sags.length

  const filtered = sags.filter((sag) => {
    const matchType = selectedType === "all" || sag.sagType?.toLowerCase() === selectedType
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || sag.sagName.toLowerCase().includes(q) || sag.sagId.toLowerCase().includes(q)
    return matchType && matchSearch
  })

  const totalValuation = sags.reduce((sum, s) => sum + (s.sagProperties?.valuation || 0), 0)
  const totalLoan = sags.reduce((sum, s) => sum + (s.sagProperties?.loan || 0), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className={LABEL}>Completed Listings</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            Closed SAGs
          </h1>
          <p className="mt-1 text-sm text-[#4A4A4A]">
            Settled and completed gold-backed token listings
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Closed", value: total, icon: FileText },
          { label: "Total Valuation", value: `CTC ${totalValuation.toLocaleString()}`, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Total Loaned", value: `CTC ${totalLoan.toLocaleString()}`, icon: FileText },
          { label: "Avg ROI", value: sags.length > 0 ? `${(sags.reduce((s, x) => s + (x.sagProperties?.investorRoiPercentage || 0), 0) / sags.length).toFixed(1)}%` : "—", icon: FileText },
        ].map((s) => (
          <div key={s.label} className={`${GLASS} p-5`}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1BAC2]/10">
              <s.icon className={`h-4 w-4 ${s.color || "text-[#E1BAC2]"}`} />
            </div>
            <p className={LABEL}>{s.label}</p>
            <p className={`mt-1 ${VALUE} text-xl`}>{isLoading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className={`${GLASS} p-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
            <Input placeholder="Search by name or ID..." className={`pl-10 ${INPUT}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className={`w-40 ${INPUT}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="conventional">Conventional</SelectItem>
              <SelectItem value="shariah">Shariah</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1BAC2]/10">
              <FileText className="h-7 w-7 text-[#E1BAC2]" />
            </div>
            <p className="font-display text-lg font-bold text-[#171414]">No completed listings</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">Closed SAGs will appear here</p>
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
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[#171414]/50">Status</TableHead>
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
                      <p className="font-mono text-xs text-[#171414]">{sag.sagProperties.investorRoiPercentage}% ROI</p>
                      <p className="font-mono text-[10px] text-[#4A4A4A]">{sag.sagProperties.tenorM} months</p>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-red-50 text-red-600 border-red-200 font-mono text-[10px]">Closed</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" onClick={() => setViewSag(sag)}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                        {sag.tokenId && (
                          <Button size="sm" variant="ghost" className="h-8 rounded-full font-mono text-[10px] text-[#171414] hover:bg-[#171414]/5" asChild>
                            <a href={`${process.env.NEXT_PUBLIC_ENV_URL}/${sag.tokenId}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" /> Chain
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

      {/* Detail Dialog */}
      <Dialog open={!!viewSag} onOpenChange={(o) => !o && setViewSag(null)}>
        <DialogContent className={`${GLASS} sm:max-w-xl`}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-[#171414]">{viewSag?.sagName}</DialogTitle>
            <DialogDescription className="text-[#4A4A4A]">Completed SAG details</DialogDescription>
          </DialogHeader>
          {viewSag && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                <div><p className={LABEL}>Asset</p><p className="text-xs text-[#171414] mt-1">{viewSag.sagProperties.assetType} · {viewSag.sagProperties.weightG}g · {viewSag.sagProperties.karat}K</p></div>
                <div><p className={LABEL}>Valuation</p><p className="font-mono text-xs font-bold text-[#171414] mt-1">{viewSag.sagProperties.currency} {viewSag.sagProperties.valuation.toLocaleString()}</p></div>
                <div><p className={LABEL}>Loan</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.currency} {(viewSag.sagProperties.loan || 0).toLocaleString()}</p></div>
                <div><p className={LABEL}>ROI</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.investorRoiPercentage}%</p></div>
                <div><p className={LABEL}>Tenor</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.tenorM} months</p></div>
                <div><p className={LABEL}>Shares</p><p className="font-mono text-xs text-[#171414] mt-1">{viewSag.sagProperties.mintShare.toLocaleString()}</p></div>
              </div>
              {viewSag.closedAt && (
                <div className="rounded-2xl border border-[#171414]/10 p-4 bg-[#FAFAF8]">
                  <p className={LABEL}>Closed At</p>
                  <p className="mt-1 text-xs text-[#171414]">{new Date(viewSag.closedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
