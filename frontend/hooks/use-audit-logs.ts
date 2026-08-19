"use client"

import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"

export const EVENT_TYPES = {
  COLLATERAL_MINTED: 'COLLATERAL_MINTED',
  LOAN_FUNDED: 'LOAN_FUNDED',
  REPAYMENT_VERIFIED: 'REPAYMENT_VERIFIED',
  SURPLUS_RETURNED: 'SURPLUS_RETURNED_TO_BORROWER',
} as const

export interface AuditLog {
  id: string
  eventType: string
  tokenId: string
  blockNumber: number | string | null
  transactionHash: string | null
  timestamp: string
  details: Record<string, unknown> | null
}

export function useAuditLogs(tokenId?: string) {
  return useQuery({
    queryKey: ['audit-logs', tokenId ?? 'all'],
    queryFn: async () => {
      const response = await apiInstance.get('/creditcoin/audit-logs', {
        params: tokenId ? { tokenId } : undefined,
      })
      if (response.data.success) {
        return (response.data.logs ?? []) as AuditLog[]
      }
      throw new Error('Failed to fetch audit logs')
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

export function amountOf(log: AuditLog): number | null {
  const d = log.details as Record<string, unknown> | null
  const raw = d?.amountUSD ?? d?.loanAmount ?? d?.amount
  const n = typeof raw === 'string' ? parseFloat(raw) : typeof raw === 'number' ? raw : NaN
  return Number.isFinite(n) ? n : null
}
