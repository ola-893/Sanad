"use client"

import { useQuery } from "@tanstack/react-query"

const FALLBACK_CTC_USD = 0.065 // ~$0.065 per CTC (fallback if API fails)

interface CtcPriceData {
  ctcUsd: number
  source: "coingecko" | "fallback"
  lastUpdated: string
}

async function fetchCtcPrice(): Promise<CtcPriceData> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=creditcoin-2&vs_currencies=usd&include_last_updated_at=true"
    )

    if (!response.ok) throw new Error("CoinGecko API error")

    const data = await response.json()
    const price = data?.["creditcoin-2"]?.usd

    if (price && typeof price === "number" && price > 0) {
      return {
        ctcUsd: price,
        source: "coingecko",
        lastUpdated: data["creditcoin-2"].last_updated_at
          ? new Date(data["creditcoin-2"].last_updated_at * 1000).toISOString()
          : new Date().toISOString(),
      }
    }
  } catch {
    // API failed, use fallback
  }

  return {
    ctcUsd: FALLBACK_CTC_USD,
    source: "fallback",
    lastUpdated: new Date().toISOString(),
  }
}

export function useCtcPrice() {
  return useQuery({
    queryKey: ["ctc-price"],
    queryFn: fetchCtcPrice,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

/** Convert CTC amount to USD */
export function ctcToUsd(ctc: number, rate: number): number {
  return ctc * rate
}

/** Format USD amount for display */
export function formatUsd(amount: number): string {
  if (amount < 0.01) return "<$0.01"
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
