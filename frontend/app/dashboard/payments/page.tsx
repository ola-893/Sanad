'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PaymentSchedule } from "@/components/dashboard/payment-schedule"
import { ProtectedRoute } from "@/components/auth/protected-route"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

export default function DashboardPaymentsPage() {
  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <p className="kicker-gold">Payments</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
              Payment History
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Your upcoming and past payments</p>
          </div>
          <Card className={glass}>
            <CardHeader>
              <CardTitle className="font-display">Payment Schedule</CardTitle>
              <CardDescription>Your upcoming and past payments</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentSchedule showAll={true} />
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
