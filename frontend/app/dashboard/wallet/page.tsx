'use client';

import { WalletBalance } from "@/components/dashboard/wallet-balance"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function DashboardWalletPage() {
  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <p className="kicker-gold">Wallet</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
              Wallet Balance
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your MYR stable coin balance and available funds
            </p>
          </div>
          <WalletBalance />
        </div>
      </div>
    </ProtectedRoute>
  )
}
