import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import Link from "next/link"

export function DashboardHeader() {
  return (
    <div className="flex flex-col items-start justify-between space-y-2 md:flex-row md:items-center md:space-y-0">
      <div>
        <h2 className="font-display text-3xl font-medium tracking-tight">Dashboard</h2>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Welcome back, Ahmad · Financing overview
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="font-mono text-xs uppercase tracking-[0.1em]">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <Button asChild>
          <Link href="/apply">Apply for Financing</Link>
        </Button>
      </div>
    </div>
  )
}
