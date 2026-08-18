import { Bell, CheckCircle2, CircleDollarSign, FilePenLine, Lock, type LucideIcon } from "lucide-react"

const activityIcons: Record<string, LucideIcon> = {
  payment: CircleDollarSign,
  notification: Bell,
  loan: CheckCircle2,
  nft: Lock,
  application: FilePenLine,
}

export function RecentActivity() {
  const activities = [
    {
      id: 1,
      type: "payment",
      description: "Payment received",
      amount: "RM 1,250",
      date: "March 15, 2025",
    },
    {
      id: 2,
      type: "notification",
      description: "Payment reminder sent",
      date: "March 10, 2025",
    },
    {
      id: 3,
      type: "loan",
      description: "New loan approved",
      amount: "RM 5,000",
      date: "February 10, 2025",
    },
    {
      id: 4,
      type: "nft",
      description: "NFT collateral created",
      date: "February 10, 2025",
    },
    {
      id: 5,
      type: "application",
      description: "Loan application submitted",
      date: "February 8, 2025",
    },
  ]

  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.type] ?? Bell
        return (
          <div
            key={activity.id}
            className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-muted/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <Icon className="h-4 w-4 text-[#171414]" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium leading-none">{activity.description}</p>
              <p className="font-mono text-xs text-muted-foreground">{activity.date}</p>
            </div>
            {activity.amount && (
              <span className="font-mono text-sm font-medium tabular-nums text-[#171414]">
                {activity.amount}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
