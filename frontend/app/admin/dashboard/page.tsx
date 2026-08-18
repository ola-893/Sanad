"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  Wallet,
  Building2,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { useUserRole } from "@/hooks/use-user-role"
import { AdminOverview } from "@/components/admin/admin-overview"
import { RecentActivity } from "@/components/admin/recent-activity"

export default function AdminDashboardPage() {
  const { role, isLoading } = useUserRole()
  const [adminTitle, setAdminTitle] = useState<string>("")

  useEffect(() => {
    if (!isLoading && role) {
      const title = localStorage.getItem("admin_title")
      if (title) {
        setAdminTitle(title)
      }
    }
  }, [isLoading, role])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back, {adminTitle || "Admin"}. Here&apos;s what&apos;s happening with your platform.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* System Alerts */}
      <Alert className="border-destructive/30 bg-destructive/10">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <AlertTitle className="text-destructive">Attention Required</AlertTitle>
        <AlertDescription className="text-destructive">
          12 pending loan applications, 8 KYC verifications, and 3 compliance issues need your immediate attention.
        </AlertDescription>
      </Alert>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total SAGs Listed</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">127</div>
            <div className="flex items-center gap-1 text-xs text-primary">
              <ArrowUpRight className="h-3 w-3" />
              <span>+12 from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Raised (MYR)</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">RM 2.4M</div>
            <div className="flex items-center gap-1 text-xs text-primary">
              <ArrowUpRight className="h-3 w-3" />
              <span>+18% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Investors</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">573</div>
            <div className="flex items-center gap-1 text-xs text-primary">
              <ArrowUpRight className="h-3 w-3" />
              <span>+47 new this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Investor Profit</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">6.2%</div>
            <div className="flex items-center gap-1 text-xs text-orange-600">
              <span>Annual return rate</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPI Cards Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">23</div>
            <div className="text-xs text-muted-foreground">Awaiting review</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Branches</CardTitle>
            <Building2 className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">25</div>
            <div className="text-xs text-muted-foreground">Ar Rahnu partners</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Token Transactions</CardTitle>
            <Wallet className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">1,247</div>
            <div className="text-xs text-muted-foreground">This month</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Score</CardTitle>
            <Shield className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">94%</div>
            <div className="text-xs text-muted-foreground">Platform health</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Charts and Analytics */}
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

          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>System Status Overview</CardTitle>
              <CardDescription>Current platform health and operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-success" />
                  <div>
                    <div className="font-medium text-success">Operational</div>
                    <div className="text-sm text-success">All systems running</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                  <div>
                    <div className="font-medium text-warning-foreground">Attention</div>
                    <div className="text-sm text-warning">8 items need review</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <XCircle className="h-8 w-8 text-destructive" />
                  <div>
                    <div className="font-medium text-destructive">Critical</div>
                    <div className="text-sm text-destructive">3 urgent issues</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system events and actions</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start bg-primary hover:bg-primary/90">
                <FileText className="h-4 w-4 mr-2" />
                Review Pending SAGs
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Users className="h-4 w-4 mr-2" />
                Manage Investors
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <CreditCard className="h-4 w-4 mr-2" />
                Process Settlements
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Shield className="h-4 w-4 mr-2" />
                Compliance Review
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
