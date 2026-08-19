"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, User, Mail, Phone, CreditCard, Calendar, CheckCircle, ArrowUpRight, Shield } from "lucide-react"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import Link from "next/link"
import { useInvestorNfts } from "@/hooks/use-investor-nfts"
import { useAuth } from "@/hooks/use-auth"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

export default function ProfilePage() {
  const [user] = useAtom(userAtom)
  const { logout } = useAuth()
  const { data: nfts = [] } = useInvestorNfts()

  const profile = user?.userInfo || user?.profile

  const firstName = profile?.userFirstName || user?.name?.split(" ")[0] || "User"
  const lastName = profile?.userLastName || user?.name?.split(" ")[1] || ""
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  const email = profile?.userEmail || user?.email || ""
  const phone = profile?.userContactNo || ""
  const icNo = profile?.icNo || ""
  const gender = profile?.gender || ""
  const roleId = profile?.roleId || "INVESTOR"
  const createdAt = profile?.createdAt
  const updatedAt = profile?.updatedAt
  const status = profile?.status || "ACTIVE"

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Hero Section */}
          <Card className={`${glass} overflow-hidden`}>
            <div className="relative h-24 bg-gradient-to-r from-[#171414] via-[#2a2520] to-[#171414]">
              <div className="absolute inset-0 bg-[url('/gold-pattern.svg')] opacity-10" />
            </div>
            <CardContent className="relative px-6 pt-6 pb-6">
              <div className="flex flex-col items-center sm:flex-row sm:items-end gap-4 -mt-12">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl gradient-gold text-[#171414] font-display text-3xl font-extrabold border-4 border-white shadow-lg">
                  {initials}
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#171414]">
                    {firstName} {lastName}
                  </h1>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-1.5">
                    <Badge variant="outline" className="border-accent/30 bg-accent/10 text-[#171414]">
                      {roleId === "INVESTOR" ? "Investor" : roleId}
                    </Badge>
                    <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {status}
                    </Badge>
                  </div>
                </div>
                <div className="shrink-0">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => logout()}>
                    Sign Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">

            {/* Personal Information */}
            <Card className={`${glass}`}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                    <User className="h-4 w-4 text-[#171414]" />
                  </span>
                  <CardTitle className="font-display text-base">Personal Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Full Name</p>
                        <p className="text-sm font-medium text-[#171414]">{firstName} {lastName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Email</p>
                        <p className="text-sm font-medium text-[#171414]">{email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium text-[#171414]">{phone || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">IC Number</p>
                        <p className="text-sm font-medium font-mono text-[#171414]">{icNo || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Gender</p>
                      <p className="text-sm font-medium text-[#171414]">{gender || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-[#171414]/10 bg-white/50 px-4 py-3">
                      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Role</p>
                      <p className="text-sm font-medium text-[#171414] capitalize">{roleId?.toLowerCase() || "—"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Details */}
          <Card className={`${glass}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25">
                  <Calendar className="h-4 w-4 text-[#171414]" />
                </span>
                <CardTitle className="font-display text-base">Account Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-[#171414]/10 bg-white/50 p-4 text-center">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Member Since</p>
                  <p className="text-sm font-medium text-[#171414]">
                    {createdAt
                      ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                      : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-[#171414]/10 bg-white/50 p-4 text-center">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium text-[#171414]">
                    {updatedAt
                      ? new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-[#171414]/10 bg-white/50 p-4 text-center">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Collateral NFTs</p>
                  <p className="text-sm font-bold text-[#171414]">{nfts.length}</p>
                </div>
                <div className="rounded-xl border border-[#171414]/10 bg-white/50 p-4 text-center">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Account Status</p>
                  <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard">
              <Card className={`${glass} cursor-pointer transition-all hover:bg-white/80`}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-gold">
                    <ArrowUpRight className="h-5 w-5 text-[#171414]" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-[#171414]">Dashboard</p>
                    <p className="text-xs text-muted-foreground">View your overview</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/wallet">
              <Card className={`${glass} cursor-pointer transition-all hover:bg-white/80`}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-gold">
                    <Wallet className="h-5 w-5 text-[#171414]" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-[#171414]">Wallet</p>
                    <p className="text-xs text-muted-foreground">Manage your funds</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/apply">
              <Card className={`${glass} cursor-pointer transition-all hover:bg-white/80`}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-gold">
                    <Shield className="h-5 w-5 text-[#171414]" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-[#171414]">Apply</p>
                    <p className="text-xs text-muted-foreground">New financing application</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
