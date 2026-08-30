"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  Wallet,
  Shield,
  Clock,
  CheckCircle,
  RefreshCw,
  Coins,
  Activity,
  Store,
  FileText,
  ArrowRight,
  Eye,
  Zap,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { RecentActivity } from "@/components/admin/recent-activity"

/* ─── Design tokens ─── */
const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const LABEL = "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]/50"
const VALUE = "font-display text-3xl font-extrabold tabular-nums text-[#171414]"

interface CreditcoinStatus {
  success: boolean
  network: {
    chainId: number
    blockNumber: number
    gasPrice: string
    isHealthy: boolean
  }
}

interface PawnshopProfile {
  id: string
  userId: string
  businessName: string
  kycStatus: string
  createdAt: string
}

interface KycSubmission {
  id: string
  userId: string
  status: string
  riskScore: number
  createdAt: string
}

export default function AdminDashboardPage() {
  const [greeting, setGreeting] = useState("")

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening")
  }, [])

  /* ─── Live data queries ─── */
  const { data: networkStatus } = useQuery({
    queryKey: ["admin-network-status"],
    queryFn: async (): Promise<CreditcoinStatus> => {
      const { data } = await apiInstance.get("/creditcoin/status")
      return data
    },
    refetchInterval: 30_000,
  })

  const { data: goldPrice } = useQuery({
    queryKey: ["admin-gold-price"],
    queryFn: async () => {
      const { data } = await apiInstance.get("/gold-price/latest")
      return data
    },
  })

  const { data: pawnshopData, isLoading: pawnshopsLoading } = useQuery({
    queryKey: ["admin-pawnshops"],
    queryFn: async () => {
      const { data } = await apiInstance.get("/pawnshop/admin/pawnshops")
      return data
    },
  })

  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: ["admin-kyc-all"],
    queryFn: async () => {
      const { data } = await apiInstance.get("/kyc/all")
      return data
    },
  })

  /* ─── Derived counts ─── */
  const pawnshops: PawnshopProfile[] = pawnshopData?.data || []
  const kycSubmissions: KycSubmission[] = kycData?.data || []

  const totalPawnshops = pawnshops.length
  const pendingPawnshopKyc = pawnshops.filter((p) => p.kycStatus === "pending").length
  const approvedPawnshops = pawnshops.filter((p) => p.kycStatus === "approved").length
  const rejectedPawnshops = pawnshops.filter((p) => p.kycStatus === "rejected").length

  const totalKyc = kycSubmissions.length
  const pendingKyc = kycSubmissions.filter((k) =>
    ["submitted", "pending", "screening", "under_review"].includes(k.status)
  ).length
  const approvedKyc = kycSubmissions.filter((k) =>
    ["approved", "approved_with_edd"].includes(k.status)
  ).length

  const isLoading = pawnshopsLoading || kycLoading

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <div className="flex items-end justify-between">
        <div>
          <p className={LABEL}>Administration</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            {greeting}, Admin
          </h1>
          <p className="mt-1 text-sm text-[#4A4A4A]">
            Sanad Protocol overview &mdash; Shariah-compliant gold financing on Creditcoin CC3
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#4A4A4A]">
          <Clock className="h-3.5 w-3.5" />
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* ─── Pending Attention Banner ─── */}
      {(pendingPawnshopKyc > 0 || pendingKyc > 0) && (
        <div className={`${GLASS} flex items-center gap-4 px-6 py-4`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E1BAC2]/20">
            <AlertCircleIcon className="h-5 w-5 text-[#E1BAC2]" />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-[#171414]">
              {pendingPawnshopKyc + pendingKyc} item{(pendingPawnshopKyc + pendingKyc) !== 1 ? "s" : ""} awaiting review
            </p>
            <p className="text-xs text-[#4A4A4A]">
              {pendingPawnshopKyc > 0 && `${pendingPawnshopKyc} pawnshop KYC`}
              {pendingPawnshopKyc > 0 && pendingKyc > 0 && " · "}
              {pendingKyc > 0 && `${pendingKyc} borrower KYC`}
            </p>
          </div>
          <Link href="/admin/kyc">
            <Button
              size="sm"
              className="rounded-full bg-[#171414] font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] hover:bg-black"
            >
              Review Now
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* ─── Primary KPIs ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pawnshops */}
        <div className={`${GLASS} p-6`}>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]/10">
            <Store className="h-5 w-5 text-[#E1BAC2]" />
          </div>
          <p className={LABEL}>Pawnshops</p>
          <p className={`mt-1 ${VALUE}`}>{isLoading ? "—" : totalPawnshops}</p>
          <p className="mt-1 text-xs text-[#4A4A4A]">
            {approvedPawnshops} verified · {pendingPawnshopKyc} pending
          </p>
        </div>

        {/* Total KYC */}
        <div className={`${GLASS} p-6`}>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]/10">
            <Users className="h-5 w-5 text-[#E1BAC2]" />
          </div>
          <p className={LABEL}>KYC Applications</p>
          <p className={`mt-1 ${VALUE}`}>{isLoading ? "—" : totalKyc}</p>
          <p className="mt-1 text-xs text-[#4A4A4A]">
            {approvedKyc} approved · {pendingKyc} pending
          </p>
        </div>

        {/* Gold Price */}
        <div className={`${GLASS} p-6`}>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]/10">
            <Coins className="h-5 w-5 text-[#E1BAC2]" />
          </div>
          <p className={LABEL}>Gold Price</p>
          <p className={`mt-1 ${VALUE}`}>
            {goldPrice?.data?.pricePerGramUsd
              ? `$${parseFloat(goldPrice.data.pricePerGramUsd).toFixed(2)}`
              : "—"}
          </p>
          <p className="mt-1 text-xs text-[#4A4A4A]">per gram (USD)</p>
        </div>

        {/* Network Status */}
        <div className={`${GLASS} p-6`}>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]/10">
            <Activity className="h-5 w-5 text-[#E1BAC2]" />
          </div>
          <p className={LABEL}>CC3 Network</p>
          <div className="mt-1 flex items-center gap-2">
            <p className={VALUE}>
              {networkStatus?.network?.isHealthy ? "Live" : "Offline"}
            </p>
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                networkStatus?.network?.isHealthy ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
          </div>
          <p className="mt-1 text-xs text-[#4A4A4A]">
            Block #{networkStatus?.network?.blockNumber?.toLocaleString() || "—"}
          </p>
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/kyc" className="group">
          <div className={`${GLASS} flex items-center gap-4 px-5 py-4 transition-all hover:shadow-lg hover:border-[#E1BAC2]/40`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#171414]">
              <Shield className="h-5 w-5 text-[#E1BAC2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold text-[#171414]">KYC Review</p>
              <p className="text-xs text-[#4A4A4A] truncate">Borrower & pawnshop verification</p>
            </div>
            {pendingKyc + pendingPawnshopKyc > 0 && (
              <Badge className="shrink-0 bg-[#E1BAC2] text-[#171414] font-mono text-[10px] font-bold">
                {pendingKyc + pendingPawnshopKyc}
              </Badge>
            )}
            <ArrowRight className="h-4 w-4 text-[#171414]/30 group-hover:text-[#E1BAC2] transition-colors" />
          </div>
        </Link>

        <Link href="/admin/sag-listings" className="group">
          <div className={`${GLASS} flex items-center gap-4 px-5 py-4 transition-all hover:shadow-lg hover:border-[#E1BAC2]/40`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#171414]">
              <FileText className="h-5 w-5 text-[#E1BAC2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold text-[#171414]">SAG Listings</p>
              <p className="text-xs text-[#4A4A4A] truncate">Tokenized gold collateral</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#171414]/30 group-hover:text-[#E1BAC2] transition-colors" />
          </div>
        </Link>

        <Link href="/admin/compliance" className="group">
          <div className={`${GLASS} flex items-center gap-4 px-5 py-4 transition-all hover:shadow-lg hover:border-[#E1BAC2]/40`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#171414]">
              <CheckCircle className="h-5 w-5 text-[#E1BAC2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold text-[#171414]">Compliance</p>
              <p className="text-xs text-[#4A4A4A] truncate">AAOIFI Shariah ledger</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#171414]/30 group-hover:text-[#E1BAC2] transition-colors" />
          </div>
        </Link>

        <Link href="/admin/repayment" className="group">
          <div className={`${GLASS} flex items-center gap-4 px-5 py-4 transition-all hover:shadow-lg hover:border-[#E1BAC2]/40`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#171414]">
              <Wallet className="h-5 w-5 text-[#E1BAC2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold text-[#171414]">Repayments</p>
              <p className="text-xs text-[#4A4A4A] truncate">Settlement & liquidity pool</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#171414]/30 group-hover:text-[#E1BAC2] transition-colors" />
          </div>
        </Link>
      </div>

      {/* ─── Main Content: Activity + Network ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className={`${GLASS} overflow-hidden lg:col-span-2`}>
          <div className="flex items-center justify-between border-b border-[#171414]/10 px-6 py-4">
            <div>
              <p className={LABEL}>Activity Feed</p>
              <h3 className="mt-1 font-display text-lg font-bold text-[#171414]">Recent Events</h3>
            </div>
            <Link href="/admin/compliance">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#171414] hover:bg-[#E1BAC2]/10"
              >
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="p-6">
            <RecentActivity />
          </div>
        </div>

        {/* Network & Compliance Status */}
        <div className="space-y-6">
          {/* Network Health */}
          <div className={`${GLASS} p-6`}>
            <p className={LABEL}>Network Health</p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      networkStatus?.network?.isHealthy ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span className="font-display text-sm font-bold text-[#171414]">API Server</span>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      networkStatus?.network?.isHealthy ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span className="font-display text-sm font-bold text-[#171414]">CC3 Blockchain</span>
                </div>
                <Badge
                  className={`font-mono text-[10px] ${
                    networkStatus?.network?.isHealthy
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {networkStatus?.network?.isHealthy ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="font-display text-sm font-bold text-[#171414]">Compliance</span>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">
                  AAOIFI
                </Badge>
              </div>
            </div>
          </div>

          {/* Platform Summary */}
          <div className={`${GLASS} p-6`}>
            <p className={LABEL}>Platform Summary</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#171414]/5 pb-3">
                <span className="text-sm text-[#4A4A4A]">Chain ID</span>
                <span className="font-mono text-sm font-bold text-[#171414]">
                  {networkStatus?.network?.chainId || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#171414]/5 pb-3">
                <span className="text-sm text-[#4A4A4A]">Current Block</span>
                <span className="font-mono text-sm font-bold text-[#171414]">
                  #{networkStatus?.network?.blockNumber?.toLocaleString() || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#171414]/5 pb-3">
                <span className="text-sm text-[#4A4A4A]">Registered Pawnshops</span>
                <span className="font-mono text-sm font-bold text-[#171414]">{totalPawnshops}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#171414]/5 pb-3">
                <span className="text-sm text-[#4A4A4A]">KYC Applications</span>
                <span className="font-mono text-sm font-bold text-[#171414]">{totalKyc}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4A4A4A]">Gold Price (USD/g)</span>
                <span className="font-mono text-sm font-bold text-[#171414]">
                  {goldPrice?.data?.pricePerGramUsd
                    ? `$${parseFloat(goldPrice.data.pricePerGramUsd).toFixed(2)}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Inline icon to avoid import issues ─── */
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
