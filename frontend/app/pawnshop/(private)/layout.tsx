import type React from "react"
import { PawnshopHeader } from "@/components/pawnshop-header"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function PawnshopDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requiredRole="pawnshop">
      <div className="min-h-screen bg-[#FAFAF8]">
        <PawnshopHeader />
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 md:px-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
