"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertTriangle, CreditCard, FileText, Shield, Coins } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"

interface AuditLogEntry {
  id: string
  eventType: string
  tokenId: string
  blockNumber: number
  transactionHash: string
  timestamp: string
  details: any
}

const getEventMeta = (eventType: string) => {
  if (eventType.includes("MINTED") || eventType.includes("COLLATERAL_MINTED")) {
    return { icon: Coins, color: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Token Minted" }
  }
  if (eventType.includes("FROZEN")) {
    return { icon: Shield, color: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Asset Frozen" }
  }
  if (eventType.includes("WIPED")) {
    return { icon: AlertTriangle, color: "text-red-600", badge: "bg-red-50 text-red-700 border-red-200", label: "Token Wiped" }
  }
  if (eventType.includes("REPAYMENT") || eventType.includes("SETTLED")) {
    return { icon: CreditCard, color: "text-blue-600", badge: "bg-blue-50 text-blue-700 border-blue-200", label: "Repayment" }
  }
  if (eventType.includes("UNLOCKED")) {
    return { icon: CheckCircle, color: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Collateral Unlocked" }
  }
  return { icon: FileText, color: "text-gray-600", badge: "bg-gray-50 text-gray-700 border-gray-200", label: eventType.replace(/_/g, " ") }
}

export function RecentActivity({ showAll = false }: { showAll?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const { data } = await apiInstance.get("/creditcoin/audit-logs")
      return data?.logs as AuditLogEntry[] | undefined
    },
    refetchInterval: 30_000,
  })

  const logs = (data || []).slice(0, showAll ? 20 : 6)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border animate-pulse">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const meta = getEventMeta(log.eventType)
        const Icon = meta.icon
        const timeAgo = getTimeAgo(log.timestamp)

        return (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
          >
            <div className="flex-shrink-0 mt-0.5">
              <Icon className={`h-4 w-4 ${meta.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-medium text-foreground truncate">{meta.label}</h4>
                <Badge variant="outline" className={`text-[10px] ${meta.badge}`}>
                  {log.eventType.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {log.tokenId ? `Token #${log.tokenId}` : "System event"}
                {log.blockNumber ? ` · Block #${log.blockNumber}` : ""}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
                {log.transactionHash && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"}/tx/${log.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {log.transactionHash.slice(0, 8)}...
                  </a>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getTimeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
