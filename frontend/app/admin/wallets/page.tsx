"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Wallet, Search, Ban, Shield, Coins, AlertTriangle, CheckCircle } from "lucide-react"

const walletData = [
  {
    address: "0x1234...5678",
    type: "investor",
    status: "active",
    tokenBalance: "125,000 SAGS",
    nftCount: 8,
    totalTransactions: 45,
    lastActivity: "2025-01-15",
    riskLevel: "low",
    kycStatus: "verified",
  },
  {
    address: "0x2345...6789",
    type: "ar_rahnu",
    status: "active",
    tokenBalance: "0 SAGS",
    nftCount: 0,
    totalTransactions: 23,
    lastActivity: "2025-01-14",
    riskLevel: "low",
    kycStatus: "verified",
  },
  {
    address: "0x3456...7890",
    type: "investor",
    status: "blacklisted",
    tokenBalance: "0 SAGS",
    nftCount: 0,
    totalTransactions: 12,
    lastActivity: "2024-12-20",
    riskLevel: "high",
    kycStatus: "rejected",
  },
]

export default function WalletsPage() {
  const [selectedWallet, setSelectedWallet] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-success/10 text-success">
            Active
          </Badge>
        )
      case "suspended":
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning">
            Suspended
          </Badge>
        )
      case "blacklisted":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive">
            Blacklisted
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "investor":
        return (
          <Badge variant="outline" className="bg-muted text-primary">
            Investor
          </Badge>
        )
      case "ar_rahnu":
        return (
          <Badge variant="outline" className="bg-muted text-purple-700">
            Ar Rahnu
          </Badge>
        )
      case "admin":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Admin
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low":
        return (
          <Badge variant="outline" className="bg-success/10 text-success">
            Low
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning">
            Medium
          </Badge>
        )
      case "high":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive">
            High
          </Badge>
        )
      default:
        return <Badge variant="outline">{risk}</Badge>
    }
  }

  const filteredWallets = walletData.filter((wallet) => wallet.address.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet & Token Control</h1>
          <p className="text-muted-foreground">Manage wallet permissions and token controls</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Wallet className="h-4 w-4 mr-2" />
          Add Wallet
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">Registered wallets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">1,189</div>
            <p className="text-xs text-muted-foreground">95% active rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blacklisted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">12</div>
            <p className="text-xs text-muted-foreground">Security measures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Token Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,456</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Management */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Directory</CardTitle>
          <CardDescription>Monitor and control all platform wallets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search wallet addresses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Token Balance</TableHead>
                  <TableHead>NFT Count</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWallets.map((wallet) => (
                  <TableRow key={wallet.address}>
                    <TableCell className="font-mono text-sm">{wallet.address}</TableCell>
                    <TableCell>{getTypeBadge(wallet.type)}</TableCell>
                    <TableCell>{wallet.tokenBalance}</TableCell>
                    <TableCell>{wallet.nftCount}</TableCell>
                    <TableCell>{getRiskBadge(wallet.riskLevel)}</TableCell>
                    <TableCell>{getStatusBadge(wallet.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedWallet(wallet)}
                              className="bg-transparent"
                            >
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Wallet Management</DialogTitle>
                              <DialogDescription>Control wallet permissions and token operations</DialogDescription>
                            </DialogHeader>
                            {selectedWallet && (
                              <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <label className="text-sm font-medium">Wallet Address</label>
                                    <p className="text-sm text-muted-foreground font-mono">{selectedWallet.address}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Type</label>
                                    <div className="mt-1">{getTypeBadge(selectedWallet.type)}</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="mt-1">{getStatusBadge(selectedWallet.status)}</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Risk Level</label>
                                    <div className="mt-1">{getRiskBadge(selectedWallet.riskLevel)}</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Last Activity</label>
                                    <p className="text-sm text-muted-foreground">{selectedWallet.lastActivity}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Total Transactions</label>
                                    <p className="text-sm text-muted-foreground">{selectedWallet.totalTransactions}</p>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3">Token Holdings</h4>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="p-3 border rounded-lg">
                                      <div className="text-sm font-medium text-muted-foreground">SAGS Tokens</div>
                                      <div className="text-lg font-bold">{selectedWallet.tokenBalance}</div>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                      <div className="text-sm font-medium text-muted-foreground">NFTs Owned</div>
                                      <div className="text-lg font-bold">{selectedWallet.nftCount}</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3">Wallet Controls</h4>
                                  <div className="flex gap-2 flex-wrap">
                                    {selectedWallet.status === "active" && (
                                      <>
                                        <Button size="sm" variant="destructive">
                                          <Ban className="h-4 w-4 mr-2" />
                                          Suspend Wallet
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/10"
                                        >
                                          <AlertTriangle className="h-4 w-4 mr-2" />
                                          Blacklist Wallet
                                        </Button>
                                      </>
                                    )}
                                    {selectedWallet.status === "suspended" && (
                                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Reactivate Wallet
                                      </Button>
                                    )}
                                    {selectedWallet.status === "blacklisted" && (
                                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Remove from Blacklist
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3">Token Operations</h4>
                                  <div className="flex gap-2 flex-wrap">
                                    <Button size="sm" variant="outline" className="bg-transparent">
                                      <Coins className="h-4 w-4 mr-2" />
                                      Force Burn Tokens
                                    </Button>
                                    <Button size="sm" variant="outline" className="bg-transparent">
                                      <Shield className="h-4 w-4 mr-2" />
                                      Freeze Assets
                                    </Button>
                                    <Button size="sm" variant="outline" className="bg-transparent">
                                      View Transaction History
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        {wallet.status === "active" && (
                          <Button size="sm" variant="destructive">
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Controls</CardTitle>
            <CardDescription>Platform-wide security measures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Shield className="h-4 w-4 mr-2" />
              Emergency Freeze All
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Ban className="h-4 w-4 mr-2" />
              Bulk Blacklist
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Token Management</CardTitle>
            <CardDescription>Global token operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Coins className="h-4 w-4 mr-2" />
              Mint New Tokens
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Burn Tokens
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports</CardTitle>
            <CardDescription>Generate wallet reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              Transaction Report
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              Security Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
