"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  Phone,
  Shield,
  WalletIcon,
  Calendar,
  RefreshCw,
  FileText,
  TrendingUp,
  DollarSign,
} from "lucide-react"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import apiInstance from "@/lib/axios-v1"

interface UserProfile {
  userId: string
  userEmail: string
  userContactNo: string
  userFirstName: string
  userLastName: string
  gender: string
  accountId: string
  status: string
  createdAt: string
  roleId: string
  icNo: string
}

export default function InvestorProfilePage() {
  const { walletAddress, isConnected, chainId, truncateAddress } = useWalletAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const networkName =
    chainId === 102031
      ? "Creditcoin 3 Testnet"
      : chainId === 11155111
      ? "ETH Sepolia Testnet"
      : chainId === 1
      ? "Ethereum Mainnet"
      : "Creditcoin 3 Testnet"

  const fetchProfile = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiInstance.get("/auth/user/profile")
      setProfile(res.data.data?.userInfo || res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchProfile() }, [])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "\u2014"
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    } catch { return dateStr }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="kicker-gold">Investor Account</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171414] mt-1">My Profile</h1>
          </div>
          <Button onClick={fetchProfile} disabled={isLoading} variant="outline"
            className="rounded-full border-[#171414]/15 text-[#171414] hover:bg-[#171414]/5 self-start">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-2xl border border-[#171414]/10 p-6 shadow-soft-editorial animate-pulse">
                <div className="h-4 bg-[#171414]/10 rounded w-1/3 mb-4" />
                <div className="space-y-3">
                  <div className="h-3 bg-[#171414]/5 rounded w-full" />
                  <div className="h-3 bg-[#171414]/5 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="glass-panel rounded-2xl border border-red-200 p-6 text-center shadow-soft-editorial bg-red-50/50">
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={fetchProfile} variant="outline" className="mt-3 rounded-full border-red-200 text-red-600 hover:bg-red-50">Try Again</Button>
          </div>
        )}

        {!isLoading && !error && profile && (
          <>
            {/* Name + Status */}
            <div className="glass-panel rounded-2xl border border-[#171414]/10 p-5 sm:p-6 shadow-soft-editorial">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#171414]">
                    <span className="text-lg font-bold text-[#E1BAC2]">{profile.userFirstName?.[0]}{profile.userLastName?.[0]}</span>
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-[#171414]">{profile.userFirstName} {profile.userLastName}</h2>
                    <p className="text-sm text-[#4A4A4A]">{profile.userEmail}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 self-start">{profile.status || "Active"}</Badge>
              </div>
            </div>

            {/* Investor Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel rounded-2xl border border-[#171414]/10 p-4 shadow-soft-editorial">
                <div className="flex items-center gap-2 text-[#4A4A4A] mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Invested</span>
                </div>
                <p className="text-2xl font-extrabold text-[#171414]">$0</p>
              </div>
              <div className="glass-panel rounded-2xl border border-[#171414]/10 p-4 shadow-soft-editorial">
                <div className="flex items-center gap-2 text-[#4A4A4A] mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Active Investments</span>
                </div>
                <p className="text-2xl font-extrabold text-[#171414]">0</p>
              </div>
            </div>

            {/* Personal Info */}
            <div className="glass-panel rounded-2xl border border-[#171414]/10 shadow-soft-editorial overflow-hidden">
              <div className="p-5 border-b border-[#171414]/10">
                <p className="kicker-gold">Personal Information</p>
              </div>
              <div className="divide-y divide-[#171414]/5">
                {[
                  { icon: <User className="h-4 w-4" />, label: "Full Name", value: `${profile.userFirstName} ${profile.userLastName}` },
                  { icon: <Mail className="h-4 w-4" />, label: "Email", value: profile.userEmail },
                  { icon: <Phone className="h-4 w-4" />, label: "Phone", value: profile.userContactNo || "\u2014" },
                  { icon: <Shield className="h-4 w-4" />, label: "Gender", value: profile.gender || "\u2014" },
                  { icon: <FileText className="h-4 w-4" />, label: "ID Number", value: profile.icNo || "\u2014" },
                  { icon: <Calendar className="h-4 w-4" />, label: "Member Since", value: formatDate(profile.createdAt) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F5F5F3]/40 transition-colors">
                    <div className="flex items-center gap-3 text-[#4A4A4A]">{row.icon}<span className="text-sm">{row.label}</span></div>
                    <span className="text-sm font-medium text-[#171414] text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Wallet */}
            {isConnected && walletAddress && (
              <div className="glass-panel rounded-2xl border border-[#171414]/10 shadow-soft-editorial overflow-hidden">
                <div className="p-5 border-b border-[#171414]/10"><p className="kicker-gold">Wallet</p></div>
                <div className="divide-y divide-[#171414]/5">
                  {[
                    { icon: <WalletIcon className="h-4 w-4" />, label: "Connected Wallet", value: truncateAddress(walletAddress) },
                    { icon: <Shield className="h-4 w-4" />, label: "Network", value: networkName },
                    { icon: <Shield className="h-4 w-4" />, label: "Role", value: "INVESTOR" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F5F5F3]/40 transition-colors">
                      <div className="flex items-center gap-3 text-[#4A4A4A]">{row.icon}<span className="text-sm">{row.label}</span></div>
                      <span className="text-sm font-medium text-[#171414] text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account Details */}
            <div className="glass-panel rounded-2xl border border-[#171414]/10 p-5 shadow-soft-editorial">
              <p className="kicker-gold mb-3">Account Details</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-[#171414]/5">
                  <span className="text-sm text-[#4A4A4A]">User ID</span>
                  <span className="text-sm font-mono font-bold text-[#171414] break-all text-right max-w-[60%]">{profile.userId}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#4A4A4A]">Role</span>
                  <span className="text-sm font-bold text-[#171414]">INVESTOR</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
