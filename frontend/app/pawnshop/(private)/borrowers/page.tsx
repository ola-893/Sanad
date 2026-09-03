"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

import apiInstance from "@/lib/axios-v1"
import {
  Users,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from "lucide-react"

interface Borrower {
  borrowerId: string
  borrowerWallet: string
  borrowerFirstName: string
  borrowerLastName: string
  creditScore: number
  creditTier: string
  goldDetails: any
  verifiedWeightG: string
  verifiedKarat: number
  verifiedAppraisedValueUsd: string
  paymentAmountUsd: string
  paymentStatus: string
  paymentTxHash: string
  sagTokenId: string
  sagMintedAt: string
  loanDurationMonths: number
  loanMaturityDate: string
  status: string
  totalRepaid: number
  repaymentCount: number
  createdAt: string
  updatedAt: string
}

const SEPOLIA_EXPLORER = "https://eth-sepolia.blockscout.com"

function getRepaymentStatus(b: Borrower): "repaid" | "not_repaid" {
  const loanAmount = Number(b.paymentAmountUsd || 0)
  if (loanAmount <= 0) return "not_repaid"
  return Number(b.totalRepaid || 0) >= loanAmount ? "repaid" : "not_repaid"
}

function truncateAddress(addr: string): string {
  if (!addr) return "—"
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchBorrowers()
  }, [])

  const fetchBorrowers = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/pledge-requests/borrowers")
      if (res.data.success) setBorrowers(res.data.data ?? [])
    } catch (e: any) {
      console.error("Failed to fetch borrowers:", e)
    } finally {
      setLoading(false)
    }
  }

  // Group borrowers by borrowerId, show the latest status per borrower
  const uniqueBorrowers = borrowers.reduce<Record<string, Borrower>>((acc, b) => {
    if (!acc[b.borrowerId] || new Date(b.updatedAt) > new Date(acc[b.borrowerId].updatedAt)) {
      acc[b.borrowerId] = b
    }
    return acc
  }, {})

  const borrowerList = Object.values(uniqueBorrowers).filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.borrowerFirstName?.toLowerCase().includes(q) ||
      b.borrowerLastName?.toLowerCase().includes(q) ||
      b.borrowerWallet?.toLowerCase().includes(q)
    )
  })

  // Stats
  const totalBorrowers = borrowerList.length
  const repaidCount = borrowerList.filter((b) => getRepaymentStatus(b) === "repaid").length
  const notRepaidCount = totalBorrowers - repaidCount

  return (
    <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <p className="kicker mb-2">Pawnshop</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            Borrowers
          </h1>
          <p className="mt-2 text-sm text-[#4A4A4A]">
            Track borrowers, loan status, and repayment progress
          </p>
        </div>

        {/* Stats Row */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { label: "Total Borrowers", value: totalBorrowers, icon: Users, color: "text-[#171414]" },
            { label: "Not Repaid", value: notRepaidCount, icon: AlertTriangle, color: "text-amber-600" },
            { label: "Repaid", value: repaidCount, icon: CheckCircle2, color: "text-emerald-600" },
          ].map((stat) => (
            <Card key={stat.label} className="border-white/60 bg-white/70 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171414]/5">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#4A4A4A]/70">{stat.label}</p>
                    <p className="text-xl font-extrabold text-[#171414]">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A4A4A]/40" />
            <input
              type="text"
              placeholder="Search by name or wallet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-[#171414] placeholder:text-[#4A4A4A]/40 focus:border-[#e1bac2] focus:outline-none focus:ring-1 focus:ring-[#e1bac2]/50 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Borrower List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#e1bac2]" />
          </div>
        ) : borrowerList.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-[#4A4A4A]/20" />
            <p className="text-lg font-bold text-[#171414]">No borrowers yet</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">
              Borrowers will appear here once they submit pledge requests to you.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {borrowerList.map((b) => {
              const repaymentStatus = getRepaymentStatus(b)
              const gold = b.goldDetails || {}
              const loanAmount = Number(b.paymentAmountUsd || 0)
              const totalRepaid = Number(b.totalRepaid || 0)
              const isFullyRepaid = repaymentStatus === "repaid"
              const realMaturity = new Date(new Date(b.createdAt).getTime() + (b.loanDurationMonths || 3) * 30 * 24 * 60 * 60 * 1000)
              const isOverdue = new Date() > realMaturity && !isFullyRepaid

              return (
                <Link key={b.borrowerId} href={`/pawnshop/borrowers/${b.borrowerId}`}>
                  <Card className="group cursor-pointer border-white/60 bg-white/70 backdrop-blur-sm transition-all hover:border-[#e1bac2]/40 hover:shadow-md hover:shadow-[#e1bac2]/10">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: Borrower info */}
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#171414]/5 text-sm font-bold text-[#171414]">
                            {b.borrowerFirstName?.[0] || "?"}{b.borrowerLastName?.[0] || ""}
                          </div>

                          {/* Name & Wallet */}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-[#171414]">
                                {b.borrowerFirstName} {b.borrowerLastName}
                              </p>
                              <button
                                onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(b.borrowerWallet) }}
                                className="font-mono text-xs text-[#4A4A4A]/50 hover:text-[#171414]"
                                title="Copy wallet"
                              >
                                {truncateAddress(b.borrowerWallet)}
                              </button>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-[#4A4A4A]/70">
                              <span>{gold.assetType || "Gold"} {b.verifiedKarat || gold.karat}K</span>
                              <span>•</span>
                              <span>{b.verifiedWeightG || gold.weightG}g</span>
                              {b.loanDurationMonths && (
                                <>
                                  <span>•</span>
                                  <span>{b.loanDurationMonths}mo loan</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Status + Amount */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs font-bold text-[#4A4A4A]/60">Loan Amount</p>
                            <p className="text-sm font-bold text-[#171414]">
                              ${loanAmount.toLocaleString()}
                            </p>
                          </div>

                          <Badge variant="outline" className={`border text-[10px] font-bold ${
                            isFullyRepaid
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : isOverdue
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}>
                            {isFullyRepaid ? (
                              <><CheckCircle2 className="mr-1 h-3 w-3" />Repaid</>
                            ) : isOverdue ? (
                              <><AlertTriangle className="mr-1 h-3 w-3" />Not Repaid</>
                            ) : (
                              <><Clock className="mr-1 h-3 w-3" />Not Repaid</>
                            )}
                          </Badge>

                          <ArrowRight className="h-4 w-4 text-[#4A4A4A]/30 transition-transform group-hover:translate-x-1 group-hover:text-[#e1bac2]" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
    </div>
  )
}
