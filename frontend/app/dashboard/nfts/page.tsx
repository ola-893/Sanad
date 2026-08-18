'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NFTCollateral } from "@/components/dashboard/nft-collateral"
import { ProtectedRoute } from "@/components/auth/protected-route"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

export default function DashboardNftsPage() {
  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <p className="kicker-gold">Collateral</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
              NFT Collateral
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Digital representation of your jewelry collateral
            </p>
          </div>
          <Card className={glass}>
            <CardHeader>
              <CardTitle className="font-display">Your Jewelry NFTs</CardTitle>
              <CardDescription>Digital representation of your jewelry collateral</CardDescription>
            </CardHeader>
            <CardContent>
              <NFTCollateral showAll={true} />
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
