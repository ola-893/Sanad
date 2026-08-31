"use client"

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import apiInstance from '@/lib/axios-v1'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, ExternalLinkIcon, Plus, ArrowLeftRight, Loader2, Eye, Calendar, DollarSign, TrendingUp, Info, Search, Grid, List, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { toast } from "sonner"
import type { AxiosError } from 'axios'
import { useSocketRepayment } from '@/hooks/use-socket-repayment'
import { RepaymentProgressTracker } from '@/components/repayment-progress-tracker'
import { UserProfile } from '@/lib/auth/auth-service'

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

interface SAGResponse {
  success: boolean
  message: string
  data: SAG[]
  pagination: {
    count: number
    totalCount: number
    currentPage: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

interface TokenInfo {
  tokenId: string
  remainingSupply: string
  totalSupply: string
  treasuryAccountId: string
  createdAt: string
  expiredAt: string
}

interface TokenResponse {
  success: boolean
  data: TokenInfo
}

// Buy Back Dialog Component
function BuyBackDialog({ sag }: { sag: SAG }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isBuyingBack, setIsBuyingBack] = useState(false)
  const [showProgressTracker, setShowProgressTracker] = useState(false)
  const queryClient = useQueryClient()

  // Fetch user profile from API
  const { data: userProfile, isLoading: userProfileLoading, error: userProfileError } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async (): Promise<UserProfile> => {
      const response = await apiInstance.get('/auth/user/profile')
      return response.data.data.userInfo
      // return response.data.data
    },
  })

  // Socket.IO integration for repayment tracking
  const {
    isConnected,
    connect,
    lastProgress,
    lastComplete,
    lastError,
  } = useSocketRepayment({
    userId: userProfile?.accountId || '', // You should replace this with actual user ID
    onProgress: (data) => {
      console.log('Repayment progress:', data)
    },
    onComplete: (data) => {
      console.log('Repayment complete:', data)
      setIsBuyingBack(false)
      setShowProgressTracker(false)
      setIsOpen(false)
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['sags'] })
      queryClient.invalidateQueries({ queryKey: ['token-info', sag.tokenId] })
      
      toast.success('Token successfully bought back!')
    },
    onError: (data) => {
      console.log('Repayment error:', data)
      setIsBuyingBack(false)
      toast.error(`Failed to buy back token: ${data.error}`)
    },
    autoConnect: false, // We'll connect manually when needed
  })

  const { data: tokenInfo, isLoading: tokenLoading, error: tokenError } = useQuery({
    queryKey: ['token-info', sag.tokenId],
    queryFn: async (): Promise<TokenResponse> => {
      const response = await apiInstance.get(`/token/${sag.tokenId}`)
      return response.data
    },
    enabled: isOpen && !!sag.tokenId, // Only fetch when dialog is open and tokenId exists
  })

  const handleBuyBack = async () => {
    setIsBuyingBack(true);
    
    try {
      // Connect to Socket.IO for real-time tracking
      await connect();
      
      const repaymentData = {
        tokenId: sag.tokenId,
        pawnshopAccountId: tokenInfo?.data.treasuryAccountId || "0.0.6861395", // Use treasury account or fallback
        sagId: sag.sagId
      }

      setIsOpen(false);
      // Show progress tracker
      setShowProgressTracker(true);

      const response = await apiInstance.post('/pawnshop/repayment', repaymentData);
      
      // The Socket.IO events will handle the success/error states
      // and update the UI accordingly
      
    } catch (error) {
      console.error('Failed to initiate buyback:', error);
      setIsBuyingBack(false);
      setShowProgressTracker(false);
      toast.error('Failed to initiate buyback: ' + (error as Error).message);
    }
  }

  const soldShares = tokenInfo?.data ? parseInt(tokenInfo.data.totalSupply) - parseInt(tokenInfo.data.remainingSupply) : 0
  // const totalShares = tokenInfo?.data ? parseInt(tokenInfo.data.totalSupply) : sag.sagProperties.mintShare
  const sharePrice = sag.sagProperties.valuation / sag.sagProperties.mintShare
  const totalRepaymentAmount = soldShares * sharePrice
  const monthlyReturn = (sharePrice * sag.sagProperties.investorRoiPercentage) / 100

  // Calculate months passed since token creation
  const monthsPassed = tokenInfo?.data ? (() => {
    // Convert the timestamp (seconds with nanoseconds) to milliseconds
    const createdAtMs = parseFloat(tokenInfo.data.createdAt) * 1000
    const now = new Date().getTime()
    const diffMs = now - createdAtMs

    // Convert milliseconds to months (approximate: 30.44 days per month)
    const monthsElapsed = diffMs / (1000 * 60 * 60 * 24 * 30.44)

    return Math.ceil(monthsElapsed)
  })() : 0

  const totalInterest = soldShares * monthlyReturn * monthsPassed
  const totalBuyBackCost = totalRepaymentAmount + totalInterest

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="flex-1">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Buy Back
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buy Back {sag.sagName}</DialogTitle>
            <DialogDescription>
              Repay investors and reclaim your NFT
            </DialogDescription>
          </DialogHeader>

        <div className="space-y-4">
          {/* Token Supply Information */}
          {tokenLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : tokenError ? (
            <div className="text-sm text-destructive dark:text-red-400">
              Failed to load token information
            </div>
          ) : tokenInfo ? (
            <div className="bg-muted dark:bg-card p-3 rounded-lg space-y-2 border dark:border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground dark:text-muted-foreground">Total Shares:</span>
                <span className="font-medium text-foreground dark:text-gray-100">{tokenInfo.data.totalSupply}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground dark:text-muted-foreground">Sold to Investors:</span>
                <span className="font-medium text-destructive dark:text-red-400">
                  {Number(tokenInfo.data.totalSupply) - Number(tokenInfo.data.remainingSupply)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground dark:text-muted-foreground">Remaining:</span>
                <span className="font-medium text-success dark:text-success">{tokenInfo.data.remainingSupply}</span>
              </div>
            </div>
          ) : null}

          {/* Buy Back Calculation */}
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg space-y-2 border dark:border-orange-700">
            <h4 className="font-medium text-sm text-foreground dark:text-gray-100">Buy Back Calculation</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-muted-foreground">Share Price:</span>
                <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.currency} {sharePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-muted-foreground">Shares Sold:</span>
                <span className="font-medium text-foreground dark:text-gray-100">{soldShares}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-muted-foreground">Principal Amount:</span>
                <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.currency} {totalRepaymentAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-muted-foreground">Interest ({sag.sagProperties.investorRoiPercentage}% × {monthsPassed} months):</span>
                <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.currency} {totalInterest.toFixed(2)}</span>
              </div>
              <div className="border-t dark:border-gray-600 pt-1 mt-2">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground dark:text-gray-100">Total Buy Back Cost:</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{sag.sagProperties.currency} {totalBuyBackCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {soldShares === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">No shares have been sold to investors.</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Your NFT is already fully owned by you.</p>
            </div>
          ) : (
            <div className="bg-muted dark:bg-blue-900/20 p-3 rounded-lg border dark:border-blue-700">
              <p className="text-sm text-primary dark:text-blue-300">
                <strong>Note:</strong> By buying back, you will repay all investors and regain full ownership of your NFT.
                This action cannot be undone.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleBuyBack}
              disabled={isBuyingBack || soldShares === 0}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {isBuyingBack ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Buy Back for ${sag.sagProperties.currency} ${totalBuyBackCost.toFixed(2)}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Repayment Progress Tracker */}
    <RepaymentProgressTracker
      isVisible={showProgressTracker}
      onClose={() => setShowProgressTracker(false)}
      progressData={lastProgress}
      completeData={lastComplete}
      errorData={lastError}
    />
  </>
  )
}

// View Details Dialog Component
function ViewDetailsDialog({ sag }: { sag: SAG }) {
  const [isOpen, setIsOpen] = useState(false)

  const { data: tokenInfo, isLoading: tokenLoading } = useQuery({
    queryKey: ['token-info', sag.tokenId],
    queryFn: async (): Promise<TokenResponse> => {
      const response = await apiInstance.get(`/token/${sag.tokenId}`)
      return response.data
    },
    enabled: isOpen && !!sag.tokenId, // Only fetch when dialog is open and tokenId exists
  })

  const sharePrice = sag.sagProperties.valuation / sag.sagProperties.mintShare
  const monthlyReturn = (sharePrice * sag.sagProperties.investorRoiPercentage) / 100
  // const totalReturn = sharePrice + (monthlyReturn * sag.sagProperties.tenorM)

  // Calculate months passed since token creation
  const monthsPassed = tokenInfo?.data ? (() => {
    const createdAtMs = parseFloat(tokenInfo.data.createdAt) * 1000
    const now = new Date().getTime()
    const diffMs = now - createdAtMs
    const monthsElapsed = diffMs / (1000 * 60 * 60 * 24 * 30.44)
    return Math.ceil(monthsElapsed)
  })() : 0

  const soldShares = tokenInfo?.data ? parseInt(tokenInfo.data.totalSupply) - parseInt(tokenInfo.data.remainingSupply) : 0
  const totalInvestment = soldShares * sharePrice
  const totalInterestEarned = soldShares * monthlyReturn * monthsPassed

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            {sag.sagName} - Details
          </DialogTitle>
          <DialogDescription>
            Comprehensive information about your NFT asset
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Name:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.sagName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Description:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.sagDescription}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Type:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.sagType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Status:</span>
                  <span className={`font-medium ${sag.status === 'closed' ? 'text-destructive dark:text-red-400' : 'text-success dark:text-success'}`}>
                    {sag.status === 'closed' ? 'Closed' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Certificate No:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.certNo}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Asset Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Asset Type:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.assetType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Weight:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.weightG}g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Karat:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.karat}K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Currency:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Valuation:</span>
                  <span className="font-medium text-success dark:text-success">
                    {sag.sagProperties.currency} {sag.sagProperties.valuation.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investment & Loan Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Investment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Minting Enabled:</span>
                  <span className={`font-medium ${sag.sagProperties.enableMinting ? 'text-success dark:text-success' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                    {sag.sagProperties.enableMinting ? 'Yes' : 'No'}
                  </span>
                </div>
                {sag.sagProperties.enableMinting ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground dark:text-muted-foreground">Total Shares:</span>
                      <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.mintShare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground dark:text-muted-foreground">Share Price:</span>
                      <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.currency} {sharePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground dark:text-muted-foreground">Financing Type:</span>
                      <span className="font-medium capitalize text-foreground dark:text-gray-100">{sag.sagProperties.investorFinancingType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground dark:text-muted-foreground">Monthly ROI:</span>
                      <span className="font-medium text-success dark:text-success">{sag.sagProperties.investorRoiPercentage}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground dark:text-muted-foreground">Investment Tenor:</span>
                      <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.tenorM} months</span>
                    </div>
                  </>
                ): null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Loan Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Loan Percentage:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.loanPercentage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Loan Amount:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">
                    {sag.sagProperties.loan
                      ? `${sag.sagProperties.currency} ${sag.sagProperties.loan.toLocaleString()}`
                      : `${sag.sagProperties.currency} ${sag.sagProperties.valuation * ((sag.sagProperties.loanPercentage) ?? 0) / 100}`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">Pawner Interest:</span>
                  <span className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.pawnerInterestP}%</span>
                </div>
                {sag.sagProperties.investorRoiFixedAmount ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground dark:text-muted-foreground">Fixed ROI Amount:</span>
                    <span className="font-medium text-foreground dark:text-gray-100">
                      {sag.sagProperties.currency} {sag.sagProperties.investorRoiFixedAmount.toLocaleString()}
                    </span>
                  </div>
                ): null}
              </CardContent>
            </Card>
          </div>

          {/* Token Information */}
          {sag.tokenId ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Blockchain & Token Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground dark:text-muted-foreground">Token ID:</span>
                      <a
                        className="text-primary dark:text-blue-400 hover:underline hover:text-primary dark:hover:text-blue-300 text-sm font-medium"
                        href={`${process.env.NEXT_PUBLIC_ENV_URL}/${sag.tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {sag.tokenId} ↗
                      </a>
                    </div>
                    {tokenLoading ? (
                      <div className="space-y-1">
                        <div className="h-4 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-4 bg-muted dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                      </div>
                    ) : tokenInfo ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground dark:text-muted-foreground">Total Supply:</span>
                          <span className="font-medium text-foreground dark:text-gray-100">{tokenInfo.data.totalSupply}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground dark:text-muted-foreground">Remaining Supply:</span>
                          <span className="font-medium text-success dark:text-success">{tokenInfo.data.remainingSupply}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground dark:text-muted-foreground">Sold Shares:</span>
                          <span className="font-medium text-destructive dark:text-red-400">{soldShares}</span>
                        </div>
                      </>
                    ) : null}
                  </div>

                  {tokenInfo && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground dark:text-muted-foreground">Created:</span>
                        <span className="font-medium text-foreground dark:text-gray-100">
                          {new Date(parseFloat(tokenInfo.data.createdAt) * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground dark:text-muted-foreground">Expires:</span>
                        <span className="font-medium text-foreground dark:text-gray-100">
                          {new Date(parseFloat(tokenInfo.data.expiredAt) * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground dark:text-muted-foreground">Treasury Account:</span>
                        <span className="font-medium text-xs text-foreground dark:text-gray-100">{tokenInfo.data.treasuryAccountId}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ): null}

          {/* Investment Performance (if minting enabled and shares sold) */}
          {sag.sagProperties.enableMinting && soldShares > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Investment Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-muted dark:bg-blue-900/20 p-3 rounded-lg border dark:border-blue-700">
                    <div className="text-lg font-bold text-primary dark:text-blue-400">
                      {sag.sagProperties.currency} {totalInvestment.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground">Total Investment</div>
                  </div>
                  <div className="bg-success/10 dark:bg-green-900/20 p-3 rounded-lg border dark:border-green-700">
                    <div className="text-lg font-bold text-success dark:text-success">
                      {sag.sagProperties.currency} {totalInterestEarned.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground">Interest Earned</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border dark:border-orange-700">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {monthsPassed}
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground">Months Active</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border dark:border-purple-700">
                    <div className="text-lg font-bold text-primary dark:text-purple-400">
                      {((soldShares / sag.sagProperties.mintShare) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground">Shares Sold</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ): null}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PawnshopNFTs() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [ethPrice, setEthPrice] = useState(0)


  useEffect(() => {
    const fetchEthPrice = () => {
      apiInstance.get("/eth-price")
        .then((res) => setEthPrice(res.data?.data?.usd || 0))
        .catch(() => setEthPrice(0))
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
  }, [])

  const { data, isLoading, error } = useQuery({
    queryKey: ['sags', currentPage, pageSize],
    queryFn: async (): Promise<SAGResponse> => {
      const response = await apiInstance.get(`/sag?page_size=${pageSize}&page_number=${currentPage}`)
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6 text-foreground dark:text-gray-100">My NFTs</h1>
        <p className="text-muted-foreground mb-8 dark:text-muted-foreground">Manage your NFT listings and collateral.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={`loading-card-${i}`}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6 text-foreground dark:text-gray-100">My NFTs</h1>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4 dark:text-muted-foreground">Failed to load NFTs</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  const sags = data?.data || []
  const pagination = data?.pagination

  // Use the pagination data from API
  const totalPages = pagination?.totalPages || 1
  const hasNextPage = pagination?.hasNextPage || false
  const hasPrevPage = pagination?.hasPrevPage || false

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Helper functions for badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success dark:bg-green-900/30 dark:text-green-300">Active</Badge>
      case "closed":
        return <Badge className="bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-red-300">Closed</Badge>
      default:
        return <Badge className="bg-success/10 text-success dark:bg-green-900/30 dark:text-green-300">Active</Badge>
    }
  }

  const getRiskBadge = (sag: SAG) => {
    // Calculate risk based on SAG properties
    const loanPercentage = sag.sagProperties.loanPercentage || 0
    const risk = loanPercentage > 80 ? "High" : loanPercentage > 60 ? "Medium" : "Low"
    
    switch (risk) {
      case "Low":
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">
            Low Risk
          </Badge>
        )
      case "Medium":
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700">
            Medium Risk
          </Badge>
        )
      case "High":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">
            High Risk
          </Badge>
        )
      default:
        return <Badge variant="outline">{risk}</Badge>
    }
  }

  // Filter SAGs based on search and status
  const filteredSags = sags.filter((sag) => {
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && (sag.status === "active" || !sag.status)) ||
      (selectedStatus === "closed" && sag.status === "closed")
    const matchesSearch =
      sag.sagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sag.sagName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sag.sagDescription.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Count SAGs by status for display
  const activeSags = filteredSags.filter(sag => sag.status === 'active' || !sag.status) // Default to active if no status
  const closedSags = filteredSags.filter(sag => sag.status === 'closed')



  // Render NFT Table Component
  const renderNFTTable = (nfts: SAG[]) => {
    if (nfts.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4 dark:text-muted-foreground">No NFTs found</p>
          <Button asChild>
            <Link href="/pawnshop/nfts/new">Create Your First NFT</Link>
          </Button>
        </div>
      )
    }

    return (
      <>
        <div className="border rounded-lg mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SAG Details</TableHead>
                <TableHead>Asset Info</TableHead>
                <TableHead>Valuation</TableHead>
                <TableHead>Investment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nfts.map((sag) => (
                <TableRow key={sag.sagId} className={sag.status === 'closed' ? 'opacity-75' : ''}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground dark:text-gray-100">{sag.sagName}</div>
                      <div className="text-sm text-muted-foreground dark:text-muted-foreground">{sag.sagId}</div>
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground">{sag.sagDescription}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.assetType}</div>
                      <div className="text-sm text-muted-foreground dark:text-muted-foreground">{sag.sagProperties.weightG}g</div>
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground">{sag.sagProperties.karat}K Gold</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground dark:text-gray-100">
                        {sag.sagProperties.currency} {sag.sagProperties.valuation.toLocaleString()}
                      </div>
                      {sag.sagProperties.loan && (
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                          Loan: {sag.sagProperties.currency} {sag.sagProperties.loan.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground dark:text-gray-100">{sag.sagProperties.mintShare.toLocaleString()} shares</div>
                      <div className="text-sm text-muted-foreground dark:text-muted-foreground">{sag.sagProperties.investorRoiPercentage}% ROI</div>
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground">{sag.sagProperties.tenorM} months</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(sag.status || 'active')}</TableCell>
                  <TableCell>{getRiskBadge(sag)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {sag.status !== 'closed' && (
                        <ViewDetailsDialog sag={sag} />
                      )}
                      {sag.sagProperties.enableMinting && sag.tokenId && sag.status !== 'closed' && (
                        <BuyBackDialog sag={sag} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage < 3) {
                pageNum = i + 1
              } else if (currentPage > totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasNextPage}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Page Info */}
        <div className="text-center mt-4 text-sm text-muted-foreground dark:text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
      </>
    )
  }

  // Render NFT Grid Component
  const renderNFTGrid = (nfts: SAG[]) => {
    if (nfts.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4 dark:text-muted-foreground">No NFTs found</p>
          <Button asChild>
            <Link href="/pawnshop/nfts/new">Create Your First NFT</Link>
          </Button>
        </div>
      )
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {nfts.map((sag) => (
            <Card
              key={sag.sagId}
              className={`hover:shadow-lg dark:hover:shadow-gray-700/20 transition-all duration-200 ${sag.status === 'closed'
                  ? 'border-l-4 border-l-red-500 bg-destructive/10/30 dark:bg-red-900/10 hover:bg-destructive/10/50 dark:hover:bg-red-900/20 opacity-80 dark:border-border'
                  : 'border-l-4 border-l-green-500 bg-success/10/30 dark:bg-green-900/10 hover:bg-success/10/50 dark:hover:bg-green-900/20 dark:border-border'
                }`}
            >
              <CardHeader className={`pb-2 ${sag.status === 'closed' ? 'opacity-75' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className={`text-base truncate ${sag.status === 'closed' ? 'text-muted-foreground dark:text-muted-foreground' : 'text-foreground dark:text-gray-100'}`}>
                        {sag.sagName}
                      </CardTitle>
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sag.status === 'closed'
                          ? 'bg-destructive/10 dark:bg-red-900/30 text-destructive dark:text-red-300 border border-destructive/30 dark:border-red-700'
                          : 'bg-success/10 dark:bg-green-900/30 text-success dark:text-green-300 border border-success/30 dark:border-green-700'
                        }`}>
                        {sag.status === 'closed' ? 'CLOSED' : 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {sag.sagDescription}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`pt-0 ${sag.status === 'closed' ? 'opacity-75' : ''}`}>
                {/* Key Stats Row with ETH equivalents */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Valuation</p>
                    <p className="text-sm font-bold">${sag.sagProperties.valuation?.toLocaleString() || '0'}</p>
                    {ethPrice > 0 && sag.sagProperties.valuation > 0 && (
                      <p className="text-[10px] font-mono text-muted-foreground/70">~{(sag.sagProperties.valuation / ethPrice).toFixed(4)} ETH</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Loan</p>
                    <p className="text-sm font-bold text-emerald-600">${sag.sagProperties.loan?.toLocaleString() || '0'}</p>
                    {ethPrice > 0 && sag.sagProperties.loan && sag.sagProperties.loan > 0 && (
                      <p className="text-[10px] font-mono text-muted-foreground/70">~{(sag.sagProperties.loan / ethPrice).toFixed(4)} ETH</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">ROI/mo</p>
                    <p className="text-sm font-bold text-emerald-600">{sag.sagProperties.investorRoiPercentage || 0}%</p>
                  </div>
                </div>

                {/* Compact Details */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">{sag.sagProperties.weightG}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Karat:</span>
                    <span className="font-medium">{sag.sagProperties.karat}K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{sag.sagProperties.tenorM ? Math.round(sag.sagProperties.tenorM / 30) : 3} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shares:</span>
                    <span className="font-medium">{sag.sagProperties.mintShare.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {
                    sag.status !== 'closed' ? (
                      <ViewDetailsDialog sag={sag} />
                    ) : null
                  }
                  {sag.sagProperties.enableMinting && sag.tokenId && sag.status !== 'closed' ? (
                    <BuyBackDialog sag={sag} />
                  ): null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage < 3) {
                pageNum = i + 1
              } else if (currentPage > totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasNextPage}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Page Info */}
        <div className="text-center mt-4 text-sm text-muted-foreground dark:text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
      </>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-gray-100">My NFTs</h1>
          <p className="text-muted-foreground dark:text-muted-foreground">Manage your NFT listings and collateral.</p>
        </div>
        <Button asChild>
          <Link href="/pawnshop/nfts/new">
            <Plus className="mr-2 h-4 w-4" />
            List New NFT
          </Link>
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 dark:bg-card/50 rounded-lg border dark:border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground dark:text-gray-100">Total NFTs:</span>
          <span className="text-sm text-muted-foreground dark:text-muted-foreground">{sags.length}</span>
          {filteredSags.length !== sags.length && (
            <span className="text-xs text-muted-foreground dark:text-muted-foreground">({filteredSags.length} filtered)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground dark:text-gray-100">Active:</span>
          <span className="bg-success/10 dark:bg-green-900/30 text-success dark:text-green-300 text-xs px-2 py-1 rounded-full border dark:border-green-700">
            {activeSags.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground dark:text-gray-100">Closed:</span>
          <span className="bg-destructive/10 dark:bg-red-900/30 text-destructive dark:text-red-300 text-xs px-2 py-1 rounded-full border dark:border-red-700">
            {closedSags.length}
          </span>
        </div>
      </div>

      {/* Search, Filter and View Controls */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Search NFTs</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by SAG ID, name, or description..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status-filter">Status Filter</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="view-toggle">View Mode</Label>
            <div className="flex border rounded-lg p-1 bg-muted/50">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="flex items-center gap-2"
              >
                <Grid className="h-4 w-4" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Table
              </Button>
            </div>
          </div>
        </div>

        {/* Page Size Selector */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground dark:text-muted-foreground">Show:</span>

            <Select
              onValueChange={(value) => handlePageSizeChange(Number(value))}
              defaultValue={pageSize.toString() || "10"}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select your page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Pages</SelectLabel>
                  <SelectItem value={"5"}>5</SelectItem>
                  <SelectItem value={"10"}>10</SelectItem>
                  <SelectItem value={"20"}>20</SelectItem>
                  <SelectItem value={"50"}>50</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground dark:text-muted-foreground">per page</span>

            {pagination ? (
              <div className="text-sm text-muted-foreground dark:text-muted-foreground ml-4">
                Showing {((pagination.currentPage - 1) * pageSize) + 1} to {Math.min(pagination.currentPage * pageSize, pagination.totalCount)}
                {` of ${pagination.totalCount}`} results
              </div>
            ): null}
          </div>
        </div>
      </div>

      {/* NFTs Display */}
      {viewMode === 'table' ? renderNFTTable(filteredSags) : renderNFTGrid(filteredSags)}
    </div>
  )
}

export default PawnshopNFTs;