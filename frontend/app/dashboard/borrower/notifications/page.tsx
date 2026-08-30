"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { toast } from "sonner"
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  XCircle,
  Shield,
  CreditCard,
  Clock,
  Loader2,
  ExternalLink,
  Store,
  Gem,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data: Record<string, unknown>
  read: boolean
  createdAt: string
}

const NOTIFICATION_CONFIG: Record<string, { icon: typeof Bell; color: string; bgColor: string }> = {
  pledge_request_new: { icon: Store, color: "text-blue-600", bgColor: "bg-blue-100" },
  pledge_accepted: { icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  pledge_rejected: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100" },
  gold_verified: { icon: Shield, color: "text-purple-600", bgColor: "bg-purple-100" },
  gold_rejected: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100" },
  payment_received: { icon: CreditCard, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  sag_minted: { icon: Gem, color: "text-[#E1BAC2]", bgColor: "bg-[#E1BAC2]/20" },
}

export default function BorrowerNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchNotifications = async (pageNum = 1) => {
    setLoading(true)
    try {
      const res = await apiInstance.get(`/notifications?page_size=20&page_number=${pageNum}`)
      if (pageNum === 1) {
        setNotifications(res.data.data || [])
      } else {
        setNotifications((prev) => [...prev, ...(res.data.data || [])])
      }
      setTotal(res.data.total || 0)
      setUnreadCount(res.data.unreadCount || 0)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications(1)
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await apiInstance.patch(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {}
  }

  const markAllAsRead = async () => {
    try {
      await apiInstance.patch("/notifications/read-all")
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success("All notifications marked as read")
    } catch {}
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifications(nextPage)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <ProtectedRoute requiredRole="borrower">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/borrower")}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="kicker-gold">Notifications</p>
              <h1 className="text-3xl font-display font-bold text-[#171414]">
                Activity Updates
              </h1>
              <p className="text-muted-foreground mt-1">
                Status updates for your pledge requests and loans
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead} className="rounded-xl gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Mark all read ({unreadCount})
              </Button>
            )}
          </div>

          {/* Unread count badge */}
          {unreadCount > 0 && (
            <div className="rounded-2xl border border-[#E1BAC2]/30 bg-[#E1BAC2]/5 p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]">
                <Bell className="h-5 w-5 text-[#171414]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#171414]">
                  {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-[#171414]/50">
                  New updates on your pledge requests and loans
                </p>
              </div>
            </div>
          )}

          {/* Notification List */}
          {loading && notifications.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <Card className={glass}>
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  You'll see updates here when pawnshops respond to your pledge requests
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => {
                const config = NOTIFICATION_CONFIG[notif.type] || { icon: Bell, color: "text-muted-foreground", bgColor: "bg-muted" }
                const Icon = config.icon

                return (
                  <Card
                    key={notif.id}
                    className={`${glass} cursor-pointer transition-all hover:shadow-md ${
                      !notif.read ? "border-l-4 border-l-[#E1BAC2]" : ""
                    }`}
                    onClick={() => {
                      if (!notif.read) markAsRead(notif.id)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold text-[#171414] ${!notif.read ? "" : "opacity-70"}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="h-2 w-2 rounded-full bg-[#E1BAC2] shrink-0" />
                            )}
                          </div>
                          <p className={`text-xs text-muted-foreground mt-0.5 ${!notif.read ? "" : "opacity-70"}`}>
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(notif.createdAt)}
                            </span>
                            {(notif.data as any)?.requestId && (
                              <Badge variant="outline" className="text-[9px] font-mono">
                                Request #{String((notif.data as any).requestId).slice(0, 8)}
                              </Badge>
                            )}
                            {(notif.data as any)?.paymentTxHash && (
                              <a
                                href={`https://eth-sepolia.blockscout.com/tx/${(notif.data as any).paymentTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-cyan-600 hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Tx <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Load More */}
              {notifications.length < total && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={loadMore} disabled={loading} className="rounded-xl">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
