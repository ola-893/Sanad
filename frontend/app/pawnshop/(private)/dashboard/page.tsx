"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  FileText,
  Coins,
  TrendingUp,
  Plus,
  Inbox,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import apiInstance from '@/lib/axios-v1'
import { Skeleton } from '@/components/ui/skeleton'
import { useWalletAuth } from '@/hooks/use-wallet-auth'
import { Wallet } from 'lucide-react'

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface SAGProperties {
  valuation: number
  currency: string
  assetType: string
  weightG: number
  karat: number
}

interface SAG {
  sagId: string
  sagName: string
  sagDescription: string
  sagProperties: SAGProperties
  status?: 'active' | 'closed'
}

interface SAGResponse {
  success: boolean
  data: SAG[]
  pagination: {
    totalCount: number
  }
}

interface PledgeRequest {
  id: string
  borrowerId: string
  borrowerWallet: string
  goldDetails: {
    assetType: string
    karat: number
    weightG: number
    purity: number
    estimatedValue: number
  }
  requestedAmount: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

interface PawnshopProfile {
  businessName: string
  kycStatus: string
  city: string
  state: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
}

function StatCardSkeleton() {
  return (
    <Card className={glass}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

function ListItemSkeleton() {
  return (
    <div className="flex items-center space-x-4 py-3">
      <Skeleton className="h-2 w-2 rounded-full" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

export default function PawnshopDashboard() {
  const { balance: walletBalance } = useWalletAuth()
  const ethBalance = walletBalance || '0.0000'

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

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['pawnshop-profile'],
    queryFn: async (): Promise<{ success: boolean; data: PawnshopProfile }> => {
      const { data } = await apiInstance.get('/pawnshop/profile')
      return data
    },
  })

  const sags = sagsData?.data || []
  const totalCount = sagsData?.pagination?.totalCount || 0
  const activeCount = sags.filter((s) => s.status === 'active' || !s.status).length
  const totalValue = sags.reduce((sum, s) => sum + (s.sagProperties?.valuation || 0), 0)

  const requests = requestsData?.data || []
  const pendingRequests = requests.filter((r) => r.status === 'pending')

  const profile = profileData?.data
  const kycApproved = profile?.kycStatus === 'approved'

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#171414]">
            Welcome back, {profileLoading ? <Skeleton className="inline-block h-8 w-40" /> : (profile?.businessName || 'Partner')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your gold collateral, pledge requests, and SAG portfolio
          </p>
        </div>
        <Button asChild className="bg-[#171414] text-[#E1BAC2] hover:bg-black">
          <Link href="/pawnshop/nfts/new">
            <Plus className="mr-2 h-4 w-4" />
            List New SAG
          </Link>
        </Button>
      </div>

      {/* KYC Banner */}
      {!profileLoading && profile && (
        <Card className={`border-l-4 ${
          profile.kycStatus === 'approved' ? 'border-l-emerald-400 bg-emerald-50' :
          profile.kycStatus === 'rejected' ? 'border-l-red-400 bg-red-50' :
          'border-l-amber-400 bg-amber-50'
        }`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile.kycStatus === 'approved' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : profile.kycStatus === 'rejected' ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <Clock className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <p className={`font-medium ${
                  profile.kycStatus === 'approved' ? 'text-emerald-800' :
                  profile.kycStatus === 'rejected' ? 'text-red-800' : 'text-amber-800'
                }`}>
                  KYC Status: <span className="capitalize">{profile.kycStatus}</span>
                </p>
                <p className={`text-sm ${
                  profile.kycStatus === 'approved' ? 'text-emerald-700' :
                  profile.kycStatus === 'rejected' ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {profile.kycStatus === 'approved'
                    ? 'Your account is verified. You can receive pledge requests from borrowers.'
                    : profile.kycStatus === 'rejected'
                    ? 'Your KYC was rejected. Please update your documents and reapply.'
                    : 'Your KYC is pending admin review. You can update your profile while waiting.'}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className={
              profile.kycStatus === 'approved' ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-100' :
              profile.kycStatus === 'rejected' ? 'border-red-300 text-red-700 hover:bg-red-100' :
              'border-amber-300 text-amber-700 hover:bg-amber-100'
            }>
              <Link href="/pawnshop/profile">
                {profile.kycStatus === 'approved' ? 'View Profile' : 'Update Profile'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sagsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card className={`${glass} border-l-4 border-l-blue-500`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
                <Wallet className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#171414]">{ethBalance} ETH</div>
                <p className="text-xs text-muted-foreground">Sepolia Testnet</p>
              </CardContent>
            </Card>

            <Card className={`${glass} border-l-4 border-l-primary`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total SAGs</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#171414]">{totalCount}</div>
                <p className="text-xs text-muted-foreground">{activeCount} active</p>
              </CardContent>
            </Card>

            <Card className={`${glass} border-l-4 border-l-emerald-500`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Valuation</CardTitle>
                <Coins className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#171414]">
                  {totalValue > 0 ? `CTC ${(totalValue / 1000).toFixed(1)}K` : '—'}
                </div>
                <p className="text-xs text-muted-foreground">Portfolio value</p>
              </CardContent>
            </Card>

            <Card className={`${glass} border-l-4 border-l-rose-500`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
                <Inbox className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#171414]">{pendingRequests.length}</div>
                <p className="text-xs text-muted-foreground">Awaiting your review</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Two Column Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Pledge Requests */}
        <Card className={glass}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display text-[#171414]">Pending Pledge Requests</CardTitle>
              <CardDescription>Incoming requests from borrowers</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/pawnshop/requests">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ListItemSkeleton key={i} />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending requests</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Borrower pledge requests will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#171414]/10 bg-[#FAFAF8] hover:bg-[#E1BAC2]/10 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E1BAC2]/20">
                        <User className="h-4 w-4 text-[#171414]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#171414] truncate">
                          {req.goldDetails.assetType} {req.goldDetails.karat}K
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.goldDetails.weightG}g · {req.borrowerWallet.slice(0, 6)}...{req.borrowerWallet.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-mono shrink-0 ${STATUS_COLORS.pending}`}>
                      <Clock className="h-3 w-3 mr-1" />
                      pending
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent SAGs */}
        <Card className={glass}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display text-[#171414]">Recent SAGs</CardTitle>
              <CardDescription>Your latest collateral listings</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/pawnshop/nfts">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {sagsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ListItemSkeleton key={i} />
                ))}
              </div>
            ) : sags.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No SAGs listed yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first SAG to start accepting investments
                </p>
                <Button asChild size="sm" className="mt-3 bg-[#171414] text-[#E1BAC2] hover:bg-black">
                  <Link href="/pawnshop/nfts/new">
                    <Plus className="mr-2 h-3 w-3" />
                    List New SAG
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sags.slice(0, 5).map((sag) => (
                  <div
                    key={sag.sagId}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#171414]/10 bg-[#FAFAF8] hover:bg-[#E1BAC2]/10 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        sag.status === 'closed' ? 'bg-muted' : 'bg-emerald-500'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#171414] truncate">
                          {sag.sagName || `SAG #${sag.sagId.slice(-8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sag.sagProperties?.assetType} · {sag.sagProperties?.weightG}g
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-[#171414]">
                        {sag.sagProperties?.currency} {sag.sagProperties?.valuation?.toLocaleString()}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          sag.status === 'closed'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {sag.status === 'closed' ? 'closed' : 'active'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className={glass}>
        <CardHeader>
          <CardTitle className="text-lg font-display text-[#171414]">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button asChild variant="outline" className="h-auto py-4 justify-start gap-3 border-[#171414]/15 hover:bg-[#E1BAC2]/10">
              <Link href="/pawnshop/nfts/new">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171414]">
                  <Plus className="h-5 w-5 text-[#E1BAC2]" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#171414]">New SAG</p>
                  <p className="text-xs text-muted-foreground">List new collateral</p>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-4 justify-start gap-3 border-[#171414]/15 hover:bg-[#E1BAC2]/10">
              <Link href="/pawnshop/requests">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171414]">
                  <Inbox className="h-5 w-5 text-[#E1BAC2]" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#171414]">Pledge Requests</p>
                  <p className="text-xs text-muted-foreground">Review borrower requests</p>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto py-4 justify-start gap-3 border-[#171414]/15 hover:bg-[#E1BAC2]/10">
              <Link href="/pawnshop/profile">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171414]">
                  <Building2 className="h-5 w-5 text-[#E1BAC2]" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#171414]">My Profile</p>
                  <p className="text-xs text-muted-foreground">Manage business info</p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
