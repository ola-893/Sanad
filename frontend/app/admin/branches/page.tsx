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
import { Building2, Search, MapPin, Phone, Mail, Users, Settings } from "lucide-react"

const branchData = [
  {
    id: "BR-001",
    name: "KL Central Branch",
    location: "Abuja Central",
    address: "100 Constitution Avenue, Central Business District",
    phone: "+234 809 111 2222",
    email: "abuja@sanad.ng",
    manager: "Chukwuemeka Okafor",
    status: "active",
    totalSAGs: 45,
    totalValue: "CTC 675,000",
    joinDate: "2023-01-15",
  },
  {
    id: "BR-002",
    name: "Southern Branch",
    location: "Lugbe Office",
    address: "200 Aguiyi Ironsi Street, Gwarinpa",
    phone: "+234 809 333 4444",
    email: "lugbe@sanad.ng",
    manager: "Zainab Mohammed",
    status: "active",
    totalSAGs: 32,
    totalValue: "CTC 480,000",
    joinDate: "2023-03-20",
  },
  {
    id: "BR-003",
    name: "Northern Branch",
    location: "George Town",
    address: "300 Shehu Shagari Way, Lugu",
    phone: "+234 809 555 6666",
    email: "garki@sanad.ng",
    manager: "Chinedu Obi",
    status: "pending",
    totalSAGs: 0,
    totalValue: "CTC 0",
    joinDate: "2025-01-10",
  },
]

export default function BranchesPage() {
  const [selectedBranch, setSelectedBranch] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-success/10 text-success">
            Active
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning">
            Pending
          </Badge>
        )
      case "suspended":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive">
            Suspended
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredBranches = branchData.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ar Rahnu Branches</h1>
          <p className="text-muted-foreground">Manage Ar Rahnu branch partnerships and configurations</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Building2 className="h-4 w-4 mr-2" />
          Add New Branch
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25</div>
            <p className="text-xs text-muted-foreground">Active partnerships</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">3</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total SAGs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">Across all branches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">CTC 2.4M</div>
            <p className="text-xs text-muted-foreground">Combined portfolio</p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Management */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Directory</CardTitle>
          <CardDescription>Manage all Ar Rahnu branch partnerships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search branches..."
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
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Total SAGs</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {branch.location}
                      </div>
                    </TableCell>
                    <TableCell>{branch.manager}</TableCell>
                    <TableCell>{branch.totalSAGs}</TableCell>
                    <TableCell>{branch.totalValue}</TableCell>
                    <TableCell>{getStatusBadge(branch.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBranch(branch)}
                              className="bg-transparent"
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{selectedBranch?.name}</DialogTitle>
                              <DialogDescription>Branch details and management options</DialogDescription>
                            </DialogHeader>
                            {selectedBranch && (
                              <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <label className="text-sm font-medium">Branch ID</label>
                                    <p className="text-sm text-muted-foreground">{selectedBranch.id}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="mt-1">{getStatusBadge(selectedBranch.status)}</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Manager</label>
                                    <p className="text-sm text-muted-foreground">{selectedBranch.manager}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Join Date</label>
                                    <p className="text-sm text-muted-foreground">{selectedBranch.joinDate}</p>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">Address</label>
                                  <p className="text-sm text-muted-foreground mt-1">{selectedBranch.address}</p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <label className="text-sm font-medium">Phone</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Phone className="h-4 w-4 text-muted-foreground" />
                                      <p className="text-sm text-muted-foreground">{selectedBranch.phone}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Email</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Mail className="h-4 w-4 text-muted-foreground" />
                                      <p className="text-sm text-muted-foreground">{selectedBranch.email}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3">Performance Metrics</h4>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="p-3 border rounded-lg">
                                      <div className="text-sm font-medium text-muted-foreground">Total SAGs</div>
                                      <div className="text-lg font-bold">{selectedBranch.totalSAGs}</div>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                      <div className="text-sm font-medium text-muted-foreground">Total Value</div>
                                      <div className="text-lg font-bold">{selectedBranch.totalValue}</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3">Actions</h4>
                                  <div className="flex gap-2 flex-wrap">
                                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                                      <Settings className="h-4 w-4 mr-2" />
                                      Configure Branch
                                    </Button>
                                    <Button size="sm" variant="outline" className="bg-transparent">
                                      <Users className="h-4 w-4 mr-2" />
                                      Manage Staff
                                    </Button>
                                    {selectedBranch.status === "pending" && (
                                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                                        Approve Branch
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" className="bg-transparent">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
