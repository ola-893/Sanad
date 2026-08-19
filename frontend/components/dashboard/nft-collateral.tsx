"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Gem, Loader2 } from "lucide-react"
import { useInvestorNfts, type SagNFT } from "@/hooks/use-investor-nfts"

interface NFTCollateralProps {
  showAll?: boolean
}

function propertyOf(nft: SagNFT, key: string): string | null {
  const props = nft.properties as Record<string, unknown> | null
  const value = props?.[key]
  return value === undefined || value === null ? null : String(value)
}

export function NFTCollateral({ showAll = false }: NFTCollateralProps) {
  const { data: nfts = [], isLoading, isError, error } = useInvestorNfts()

  const displayNFTs = showAll ? nfts : nfts.slice(0, 2)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#171414]/10 bg-white/50 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#171414]" />
        <span className="ml-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Loading collateral...
        </span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-8 text-center">
        <Gem className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Collateral data is unavailable right now. Please try again later.
        </p>
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="rounded-2xl border border-[#171414]/10 bg-white/50 p-8 text-center">
        <Gem className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm font-medium text-[#171414]">No collateral NFTs yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Gold collateral appears here once it is minted on-chain against your account.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {displayNFTs.map((nft) => {
        const karat = propertyOf(nft, "karat")
        const weight = propertyOf(nft, "weightGrams") ?? propertyOf(nft, "weight")
        const status = (nft.status ?? "ACTIVE").toUpperCase()
        return (
          <Card
            key={nft.tokenId}
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
                        {nft.name || `SAG #${nft.tokenId}`}
                      </h3>
                      <Badge
                        variant="outline"
                        className="border-transparent bg-accent/30 text-[#171414]"
                      >
                        {status}
                      </Badge>
                    </div>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      Token ID: {nft.tokenId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#171414]/10 bg-white/50 p-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Karat
                  </p>
                  <p className="text-sm font-medium text-[#171414]">{karat ?? "—"}</p>
                </div>
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Weight
                  </p>
                  <p className="text-sm font-medium tabular-nums text-[#171414]">
                    {weight ? `${weight} g` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
