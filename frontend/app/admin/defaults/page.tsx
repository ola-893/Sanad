"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertTriangle, DollarSign, Calendar, CheckCircle, FileText, TrendingDown } from "lucide-react"

const defaultData = [
  {
    sagId: "SAG-2024-023",
    arRahnu: "KL Central Branch",
    originalAmount: "RM 15,000",
    outstandingAmount: "RM 15,450",
    defaultDate: "2024-12-15",
    collateralValue: "RM 18,000",
    saleDate: "2025-01-10",
    recoveryStatus: "sold",
    recoveredAmount: "RM 16,500",
    investorPayout: "RM 15,450",
    status: "completed",
  },
  {
    sagId: "SAG-2024-034",
    arRahnu: "Johor Bahru Branch",
    originalAmount: "RM 22,000",
    outstandingAmount: "RM 22,660",
    defaultDate: "2024-11-20",
    collateralValue: "RM 25,000",
    saleDate: "2025-01-15",
    recoveryStatus: "pending_sale",
    recoveredAmount: "RM 0",
    investorPayout: "RM 0",
    status: "in_progress",
  },
  {
    sagId: "SAG-2024-045",
    arRahnu: "Penang Branch",
    originalAmount: "RM 8,500",
    outstandingAmount: "RM 8,755",
    defaultDate: "2024-10-30",
    collateralValue: "RM 9,200",
    saleDate: "2025-01-05",
    recoveryStatus: "sold",
    recoveredAmount: "RM 8,900",
    investorPayout: "RM 8,755",
    status: "completed",
  },
]

export default function DefaultsPage() {
  const [selectedDefault, setSelectedDefault] = useState<any>(null)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning">
            In Progress
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-success/10 text-success">
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive">
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRecoveryBadge = (status: string) => {
    switch (status) {
      case "sold":
        return (
          <Badge variant="outline" className="bg-success/10 text-success">
            Sold
          </Badge>
        )
      case "pending_sale":
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning">
            Pending Sale
          </Badge>
        )
      case "valuation":
        return (
          <Badge variant="outline" className="bg-muted text-primary">
            Under Valuation
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Default Cases</h1>
          <p className="text-muted-foreground">Manage defaulted loans and recovery processes</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Review Defaults
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">23</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recovery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">94%</div>
            <p className="text-xs text-muted-foreground">Average recovery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RM 22,660</div>
            <p className="text-xs text-muted-foreground">Pending recovery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">21</div>
            <p className="text-xs text-muted-foreground">Fully resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Default Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Default Cases</CardTitle>
          <CardDescription>Monitor defaulted SAGs and recovery processes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SAG ID</TableHead>
                  <TableHead>Ar Rahnu Branch</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Default Date</TableHead>
                  <TableHead>Recovery Status</TableHead>
                  <TableHead>Recovered Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaultData.map((defaultCase) => (
                  <TableRow key={defaultCase.sagId}>
                    <TableCell className="font-medium">{defaultCase.sagId}</TableCell>
                    <TableCell>{defaultCase.arRahnu}</TableCell>
                    <TableCell>{defaultCase.outstandingAmount}</TableCell>
                    <TableCell>{defaultCase.defaultDate}</TableCell>
                    <TableCell>{getRecoveryBadge(defaultCase.recoveryStatus)}</TableCell>
                    <TableCell>{defaultCase.recoveredAmount}</TableCell>
                    <TableCell>{getStatusBadge(defaultCase.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDefault(defaultCase)}
                              className="bg-transparent"
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Default Case - {selectedDefault?.sagId}</DialogTitle>
                              <DialogDescription>Complete default and recovery information</DialogDescription>
                            </DialogHeader>
                            {selectedDefault && (
                              <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <label className="text-sm font-medium">SAG ID</label>
                                    <p className="text-sm text-muted-foreground">{selectedDefault.sagId}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Ar Rahnu Branch</label>
                                    <p className="text-sm text-muted-foreground">{selectedDefault.arRahnu}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Original Amount</label>
                                    <p className="text-sm text-muted-foreground">{selectedDefault.originalAmount}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Outstanding Amount</label>
                                    <p className="text-sm text-muted-foreground font-semibold text-destructive">
                                      {selectedDefault.outstandingAmount}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Default Date</label>
                                    <p className="text-sm text-muted-foreground">{selectedDefault.defaultDate}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Collateral Value</label>
                                    <p className="text-sm text-muted-foreground">{selectedDefault.collateralValue}</p>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3">Recovery Information</h4>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                      <label className="text-sm font-medium">Sale Date</label>
                                      <p className="text-sm text-muted-foreground">{selectedDefault.saleDate}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Recovery Status</label>
                                      <div className="mt-1">{getRecoveryBadge(selectedDefault.recoveryStatus)}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Recovered Amount</label>
                                      <p className="text-sm text-muted-foreground font-semibold text-success">
                                        {selectedDefault.recoveredAmount}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Investor Payout</label>
                                      <p className="text-sm text-muted-foreground">{selectedDefault.investorPayout}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3">Recovery Actions</h4>
                                  <div className="flex gap-2 flex-wrap">
                                    {selectedDefault.status === "in_progress" && (
                                      <>
                                        <Button size="sm" className="bg-primary hover:bg-primary/90">
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Confirm Recovery
                                        </Button>
                                        <Button size="sm" variant="outline" className="bg-transparent">
                                          <DollarSign className="h-4 w-4 mr-2" />
                                          Update Amount
                                        </Button>
                                        <Button size="sm" variant="outline" className="bg-transparent">
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Schedule Sale
                                        </Button>
                                      </>
                                    )}
                                    {selectedDefault.status === "completed" && (
                                      <>
                                        <Button size="sm" variant="destructive">
                                          Burn Tokens/NFT
                                        </Button>
                                        <Button size="sm" variant="outline" className="bg-transparent">
                                          <FileText className="h-4 w-4 mr-2" />
                                          Generate Report
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3">Recovery Timeline</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3 p-2 bg-destructive/10 rounded">
                                      <div className="w-2 h-2 bg-destructive/100 rounded-full"></div>
                                      <div>
                                        <p className="text-sm font-medium">Default Occurred</p>
                                        <p className="text-xs text-muted-foreground">{selectedDefault.defaultDate}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 bg-warning/10 rounded">
                                      <div className="w-2 h-2 bg-warning/100 rounded-full"></div>
                                      <div>
                                        <p className="text-sm font-medium">Collateral Sale</p>
                                        <p className="text-xs text-muted-foreground">{selectedDefault.saleDate}</p>
                                      </div>
                                    </div>
                                    {selectedDefault.status === "completed" && (
                                      <div className="flex items-center gap-3 p-2 bg-success/10 rounded">
                                        <div className="w-2 h-2 bg-success/100 rounded-full"></div>
                                        <div>
                                          <p className="text-sm font-medium">Recovery Completed</p>
                                          <p className="text-xs text-muted-foreground">Investors paid out</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Analytics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recovery Performance</CardTitle>
            <CardDescription>Overall recovery statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Recovery Rate</span>
                <Badge variant="outline" className="bg-success/10 text-success">
                  94%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Recovery Time</span>
                <Badge variant="outline">45 days</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Recovered</span>
                <Badge variant="outline" className="bg-muted text-primary">
                  RM 1.2M
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Branch Performance</CardTitle>
            <CardDescription>Default rates by branch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">KL Central</span>
                <Badge variant="outline" className="bg-success/10 text-success">
                  2.1%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Johor Bahru</span>
                <Badge variant="outline" className="bg-warning/10 text-warning">
                  3.5%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Penang</span>
                <Badge variant="outline" className="bg-success/10 text-success">
                  1.8%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common default management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <TrendingDown className="h-4 w-4 mr-2" />
              Generate Default Report
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Flag High Risk SAGs
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <FileText className="h-4 w-4 mr-2" />
              Export Recovery Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
