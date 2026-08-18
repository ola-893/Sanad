import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"

interface PaymentScheduleProps {
  showAll?: boolean
}

export function PaymentSchedule({ showAll = false }: PaymentScheduleProps) {
  const payments = [
    {
      id: "P-2025-001",
      loanId: "L-2025-001",
      dueDate: "April 15, 2025",
      amount: 1250,
      status: "upcoming",
    },
    {
      id: "P-2025-002",
      loanId: "L-2025-002",
      dueDate: "April 10, 2025",
      amount: 833,
      status: "upcoming",
    },
    {
      id: "P-2025-003",
      loanId: "L-2025-001",
      dueDate: "March 15, 2025",
      amount: 1250,
      status: "paid",
    },
    {
      id: "P-2025-004",
      loanId: "L-2025-002",
      dueDate: "March 10, 2025",
      amount: 833,
      status: "paid",
    },
    {
      id: "P-2025-005",
      loanId: "L-2025-001",
      dueDate: "February 15, 2025",
      amount: 1250,
      status: "paid",
    },
    {
      id: "P-2025-006",
      loanId: "L-2025-002",
      dueDate: "February 10, 2025",
      amount: 833,
      status: "paid",
    },
  ]

  const displayPayments = showAll ? payments : payments.slice(0, 4)

  return (
    <div className="divide-y divide-border">
      {displayPayments.map((payment) => (
        <div key={payment.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div className="min-w-0 space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              {payment.id}
            </p>
            <p className="text-sm font-medium text-[#171414]">Loan {payment.loanId}</p>
            <p className="text-xs text-muted-foreground">Due {payment.dueDate}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="font-mono text-sm font-bold tabular-nums text-[#171414]">
              RM {payment.amount.toLocaleString()}
            </span>
            <Badge
              variant="outline"
              className={
                payment.status === "paid"
                  ? "border-success/20 bg-success/10 text-success"
                  : payment.status === "upcoming"
                    ? "border-warning/30 bg-warning/10 text-warning-foreground"
                    : "border-destructive/20 bg-destructive/10 text-destructive"
              }
            >
              {payment.status === "paid" ? "Paid" : payment.status === "upcoming" ? "Upcoming" : "Overdue"}
            </Badge>
            {payment.status === "upcoming" && (
              <Button size="sm" variant="outline" className="rounded-full">
                <CreditCard className="mr-2 h-3 w-3" />
                Pay Now
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
