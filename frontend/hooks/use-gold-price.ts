"use client"

import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"

export interface GoldPrice {
  id: string
  date: string
  pricePerGramUsd: string
  pricePerGramMyr: string
  exchangeRate: string
  createdAt: string
}

export interface GoldPriceResponse {
  success: boolean
  data: GoldPrice
}

export function useGoldPrice() {
  return useQuery({
    queryKey: ["gold-price-latest"],
    queryFn: async (): Promise<GoldPrice | null> => {
      try {
        const response = await apiInstance.get<GoldPriceResponse>("/gold-price/latest")
        if (response.data.success) {
          return response.data.data
        }
        return null
      } catch {
        return null
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })
}
