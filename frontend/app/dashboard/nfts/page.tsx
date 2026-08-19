'use client';

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Gem, Loader2, ExternalLink, Shield, Scale, Hash } from "lucide-react"
import { useInvestorNfts, type SagNFT } from "@/hooks/use-investor-nfts"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

function propertyOf(nft: SagNFT, key: string): string | null {
  const props = nft.properties as Record<string, unknown> | null
  const value = props?.[key]
  return value === undefined || value === null ? null : String(value)
}

const explorerBase = "https://creditcoin-testnet.blockscout.com"

export default function DashboardNftsPage() {
  const { data: nfts = [], isLoading, isError } = useInvestorNfts()

  const activeCount = nfts.filter((n) => (n.status ?? "ACTIVE").toUpperCase() === "ACTIVE").length

  return (
    <ProtectedRoute requiredRole="investor">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="kicker-gold">Collateral</p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
                NFT Collateral
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Digital representation of your jewelry collateral on Creditcoin
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className={glass}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      Total NFTs
                    </p>
                    <p className="mt-1 font-display text-2xl font-extrabold text-[#171414]">
                      {isLoading ? "—" : nfts.length}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/25">
                    <Gem className="h-5 w-5 text-[#171414]" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={glass}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      Active Collateral
                    </p>
                    <p className="mt-1 font-display text-2xl font-extrabold text-[#171414]">
                      {isLoading ? "—" : activeCount}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-success/10">
                    <Shield className="h-5 w-5 text-success" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={glass}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      Network
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-[#171414]">
                      Creditcoin 3
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    CC3
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NFT List */}
          {isLoading ? (
            <Card className={glass}>
              <CardContent className="p-10">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#171414]" />
                  <span className="ml-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    Loading collateral...
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : isError ? (
            <Card className={glass}>
              <CardContent className="p-10 text-center">
                <Gem className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-[#171414]">Collateral data unavailable</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Please try again later or contact support.
                </p>
              </CardContent>
            </Card>
          ) : nfts.length === 0 ? (
            <Card className={glass}>
              <CardContent className="p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/50">
                  <Gem className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-[#171414]">No collateral NFTs yet</p>
                <p className="mt-1 max-w-sm mx-auto text-xs text-muted-foreground">
                  Gold collateral appears here once it is minted on-chain against your account.
                  Start by applying for financing.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {nfts.map((nft) => {
                const karat = propertyOf(nft, "karat")
                const weight = propertyOf(nft, "weightGrams") ?? propertyOf(nft, "weight")
                const valuation = propertyOf(nft, "valuation") ?? propertyOf(nft, "appraisedValueUSD")
                const loanAmount = propertyOf(nft, "loan") ?? propertyOf(nft, "loanAmount")
                const status = (nft.status ?? "ACTIVE").toUpperCase()
                const isActive = status === "ACTIVE"

                return (
                  <Card key={nft.tokenId} className={`${glass} overflow-hidden transition-all hover:bg-white/80`}>
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className="flex items-center gap-4 p-5 pb-4">
                        <div className="gradient-gold flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
                          <Gem className="h-6 w-6 text-[#171414]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display text-base font-bold text-[#171414]">
                              {nft.name || `SAG #${nft.tokenId}`}
                            </h3>
                            <Badge
                              variant="outline"
                              className={
                                isActive
                                  ? "border-success/30 bg-success/10 text-success text-[10px]"
                                  : "border-muted bg-muted/50 text-muted-foreground text-[10px]"
                              }
                            >
                              {status}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {nft.tokenId}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`${explorerBase}/token/erc721/${nft.tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="rounded-full shrink-0">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Explorer
                          </Button>
                        </a>
                      </div>

                      {/* Card Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#171414]/5 border-t border-[#171414]/10">
                        <div className="bg-white/50 p-4 text-center">
                          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                            Karat
                          </p>
                          <p className="mt-1 text-sm font-bold text-[#171414]">{karat ?? "—"}</p>
                        </div>
                        <div className="bg-white/50 p-4 text-center">
                          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                            Weight
                          </p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-[#171414]">
                            {weight ? `${weight} g` : "—"}
                          </p>
                        </div>
                        <div className="bg-white/50 p-4 text-center">
                          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                            Valuation
                          </p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-[#171414]">
                            {valuation ? `$${Number(valuation).toLocaleString()}` : "—"}
                          </p>
                        </div>
                        <div className="bg-white/50 p-4 text-center">
                          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                            Loan
                          </p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-primary">
                            {loanAmount ? `$${Number(loanAmount).toLocaleString()}` : "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
