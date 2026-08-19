"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Coins, TrendingUp, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import apiInstance from '@/lib/axios-v1'
import { Skeleton } from '@/components/ui/skeleton'

interface SAGResponse {
  success: boolean
  data: any[]
  pagination: {
    totalCount: number
  }
}

export default function PawnshopDashboard() {
  const { data: sagsData, isLoading } = useQuery({
    queryKey: ['pawnshop-sags'],
    queryFn: async (): Promise<SAGResponse> => {
      const { data } = await apiInstance.get('/sag?page_size=50&page_number=1')
      return data
    },
  })

  const sags = sagsData?.data || []
  const totalCount = sagsData?.pagination?.totalCount || 0
  const activeCount = sags.filter((s: any) => s.status === 'active').length
  const totalValue = sags.reduce((sum: number, s: any) => sum + (s.sagProperties?.valuation || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pawnshop Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your SAG collateral listings</p>
        </div>
        <Button asChild>
          <Link href="/pawnshop/nfts/new">
            <Plus className="mr-2 h-4 w-4" />
            List New SAG
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total SAGs</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalCount}</div>
            )}
            <p className="text-xs text-muted-foreground">{activeCount} active</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Valuation</CardTitle>
            <Coins className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {totalValue > 0 ? `CTC ${(totalValue / 1000).toFixed(1)}K` : "—"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Portfolio value</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{activeCount}</div>
            )}
            <p className="text-xs text-muted-foreground">Currently funded</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent SAGs</CardTitle>
            <CardDescription>Your latest collateral listings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : sags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No SAGs listed yet</p>
            ) : (
              <div className="space-y-3">
                {sags.slice(0, 5).map((sag: any) => (
                  <div key={sag.sagId} className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${sag.status === 'active' ? 'bg-emerald-500' : 'bg-muted'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {sag.sagName || `SAG #${sag.sagId.slice(-8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{sag.sagProperties?.assetType}</p>
                    </div>
                    <div className="text-sm font-medium">
                      {sag.sagProperties?.currency} {sag.sagProperties?.valuation?.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your SAG portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/pawnshop/nfts">
                <FileText className="mr-2 h-4 w-4" />
                View All SAGs
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/pawnshop/nfts/new">
                <Plus className="mr-2 h-4 w-4" />
                List New SAG
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
