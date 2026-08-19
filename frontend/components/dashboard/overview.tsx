"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "@/components/ui/chart"
import { useInvestorNfts } from "@/hooks/use-investor-nfts"
import { EVENT_TYPES, amountOf, useAuditLogs } from "@/hooks/use-audit-logs"

const formatUSD = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

export function Overview() {
  const { data: nfts = [] } = useInvestorNfts()
  const { data: logs = [] } = useAuditLogs()

  const data = useMemo(() => {
    const ownTokens = new Set(nfts.map((n) => String(n.tokenId)))
    const now = new Date()
    const months = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1)
      return {
        name: d.toLocaleDateString("en-US", { month: "short" }),
        Financing: 0,
        Repayments: 0,
      }
    })

    for (const log of logs) {
      if (!ownTokens.has(String(log.tokenId))) continue
      const t = new Date(log.timestamp)
      if (Number.isNaN(t.getTime())) continue
      const diff = (now.getFullYear() - t.getFullYear()) * 12 + (now.getMonth() - t.getMonth())
      if (diff < 0 || diff > 7) continue
      const amount = amountOf(log) ?? 0
      if (log.eventType === EVENT_TYPES.LOAN_FUNDED) {
        months[7 - diff].Financing += amount
      } else if (log.eventType === EVENT_TYPES.REPAYMENT_VERIFIED) {
        months[7 - diff].Repayments += amount
      }
    }
    return months
  }, [nfts, logs])

  const hasEvents = data.some((m) => m.Financing > 0 || m.Repayments > 0)

  if (!hasEvents) {
    return (
      <div className="flex h-[350px] w-full flex-col items-center justify-center rounded-2xl border border-[#171414]/10 bg-white/50 text-center">
        <p className="text-sm font-medium text-[#171414]">No cash flow recorded yet</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Financing and repayment events appear here once they are verified on-chain for your account.
        </p>
      </div>
    )
  }

  return (
    <ChartContainer className="h-[350px] w-full aspect-auto">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="font-mono"
          />
          <YAxis
            width={80}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value: number, name: string) => (
                  <div className="flex w-full items-center gap-2">
                    <span>{name}</span>
                    <span className="ml-auto font-mono font-medium tabular-nums">{formatUSD(value)}</span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent className="font-mono text-xs pt-2" />} />
          <Bar
            dataKey="Financing"
            name="Financing"
            fill="hsl(var(--chart-1))"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="Repayments"
            name="Repayments"
            fill="hsl(var(--chart-3))"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
