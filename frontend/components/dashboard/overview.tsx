"use client"

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

const data = [
  {
    name: "Jan",
    Financing: 0,
    Repayments: 0,
  },
  {
    name: "Feb",
    Financing: 12500,
    Repayments: 0,
  },
  {
    name: "Mar",
    Financing: 0,
    Repayments: 2083,
  },
  {
    name: "Apr",
    Financing: 0,
    Repayments: 2083,
  },
  {
    name: "May",
    Financing: 0,
    Repayments: 2083,
  },
  {
    name: "Jun",
    Financing: 0,
    Repayments: 2083,
  },
  {
    name: "Jul",
    Financing: 0,
    Repayments: 2083,
  },
  {
    name: "Aug",
    Financing: 0,
    Repayments: 2083,
  },
]

const formatRM = (value: number) =>
  `RM ${value.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`

export function Overview() {
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
            tickFormatter={(v: number) => (v >= 1000 ? `RM ${v / 1000}k` : `RM ${v}`)}
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value: number, name: string) => (
                  <div className="flex w-full items-center gap-2">
                    <span>{name}</span>
                    <span className="ml-auto font-mono font-medium tabular-nums">{formatRM(value)}</span>
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
