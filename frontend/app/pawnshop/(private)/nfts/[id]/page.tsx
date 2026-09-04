"use client"

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import apiInstance from '@/lib/axios-v1'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ArrowLeft, Calendar, DollarSign, TrendingUp, Info, ExternalLink,
  ChevronLeft, ChevronRight, Shield, Clock, Users, Gem, Weight, Award
} from 'lucide-react'
import Link from 'next/link'

interface SAGProperties {
  loan?: number
  karat: number
  tenorM: number
  weightG: number
  currency: string
  assetType: string
  mintShare: number
  valuation: number
  enableMinting: boolean
  loanPercentage?: number
  pawnerInterestP?: number
  investorFinancingType: string
  investorRoiPercentage: number
  investorRoiFixedAmount?: number
  investmentTargetUsd?: number
  minInvestmentUsd?: number
  investmentFilledUsd?: number
  loanDurationMonths?: number
  originationDate?: string
  maturityDate?: string
  imageUrl?: string[]
  purity?: number
}

interface SAG {
  sagId: string
  tokenId: string
  sagName: string
  sagDescription: string
  sagProperties: SAGProperties
  sagType: string
  certNo: string
  status?: 'active' | 'closed'
}

interface TokenInfo {
  tokenId: string
  remainingSupply: string
  totalSupply: string
  treasuryAccountId: string
  createdAt: string
  expiredAt: string
}

interface Investor {
  id: string
  userId: string
  amountUsd: string
  ethAmount: string | null
  sourceTxHash: string | null
  cc3TxHash: string | null
  status: string
  createdAt: string
  investorFirstName: string | null
  investorLastName: string | null
  user_email: string | null
  investorWallet: string | null
}

function formatDuration(months: number): string {
  if (months <= 0) return "1 day"
  if (months < 1) return "1 day"
  if (months === 1) return "1 month"
  if (months === 12) return "1 year"
  return `${months} months`
}

function getImageUrl(url: string): string {
  if (!url) return ''
  const match = url.match(/\/uploads\/(.*)/)
  if (match) return `/api/uploads/${match[1]}`
  const filename = url.split('/').pop()
  if (filename && !url.startsWith('http')) return `/api/uploads/${filename}`
  if (filename) return `/api/uploads/${filename}`
  return url
}

export default function PawnshopNFTDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sagId = params.id as string

  const [ethPrice, setEthPrice] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)

  useEffect(() => {
    const fetchEthPrice = () => {
      apiInstance.get("/eth-price")
        .then((res) => { const p = res.data?.data?.usd; if (p && p > 0) setEthPrice(p) })
        .catch(() => {})
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Fetch all SAGs and find the one matching the ID
  const { data, isLoading, error } = useQuery({
    queryKey: ['sags'],
    queryFn: async () => {
      const response = await apiInstance.get(`/sag?page_size=50&page_number=1`)
      return response.data
    },
  })

  const sag: SAG | undefined = data?.data?.find((s: SAG) => s.sagId === sagId || s.tokenId === sagId)

  const { data: tokenInfo, isLoading: tokenLoading } = useQuery({
    queryKey: ['token-info', sag?.tokenId],
    queryFn: async () => {
      const response = await apiInstance.get(`/token/${sag!.tokenId}`)
      return response.data
    },
    enabled: !!sag?.tokenId,
  })

  const { data: investorsData, isLoading: investorsLoading } = useQuery({
    queryKey: ['sag-investors', sag?.tokenId],
    queryFn: async () => {
      const response = await apiInstance.get(`/investor/sag/${sag!.tokenId}/investments`)
      return response.data
    },
    enabled: !!sag?.tokenId,
  })

  const investors: Investor[] = investorsData?.data || []
  const props = sag?.sagProperties
  const images = props?.imageUrl || []
  const hasImage = images.length > 0

  const soldShares = tokenInfo?.data ? parseInt(tokenInfo.data.totalSupply) - parseInt(tokenInfo.data.remainingSupply) : 0
  const totalSupply = tokenInfo?.data ? parseInt(tokenInfo.data.totalSupply) : 0
  const sharePrice = props ? props.valuation / props.mintShare : 0

  // Timeline — always compute REAL duration from originationDate + loanDurationMonths
  const originationDate = props?.originationDate ? new Date(props.originationDate) : null
  const durationMonths = props?.loanDurationMonths || (props ? Math.round(props.tenorM / 30) : 0)
  const realMaturityDate = originationDate ? new Date(originationDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000) : null
  const now = new Date()
  const totalDays = durationMonths * 30
  const elapsedDays = originationDate ? Math.max(0, Math.min(totalDays, (now.getTime() - originationDate.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const remainingDays = Math.max(0, totalDays - elapsedDays)
  const elapsedPercent = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0

  const roi = props?.investorRoiPercentage || 2
  const remainingMonths = Math.max(0, remainingDays / 30)
  const proratedReturn = roi * remainingMonths
  const totalReturnIfFull = roi * durationMonths

  // Investment data
  const investmentTarget = props?.investmentTargetUsd || 0
  const investmentFilled = props?.investmentFilledUsd || 0
  const investmentPercent = investmentTarget > 0 ? (investmentFilled / investmentTarget) * 100 : 0
  const totalInvestmentUsd = investors.reduce((sum, inv) => sum + Number(inv.amountUsd || 0), 0)
  const totalInterestEarned = totalInvestmentUsd * (roi / 100) * Math.max(0, (realMaturityDate ? Math.min(elapsedDays / 30, durationMonths) : 0))

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !sag) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Link href="/pawnshop/nfts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to NFTs
        </Link>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">NFT not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io'

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/pawnshop/nfts"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> My NFTs
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold text-foreground">{sag.sagName}</h1>
          <Badge className={sag.status === 'closed'
            ? "bg-destructive/10 text-destructive border-destructive/30"
            : "bg-accent/20 text-accent-foreground border-accent/30"
          }>
            {sag.status === 'closed' ? 'Closed' : 'Active'}
          </Badge>
        </div>
        {sag.status !== 'closed' && (
          <div className="flex gap-2">
            <Link href="/pawnshop/nfts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> All NFTs
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Image + Properties + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gold Image Gallery */}
          {hasImage ? (
            <Card className="overflow-hidden border-border/50 bg-card">
              <div className="relative aspect-[16/9] bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
                <img
                  src={getImageUrl(images[imageIndex])}
                  alt={sag.sagName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImageIndex(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setImageIndex(i => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImageIndex(i)}
                          className={`w-2 h-2 rounded-full transition-colors ${i === imageIndex ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card">
              <div className="aspect-[16/9] bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 flex items-center justify-center">
                <Gem className="h-24 w-24 text-amber-300/50" />
              </div>
            </Card>
          )}

          {/* Properties Grid */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gem className="h-4 w-4 text-accent" />
                Asset Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Weight className="h-5 w-5 mx-auto mb-1.5 text-accent" />
                  <p className="text-2xl font-bold">{props?.weightG}g</p>
                  <p className="text-xs text-muted-foreground">Weight</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Award className="h-5 w-5 mx-auto mb-1.5 text-accent" />
                  <p className="text-2xl font-bold">{props?.karat}K</p>
                  <p className="text-xs text-muted-foreground">Karat</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Shield className="h-5 w-5 mx-auto mb-1.5 text-accent" />
                  <p className="text-2xl font-bold">{props?.purity || 91.6}%</p>
                  <p className="text-xs text-muted-foreground">Purity</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <DollarSign className="h-5 w-5 mx-auto mb-1.5 text-accent" />
                  <p className="text-2xl font-bold">${props?.valuation?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Valuation</p>
                  {ethPrice > 0 && props?.valuation && (
                    <p className="text-[10px] text-muted-foreground/70">~{(props.valuation / ethPrice).toFixed(4)} ETH</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan & Investment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Loan Amount</span>
                  <span className="font-medium">${props?.loan?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Loan-to-Value</span>
                  <span className="font-medium">{props?.loanPercentage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pawner Interest</span>
                  <span className="font-medium">{props?.pawnerInterestP}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Financing Type</span>
                  <span className="font-medium capitalize">{props?.investorFinancingType}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  Investment Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly ROI</span>
                  <span className="font-medium text-success">{roi}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{formatDuration(durationMonths)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Full Return</span>
                  <span className="font-medium text-success">{totalReturnIfFull.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shares</span>
                  <span className="font-medium">{props?.mintShare}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Share Price</span>
                  <span className="font-medium">${sharePrice.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Loan Timeline */}
          {originationDate && realMaturityDate && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  Loan Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Minted: {originationDate.toLocaleDateString()}</span>
                  <span>Expires: {realMaturityDate.toLocaleDateString()}</span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all"
                    style={{ width: `${elapsedPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {elapsedDays.toFixed(0)} days elapsed
                  </span>
                  <span className="text-xs font-medium text-accent">
                    {remainingDays > 0 ? `${remainingDays.toFixed(0)} days remaining` : 'Matured'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blockchain Info */}
          {sag.tokenId && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 text-accent" />
                  Blockchain Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Token ID</span>
                  <a
                    href={`${process.env.NEXT_PUBLIC_ENV_URL}/${sag.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent hover:underline flex items-center gap-1"
                  >
                    {sag.tokenId} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {tokenLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : tokenInfo?.data ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Supply</span>
                      <span className="font-medium">{tokenInfo.data.totalSupply}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sold</span>
                      <span className="font-medium text-destructive">{soldShares}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-medium text-success">{tokenInfo.data.remainingSupply}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Treasury</span>
                      <span className="font-medium text-xs font-mono">{tokenInfo.data.treasuryAccountId}</span>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — Investment Progress + Performance + Investors */}
        <div className="space-y-6">
          {/* Investment Progress */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                Funding Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold">${investmentFilled.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">of ${investmentTarget.toLocaleString()} target</p>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-success to-success/70 transition-all"
                  style={{ width: `${investmentPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{investmentPercent.toFixed(0)}% funded</span>
                <span>${(investmentTarget - investmentFilled).toLocaleString()} remaining</span>
              </div>
              {investmentFilled >= investmentTarget && investmentTarget > 0 && (
                <div className="text-center py-2 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm font-medium text-success">Fully Funded</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expected Returns */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Expected Returns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly ROI</span>
                <span className="font-medium text-success">{roi}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Full Period ({durationMonths}mo)</span>
                <span className="font-medium text-success">{totalReturnIfFull.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return Now ({remainingMonths.toFixed(1)}mo left)</span>
                <span className="font-bold text-success">{proratedReturn.toFixed(1)}%</span>
              </div>
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-xs text-muted-foreground mb-2">Per $1 invested today:</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Return</span>
                  <span className="font-medium text-success">${(proratedReturn / 100).toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total payout</span>
                  <span className="font-bold">${(1 + proratedReturn / 100).toFixed(4)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment Performance */}
          {totalInvestmentUsd > 0 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-lg font-bold text-accent">${totalInvestmentUsd.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Total Invested</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-lg font-bold text-success">${totalInterestEarned.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Interest Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Investors Table — Full Width */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            Investors ({investors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {investorsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : investors.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No investors yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Investments will appear here once investors fund this SAG</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-medium">Investor</TableHead>
                    <TableHead className="text-xs font-medium">Amount</TableHead>
                    <TableHead className="text-xs font-medium">ETH</TableHead>
                    <TableHead className="text-xs font-medium">Date</TableHead>
                    <TableHead className="text-xs font-medium">Status</TableHead>
                    <TableHead className="text-xs font-medium">Source Tx</TableHead>
                    <TableHead className="text-xs font-medium">CC3 Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investors.map((inv) => {
                    const name = [inv.investorFirstName, inv.investorLastName].filter(Boolean).join(' ')
                    const displayId = inv.investorWallet || inv.userId
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{name || 'Anonymous'}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {displayId ? `${displayId.slice(0, 8)}...${displayId.slice(-4)}` : '—'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold">${Number(inv.amountUsd || 0).toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {inv.ethAmount ? `~${Number(inv.ethAmount).toFixed(6)}` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${inv.status === 'completed'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                          }`}>
                            {inv.status || 'completed'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inv.sourceTxHash ? (
                            <a
                              href={`${SEPOLIA_EXPLORER}/tx/${inv.sourceTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:underline font-mono flex items-center gap-1"
                            >
                              {inv.sourceTxHash.slice(0, 8)}... <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {inv.cc3TxHash ? (
                            <a
                              href={`https://creditcoin-testnet.blockscout.com/tx/${inv.cc3TxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:underline font-mono flex items-center gap-1"
                            >
                              {inv.cc3TxHash.slice(0, 8)}... <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
