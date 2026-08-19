'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaymentMethods } from "@/components/payment/payment-methods"
import { PaymentHistory } from "@/components/payment/payment-history"
import { AutoPayment } from "@/components/payment/auto-payment"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Wallet, Clock, History } from "lucide-react"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

export default function PaymentPage() {
  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Header */}
          <div>
            <p className="kicker-gold">Payments</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
              Repayment Center
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit CTC repayments on-chain and track your payment history
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="make-payment" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="make-payment" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Make Payment</span>
              </TabsTrigger>
              <TabsTrigger value="payment-history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="auto-payment" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Auto-Repay</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="make-payment">
              <Card className={glass}>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                      <Wallet className="h-4 w-4 text-[#171414]" />
                    </span>
                    Make a Repayment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentMethods />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-history">
              <Card className={glass}>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                      <History className="h-4 w-4 text-[#171414]" />
                    </span>
                    On-Chain Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentHistory />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="auto-payment">
              <Card className={glass}>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                      <Clock className="h-4 w-4 text-[#171414]" />
                    </span>
                    Auto-Repay Setup
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AutoPayment />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}
