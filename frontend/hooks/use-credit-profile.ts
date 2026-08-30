'use client'

import { useQuery } from '@tanstack/react-query'
import apiInstance from '@/lib/axios-v1'

export interface CreditProfile {
  borrower: string
  score: number
  tier: string
  totalRepaidUSD: string
  totalLiquidatedUSD: string
  totalDefaultedUSD: string
  cleanRepaymentCount: number
  liquidationCount: number
  defaultCount: number
  provenEventsCount: number
  lastEvaluatedTimestamp: number
  provenEvents: any[]
}

export function useCreditProfile(walletAddress: string | null | undefined) {
  return useQuery({
    queryKey: ['creditProfile', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address')
      const res = await apiInstance.get(`/credit-oracle/profile/${walletAddress}`)
      if (res.data.success) {
        return res.data.data as CreditProfile
      }
      throw new Error('Failed to fetch credit profile')
    },
    enabled: !!walletAddress,
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds
  })
}
