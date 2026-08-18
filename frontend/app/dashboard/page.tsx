'use client';

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { PaymentSchedule } from "@/components/dashboard/payment-schedule"
import { NFTCollateral } from "@/components/dashboard/nft-collateral"
import { Overview } from "@/components/dashboard/overview"
import { AlertCircle, ArrowRight, Bell, Clock, CreditCard, Gem, type LucideIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ProtectedRoute } from "@/components/auth/protected-route"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: LucideIcon }) {
  return (
    <Card className={`${glass} border-l-4 border-l-accent`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </CardTitle>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
          <Icon className="h-4 w-4 text-[#171414]" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums text-[#171414]">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <DashboardHeader />

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Loans" value="2" sub="Total value: RM 12,500" icon={CreditCard} />
            <StatCard label="Next Payment" value="15 Apr" sub="Amount: RM 1,250" icon={Clock} />
            <StatCard label="NFT Collateral" value="2" sub="Secure on Hedera" icon={Gem} />
            <StatCard label="Notifications" value="3" sub="2 unread messages" icon={Bell} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className={`${glass} lg:col-span-4`}>
              <CardHeader>
                <p className="kicker-gold">Portfolio</p>
                <CardTitle className="font-display">Cash Flow Overview</CardTitle>
                <CardDescription>Financing vs repayments, last 8 months</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className={`${glass} lg:col-span-3`}>
              <CardHeader>
                <p className="kicker-gold">Activity</p>
                <CardTitle className="font-display">Recent Activity</CardTitle>
                <CardDescription>Latest account events</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity />
              </CardContent>
            </Card>
          </div>

          <Alert className={`${glass} rounded-2xl border-l-4 border-l-warning`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/30">
              <AlertCircle className="h-4 w-4" />
            </span>
            <AlertTitle className="font-display">Payment Reminder</AlertTitle>
            <AlertDescription>
              Your next payment of RM 1,250 is due on April 15, 2025. Please ensure your account has sufficient funds.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className={`${glass} lg:col-span-4`}>
              <CardHeader>
                <p className="kicker-gold">Schedule</p>
                <CardTitle className="font-display">Payment Schedule</CardTitle>
                <CardDescription>Your upcoming payments for all active loans</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentSchedule />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full rounded-full">
                  <Link href="/dashboard/payments" className="flex items-center justify-center gap-2">
                    View All Payments <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className={`${glass} lg:col-span-3`}>
              <CardHeader>
                <p className="kicker-gold">Collateral</p>
                <CardTitle className="font-display">NFT Collateral</CardTitle>
                <CardDescription>Your jewelry secured as NFTs</CardDescription>
              </CardHeader>
              <CardContent>
                <NFTCollateral />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full rounded-full">
                  <Link href="/dashboard/nfts" className="flex items-center justify-center gap-2">
                    View All NFTs <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
