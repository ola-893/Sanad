"use client"

import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"

export interface SagNFT {
  tokenId: string
  name: string
  status: string
  properties: Record<string, unknown> | null
}

export function useInvestorNfts() {
  return useQuery({
    queryKey: ['nfts'],
    queryFn: async () => {
      const response = await apiInstance.get('/investor/nfts')
      if (response.data.success) {
        return (response.data.data ?? []) as SagNFT[]
      }
      throw new Error('Failed to fetch NFTs')
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
