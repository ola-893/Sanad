"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Coins,
  Inbox,
  Clock,
  User,
  Wallet,
  TrendingUp,
  ArrowRight,
  Gem,
  DollarSign,
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import apiInstance from '@/lib/axios-v1'
import { Skeleton } from '@/components/ui/skeleton'
import { useWalletAuth } from '@/hooks/use-wallet-auth'


interface SAGProperties {
  valuation: number
  currency: string
  assetType: string
  weightG: number
  karat: number
  loan?: number
  investmentTargetUsd?: number
  investmentFilledUsd?: number
}

interface SAG {
  sagId: string
  sagName: string
  sagDescription: string
  sagProperties: SAGProperties
  tokenId: string
  status?: string
  approvalStatus?: string
  createdAt: string
}

interface SAGResponse {
  success: boolean
  data: SAG[]
  pagination: { totalCount: number }
}

interface PledgeRequest {
  id: string
  borrowerWallet: string
  goldDetails: {
    assetType: string
    karat: number
    weightG: number
    purity: number
    estimatedValue: number
  }
  status: string
  sagTokenId?: string
  loanDurationMonths?: number
  createdAt: string
}

interface PawnshopProfile {
  businessName: string
  kycStatus: string
}

export default function PawnshopDashboard() {
  const { balance: walletBalance } = useWalletAuth()
  const [ethPrice, setEthPrice] = useState(0)
  const ethBalance = walletBalance || '0.0000'
  const ethValueUsd = ethPrice > 0 ? (Number(ethBalance) * ethPrice).toFixed(2) : null

  useEffect(() => {
    apiInstance.get('/eth-price')
      .then((res) => { const p = res.data?.data?.usd; if (p && p > 0) setEthPrice(p) })
      .catch(() => {})
  }, [])

  const { data: sagsData, isLoading: sagsLoading } = useQuery({
    queryKey: ['pawnshop-sags'],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get('/sag?page_size=50&page_number=1')
      return data
    },
  })

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['pawnshop-pledge-requests'],
    queryFn: async (): Promise<{ success: boolean; data: PledgeRequest[] }> => {
      const { data } = await apiInstance.get('/pledge-requests/mine')
      return data
    },
  })

  const { data: profileData } = useQuery({
    queryKey: ['pawnshop-profile'],
    queryFn: async (): Promise<{ success: boolean; data: PawnshopProfile }> => {
      const { data } = await apiInstance.get('/pawnshop/profile')
      return data
    },
  })

  const sags = sagsData?.data || []
  const totalCount = sagsData?.pagination?.totalCount || sags.length
  const activeSags = sags.filter((s) => s.status === 'active' || !s.status)
  const totalValuation = sags.reduce((sum, s) => sum + (s.sagProperties?.valuation || 0), 0)
  const totalFunded = sags.reduce((sum, s) => sum + (s.sagProperties?.investmentFilledUsd || 0), 0)

  const requests = requestsData?.data || []
  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const activeLoans = requests.filter((r) => ['sag_minted', 'funded', 'gold_verified'].includes(r.status))

  const profile = profileData?.data
  const kycApproved = profile?.kycStatus === 'approved'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e1bac2] mb-1">Pawnshop</p>
          <h1 className="text-3xl font-display font-extrabold text-[#171414] tracking-tight">
            {profile?.businessName || 'Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-[#4A4A4A]/60">
            Manage your gold collateral, loans, and investments
          </p>
        </div>
        <Button asChild className="rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black gap-2">
          <Link href="/pawnshop/requests">
            <Inbox className="h-4 w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-[#e1bac2] px-1.5 text-[10px] font-bold text-[#171414]">
                {pendingRequests.length}
              </span>
            )}
          </Link>
        </Button>
      </div>

      {/* KYC Banner — only if not approved */}
      {!kycApproved && profile && (
        <div className={`rounded-2xl border p-4 ${
          profile.kycStatus === 'rejected'
            ? 'border-red-200 bg-red-50'
            : 'border-amber-200 bg-amber-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 ${
                profile.kycStatus === 'rejected' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                <Inbox className={`h-4 w-4 ${
                  profile.kycStatus === 'rejected' ? 'text-red-600' : 'text-amber-600'
                }`} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#171414]">
                  KYC {profile.kycStatus === 'rejected' ? 'Rejected' : 'Pending'}
                </p>
                <p className="text-xs text-[#4A4A4A]/60">
                  {profile.kycStatus === 'rejected'
                    ? 'Update your documents and reapply'
                    : 'Waiting for admin review'}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/pawnshop/profile">Update Profile</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Wallet */}
        <Card className="col-span-1 border-[#171414]/8 bg-white/70 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg bg-blue-50 p-1.5">
                <Wallet className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Wallet</span>
            </div>
            <p className="text-2xl font-extrabold text-[#171414]">{ethBalance}</p>
            <p className="text-xs text-[#4A4A4A]/50 font-mono">ETH</p>
            {ethValueUsd && (
              <p className="text-[10px] text-[#4A4A4A]/40 mt-1">≈ ${ethValueUsd}</p>
            )}
          </CardContent>
        </Card>

        {/* Active SAGs */}
        <Card className="col-span-1 border-[#171414]/8 bg-white/70 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg bg-[#e1bac2]/20 p-1.5">
                <Gem className="h-3.5 w-3.5 text-[#8c5a63]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">SAGs</span>
            </div>
            <p className="text-2xl font-extrabold text-[#171414]">{activeSags.length}</p>
            <p className="text-xs text-[#4A4A4A]/50">active of {totalCount} total</p>
          </CardContent>
        </Card>

        {/* Total Valuation */}
        <Card className="col-span-1 border-[#171414]/8 bg-white/70 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg bg-emerald-50 p-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Valuation</span>
            </div>
            <p className="text-2xl font-extrabold text-[#171414]">
              ${totalValuation > 0 ? totalValuation.toLocaleString() : '0'}
            </p>
            <p className="text-xs text-[#4A4A4A]/50">portfolio value</p>
          </CardContent>
        </Card>

        {/* Active Loans */}
        <Card className="col-span-1 border-[#171414]/8 bg-white/70 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg bg-amber-50 p-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Loans</span>
            </div>
            <p className="text-2xl font-extrabold text-[#171414]">{activeLoans.length}</p>
            <p className="text-xs text-[#4A4A4A]/50">active loans</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-Column: Requests + SAGs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Pending Requests — wider */}
        <Card className="lg:col-span-3 border-[#171414]/8 bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div>
              <h2 className="text-sm font-bold text-[#171414]">Pending Requests</h2>
              <p className="text-[10px] text-[#4A4A4A]/50">{pendingRequests.length} awaiting review</p>
            </div>
            <Link href="/pawnshop/requests" className="text-[10px] font-bold text-[#e1bac2] hover:underline uppercase tracking-wider">
              View All →
            </Link>
          </div>
          <CardContent className="px-5 pb-4 pt-0">
            {requestsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1"><Skeleton className="h-3 w-32 mb-1" /><Skeleton className="h-2.5 w-20" /></div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-8 text-center">
                <Inbox className="h-8 w-8 text-[#4A4A4A]/15 mx-auto mb-2" />
                <p className="text-xs text-[#4A4A4A]/50">No pending requests</p>
              </div>
            ) : (
              <div className="divide-y divide-[#171414]/5">
                {pendingRequests.slice(0, 5).map((req) => (
                  <Link
                    key={req.id}
                    href="/pawnshop/requests"
                    className="flex items-center justify-between py-3 hover:bg-[#e1bac2]/5 -mx-5 px-5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e1bac2]/15 text-[#8c5a63]">
                        <Gem className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#171414] truncate">
                          {req.goldDetails.assetType} {req.goldDetails.karat}K — {req.goldDetails.weightG}g
                        </p>
                        <p className="text-[10px] text-[#4A4A4A]/40 font-mono">
                          {req.borrowerWallet.slice(0, 6)}...{req.borrowerWallet.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <Badge className="rounded-full bg-amber-100 text-amber-700 border-0 text-[10px]">
                      <Clock className="h-2.5 w-2.5 mr-0.5" /> New
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent SAGs — narrower */}
        <Card className="lg:col-span-2 border-[#171414]/8 bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div>
              <h2 className="text-sm font-bold text-[#171414]">Recent SAGs</h2>
              <p className="text-[10px] text-[#4A4A4A]/50">{sags.length} total</p>
            </div>
            <Link href="/pawnshop/nfts" className="text-[10px] font-bold text-[#e1bac2] hover:underline uppercase tracking-wider">
              View All →
            </Link>
          </div>
          <CardContent className="px-5 pb-4 pt-0">
            {sagsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1"><Skeleton className="h-3 w-28 mb-1" /><Skeleton className="h-2.5 w-16" /></div>
                  </div>
                ))}
              </div>
            ) : sags.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="h-8 w-8 text-[#4A4A4A]/15 mx-auto mb-2" />
                <p className="text-xs text-[#4A4A4A]/50">No SAGs yet</p>
                <Button asChild size="sm" className="mt-3 rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black text-xs">
                  <Link href="/pawnshop/nfts/new">Create SAG</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#171414]/5">
                {sags.slice(0, 5).map((sag) => (
                  <Link
                    key={sag.sagId}
                    href={`/pawnshop/nfts/${sag.sagId}`}
                    className="flex items-center justify-between py-3 hover:bg-[#e1bac2]/5 -mx-5 px-5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#171414]/5 text-[#171414]">
                        <Gem className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#171414] truncate">
                          {sag.sagName || `SAG #${sag.tokenId}`}
                        </p>
                        <p className="text-[10px] text-[#4A4A4A]/40">
                          {sag.sagProperties?.weightG}g · {sag.sagProperties?.karat}K
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#171414]">
                        ${sag.sagProperties?.valuation?.toLocaleString()}
                      </p>
                      <Badge
                        className={`text-[10px] border-0 rounded-full ${
                          sag.approvalStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {sag.approvalStatus || 'pending'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: '/pawnshop/requests', icon: Inbox, label: 'Requests', desc: 'Review & accept', color: 'bg-amber-50 text-amber-600' },
          { href: '/pawnshop/repayments', icon: TrendingUp, label: 'Loans', desc: 'Track repayments', color: 'bg-emerald-50 text-emerald-600' },
          { href: '/pawnshop/returns', icon: DollarSign, label: 'Returns', desc: 'Settle investors', color: 'bg-[#e1bac2]/20 text-[#8c5a63]' },
          { href: '/pawnshop/borrowers', icon: User, label: 'Borrowers', desc: 'Manage clients', color: 'bg-blue-50 text-blue-600' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-3 rounded-2xl border border-[#171414]/8 bg-white/70 p-4 backdrop-blur-sm transition-all hover:border-[#e1bac2]/30 hover:shadow-md"
          >
            <div className={`rounded-xl p-2.5 ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#171414]">{item.label}</p>
              <p className="text-[10px] text-[#4A4A4A]/50">{item.desc}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[#4A4A4A]/20 group-hover:text-[#e1bac2] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
