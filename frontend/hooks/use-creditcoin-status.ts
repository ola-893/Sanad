"use client"

import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"

export interface CreditcoinNetworkStatus {
  chainId: number
  blockNumber: number
  gasPrice: string
  isHealthy: boolean
  supportedChains: Array<{
    chainKey: number
    chainId: number
    chainName: string
  }>
}

export interface CreditcoinStatusResponse {
  success: boolean
  network: CreditcoinNetworkStatus
  config: {
    chainName: string
    rpcUrl: string
    chainId: number
    proverUrl: string
    contracts: {
      sagTokenAddress: string
      liquidityPoolAddress: string
      sepoliaGatewayAddress: string
    }
  }
}

export function useCreditcoinStatus() {
  return useQuery({
    queryKey: ["creditcoin-status"],
    queryFn: async (): Promise<CreditcoinStatusResponse | null> => {
      try {
        const response = await apiInstance.get<CreditcoinStatusResponse>("/creditcoin/status")
        if (response.data.success) {
          return response.data
        }
        return null
      } catch {
        return null
      }
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
  })
}
