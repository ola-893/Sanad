"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "@/components/ui/chart"

const tokenData = [
  { name: "Jan", minted: 45, burned: 12, listed: 38 },
  { name: "Feb", minted: 52, burned: 18, listed: 45 },
  { name: "Mar", minted: 68, burned: 25, listed: 58 },
  { name: "Apr", minted: 85, burned: 32, listed: 72 },
  { name: "May", minted: 95, burned: 28, listed: 88 },
  { name: "Jun", minted: 110, burned: 45, listed: 95 },
  { name: "Jul", minted: 125, burned: 38, listed: 108 },
  { name: "Aug", minted: 142, burned: 52, listed: 125 },
]

const branchData = [
  { name: "KL Central", volume: 450000, count: 25 },
  { name: "Selangor", volume: 380000, count: 22 },
  { name: "Penang", volume: 320000, count: 18 },
  { name: "Johor", volume: 280000, count: 15 },
  { name: "Perak", volume: 220000, count: 12 },
  { name: "Others", volume: 350000, count: 28 },
]

export function AdminOverview() {
  return (
    <div className="space-y-6">
      {/* Token Activity Chart */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Token Mints/Burns Over Time</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={tokenData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="minted"
              stackId="1"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.6}
              name="Tokens Minted"
            />
            <Area
              type="monotone"
              dataKey="listed"
              stackId="1"
              stroke="var(--chart-2)"
              fill="var(--chart-2)"
              fillOpacity={0.6}
              name="SAGs Listed"
            />
            <Area
              type="monotone"
              dataKey="burned"
              stackId="1"
              stroke="var(--chart-5)"
              fill="var(--chart-5)"
              fillOpacity={0.6}
              name="Tokens Burned"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Branch Performance Chart */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Branch Listing Volume</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={branchData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value, name) => {
                const v = Number(value ?? 0)
                return [
                  name === "volume" ? `RM ${v.toLocaleString()}` : v,
                  name === "volume" ? "Total Volume" : "SAG Count",
                ]
              }}
            />
            <Bar dataKey="volume" fill="var(--chart-4)" name="Volume (RM)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
