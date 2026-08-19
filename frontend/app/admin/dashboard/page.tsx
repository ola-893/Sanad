"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  ArrowUpRight,
  FileText,
  TrendingUp,
  Users,
  Wallet,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Coins,
  Activity,
} from "lucide-react"
import { useUserRole } from "@/hooks/use-user-role"
import { AdminOverview } from "@/components/admin/admin-overview"
import { RecentActivity } from "@/components/admin/recent-activity"
import apiInstance from "@/lib/axios-v1"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

interface SAGResponse {
  success: boolean
  data: any[]
  pagination: {
    totalCount: number
    totalPages: number
    currentPage: number
  }
}

interface GoldPriceData {
  id: string
  pricePerGramUsd: string
  pricePerGramMyr: string
  exchangeRate: string
  createdAt: string
}

interface CreditcoinStatus {
  success: boolean
  network: {
    chainId: number
    blockNumber: number
    gasPrice: string
    isHealthy: boolean
  }
}

export default function AdminDashboardPage() {
  const { role, isLoading: roleLoading } = useUserRole()
  const [adminTitle, setAdminTitle] = useState<string>("")

  useEffect(() => {
    if (!roleLoading && role) {
      const title = localStorage.getItem("admin_title")
      if (title) setAdminTitle(title)
    }
  }, [roleLoading, role])

  // Fetch all SAGs for stats
  const { data: allSags, isLoading: sagsLoading } = useQuery({
    queryKey: ["admin-all-sags"],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get("/sag?page_size=1&page_number=1")
      return data
    },
  })

  // Fetch pending SAGs
  const { data: pendingSags } = useQuery({
    queryKey: ["admin-pending-sags"],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get("/sag?page_size=1&page_number=1&status=pending")
      return data
    },
  })

  // Fetch active SAGs
  const { data: activeSags } = useQuery({
    queryKey: ["admin-active-sags"],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get("/sag?page_size=1&page_number=1&status=active")
      return data
    },
  })

  // Fetch closed SAGs
  const { data: closedSags } = useQuery({
    queryKey: ["admin-closed-sags"],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get("/sag?page_size=1&page_number=1&status=closed")
      return data
    },
  })

  // Fetch gold price
  const { data: goldPrice } = useQuery({
    queryKey: ["admin-gold-price"],
    queryFn: async (): Promise<{ success: boolean; data: GoldPriceData }> => {
      const { data } = await apiInstance.get("/gold-price/latest")
      return data
    },
  })

  // Fetch creditcoin status
  const { data: networkStatus } = useQuery({
    queryKey: ["admin-network-status"],
    queryFn: async (): Promise<CreditcoinStatus> => {
      const { data } = await apiInstance.get("/creditcoin/status")
      return data
    },
    refetchInterval: 30_000,
  })

  const totalCount = allSags?.pagination?.totalCount || 0
  const pendingCount = pendingSags?.pagination?.totalCount || 0
  const activeCount = activeSags?.pagination?.totalCount || 0
  const closedCount = closedSags?.pagination?.totalCount || 0

  const totalRaised = activeSags?.data?.reduce((sum: number, sag: any) => {
    return sum + (sag.sagProperties?.valuation || 0)
  }, 0) || 0

  const avgRoi = activeSags?.data?.length
    ? activeSags.data.reduce((sum: number, sag: any) => sum + (sag.sagProperties?.investorRoiPercentage || 0), 0) / activeSags.data.length
    : 0

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {adminTitle || "Admin"}. Here&apos;s your platform overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Pending Attention Alert */}
      {pendingCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Pending Reviews</AlertTitle>
          <AlertDescription className="text-amber-700">
            {pendingCount} SAG listing{pendingCount !== 1 ? "s" : ""} awaiting approval.
          </AlertDescription>
        </Alert>
      )}

      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total SAGs</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sagsLoading ? "—" : totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCount} active · {closedCount} closed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <Link href="/admin/sag-listings/pending" className="text-xs text-primary hover:underline mt-1 inline-block">
              Review now →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Valuation</CardTitle>
            <Coins className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRaised > 0 ? `CTC ${(totalRaised / 1000).toFixed(0)}K` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across active listings</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Investor ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRoi > 0 ? `${avgRoi.toFixed(1)}%` : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">Annual return rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gold Price (CTC/g)</CardTitle>
            <Coins className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {goldPrice?.data?.pricePerGramMyr ? `CTC ${parseFloat(goldPrice.data.pricePerGramMyr).toFixed(2)}` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {goldPrice?.data?.pricePerGramUsd ? `$${parseFloat(goldPrice.data.pricePerGramUsd).toFixed(2)}/g USD` : "Loading..."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Network Status</CardTitle>
            <Activity className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${networkStatus?.network?.isHealthy ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-2xl font-bold">
                {networkStatus?.network?.isHealthy ? "Healthy" : "Offline"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Block #{networkStatus?.network?.blockNumber?.toLocaleString() || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compliance</CardTitle>
            <Shield className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">Shariah</div>
            <p className="text-xs text-muted-foreground mt-1">AAOIFI compliant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closed SAGs</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedCount}</div>
            <Link href="/admin/sag-listings/completed" className="text-xs text-primary hover:underline mt-1 inline-block">
              View completed →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>Token mints, burns, and listing activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminOverview />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current platform health and operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-sm font-medium text-emerald-800">API</div>
                    <div className="text-xs text-emerald-600">Operational</div>
                  </div>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${networkStatus?.network?.isHealthy ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                  <Activity className={`h-5 w-5 ${networkStatus?.network?.isHealthy ? "text-emerald-600" : "text-red-600"}`} />
                  <div>
                    <div className={`text-sm font-medium ${networkStatus?.network?.isHealthy ? "text-emerald-800" : "text-red-800"}`}>Blockchain</div>
                    <div className={`text-xs ${networkStatus?.network?.isHealthy ? "text-emerald-600" : "text-red-600"}`}>
                      {networkStatus?.network?.isHealthy ? "CC3 Connected" : "Disconnected"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-sm font-medium text-emerald-800">Compliance</div>
                    <div className="text-xs text-emerald-600">Shariah Certified</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system events</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant={pendingCount > 0 ? "default" : "outline"} asChild>
                <Link href="/admin/sag-listings/pending">
                  <Clock className="h-4 w-4 mr-2" />
                  Review Pending SAGs
                  {pendingCount > 0 && <Badge className="ml-auto bg-amber-500">{pendingCount}</Badge>}
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/compliance">
                  <Shield className="h-4 w-4 mr-2" />
                  Compliance Ledger
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/sag-listings">
                  <FileText className="h-4 w-4 mr-2" />
                  Active Listings
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/repayment">
                  <Wallet className="h-4 w-4 mr-2" />
                  Repayments
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
