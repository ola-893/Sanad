"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink, Gem, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import apiInstance from "@/lib/axios-v1"

interface NFT {
  account_id: string
  created_timestamp: string
  delegating_spender: string | null
  deleted: boolean
  metadata: string
  modified_timestamp: string
  serial_number: number
  spender: string | null
  token_id: string
}

interface NFTCollateralProps {
  showAll?: boolean
}

export function NFTCollateral({ showAll = false }: NFTCollateralProps) {
  const {
    data: nfts = [],
    isLoading: loading,
    error,
    isError
  } = useQuery({
    queryKey: ['nfts'],
    queryFn: async () => {
      const response = await apiInstance.get('/investor/nfts')
      if (response.data.success) {
        return response.data.data.nfts
      } else {
        throw new Error('Failed to fetch NFTs')
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  })

  const displayNFTs = showAll ? nfts : nfts.slice(0, 2)

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#171414]/10 bg-white/50 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#171414]" />
        <span className="ml-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Loading NFTs...
        </span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">{error?.message || 'Failed to fetch NFTs'}</p>
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-8 text-center">
        <Gem className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No NFTs found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {displayNFTs.map((nft: NFT) => (
        <Card
          key={`${nft.token_id}-${nft.serial_number}`}
          className="overflow-hidden rounded-2xl border border-[#171414]/10 bg-white/50 transition-all hover:bg-white/80"
        >
          <CardContent className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="gradient-gold flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                  <Gem className="h-5 w-5 text-[#171414]" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-bold text-[#171414]">
                      NFT #{nft.serial_number}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        nft.deleted
                          ? "border-destructive/20 bg-destructive/10 text-destructive"
                          : "border-transparent bg-accent/30 text-[#171414]"
                      }
                    >
                      {nft.deleted ? "Deleted" : "Active"}
                    </Badge>
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    Token ID: {nft.token_id}
                  </p>
                </div>
              </div>
              <Button size="sm" asChild className="shrink-0 rounded-full">
                <a href={`${process.env.NEXT_PUBLIC_ENV_URL}/${nft.token_id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  View NFT
                </a>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#171414]/10 bg-white/50 p-4 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Account ID
                </p>
                <p className="truncate text-sm font-medium text-[#171414]">{nft.account_id}</p>
              </div>
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Created
                </p>
                <p className="text-sm font-medium tabular-nums text-[#171414]">
                  {new Date(parseInt(nft.created_timestamp) * 1000).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Modified
                </p>
                <p className="text-sm font-medium tabular-nums text-[#171414]">
                  {new Date(parseInt(nft.modified_timestamp) * 1000).toLocaleDateString()}
                </p>
              </div>
              {nft.metadata && (
                <div className="min-w-0 sm:col-span-2">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Metadata
                  </p>
                  <p className="truncate text-sm font-medium text-[#171414]">
                    {nft.metadata.substring(0, 50)}...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
