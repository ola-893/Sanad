"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FileText, Eye, Shield, AlertTriangle, Clock, Search, Filter, Brain, Scan, Users, Loader2 } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import apiInstance from "@/lib/axios-v1"

interface KycRecord {
  id: string
  userId: string
  userName: string
  documentType: string
  status: "pending" | "approved" | "rejected" | "under_review" | "approved_with_edd" | "submitted"
  riskScore: number
  amlStatus: "clear" | "flagged" | "watchlist" | "unscreened"
  lastScan: string
  nextReview: string
  confidence: number
  flags: string[]
}

export function KycAmlIntelligence() {
  const { t } = useLanguage()
  const [kycRecords, setKycRecords] = useState<KycRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedRecord, setSelectedRecord] = useState<KycRecord | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/kyc/all")
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setKycRecords(
          res.data.data.map((r: any) => ({
            id: r.id,
            userId: r.userId,
            userName: r.name || r.userName || "User " + r.userId,
            documentType: r.documentType || "MyKad",
            status: r.status,
            riskScore: Number(r.riskScore) || 0,
            amlStatus: r.amlStatus || "clear",
            lastScan: r.lastScan || new Date().toISOString().replace("T", " ").substring(0, 19),
            nextReview: r.nextReview || "",
            confidence: r.confidence || (r.status === "approved" ? 98.5 : 75.0),
            flags: Array.isArray(r.flags) ? r.flags : [],
          }))
        )
      } else {
        // Fallback
        setKycRecords([])
      }
    } catch (err) {
      console.warn("Could not fetch KYC intelligence records:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const filteredRecords = kycRecords.filter((record) => {
    const matchesSearch =
      record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.userId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || record.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success">Approved</Badge>
      case "pending":
        return <Badge className="bg-warning/10 text-warning-foreground">Pending</Badge>
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>
      case "under_review":
        return <Badge className="bg-muted text-primary">Under Review</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAmlBadge = (amlStatus: string) => {
    switch (amlStatus) {
      case "clear":
        return <Badge className="bg-success/10 text-success">Clear</Badge>
      case "flagged":
        return <Badge className="bg-destructive/10 text-destructive">Flagged</Badge>
      case "watchlist":
        return <Badge className="bg-warning/10 text-warning-foreground">Watchlist</Badge>
      default:
        return <Badge variant="outline">{amlStatus}</Badge>
    }
  }

  const getRiskLevel = (score: number) => {
    if (score < 30) return { level: "Low", color: "bg-success/10 text-success" }
    if (score < 70) return { level: "Medium", color: "bg-warning/10 text-warning-foreground" }
    return { level: "High", color: "bg-destructive/10 text-destructive" }
  }

  const handleRescan = async (recordId: string) => {
    setIsScanning(true)
    // Simulate AI rescanning
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setKycRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              lastScan: new Date().toISOString().replace("T", " ").substring(0, 19),
              confidence: Math.min(record.confidence + Math.random() * 20, 100),
              riskScore: Math.max(record.riskScore - Math.random() * 10, 0),
            }
          : record,
      ),
    )
    setIsScanning(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            {t("ai.kycAml")}
          </h2>
          <p className="text-muted-foreground">AI-powered KYC verification and AML compliance monitoring</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Scan className="h-4 w-4 mr-2" />
          Bulk Rescan
        </Button>
      </div>

      {/* AI Capabilities Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("kyc.documentIntelligence")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">98.5%</div>
            <div className="text-xs text-muted-foreground">OCR Accuracy</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {t("kyc.livenessVerification")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">94.2%</div>
            <div className="text-xs text-muted-foreground">Face Match Rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t("kyc.amlScanning")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">12</div>
            <div className="text-xs text-muted-foreground">Watchlist Hits</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("kyc.behaviorScoring")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">87%</div>
            <div className="text-xs text-muted-foreground">Risk Accuracy</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("kyc.continuousMonitoring")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">24/7</div>
            <div className="text-xs text-muted-foreground">Active Monitoring</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>KYC & AML Records</CardTitle>
          <CardDescription>AI-powered identity verification and compliance screening</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>

          {/* KYC Records Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>{t("kyc.status")}</TableHead>
                  <TableHead>{t("kyc.riskScore")}</TableHead>
                  <TableHead>AML Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>{t("kyc.lastScan")}</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const riskLevel = getRiskLevel(record.riskScore)
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.userName}</div>
                          <div className="text-sm text-muted-foreground">{record.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{record.documentType}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={riskLevel.color}>{riskLevel.level}</Badge>
                          <span className="text-sm text-muted-foreground">({record.riskScore})</span>
                        </div>
                      </TableCell>
                      <TableCell>{getAmlBadge(record.amlStatus)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={record.confidence} className="w-16" />
                          <span className="text-sm">{record.confidence.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{record.lastScan}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRecord(record)}
                                className="bg-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>KYC Details - {selectedRecord?.userName}</DialogTitle>
                                <DialogDescription>
                                  Comprehensive AI analysis and compliance screening results
                                </DialogDescription>
                              </DialogHeader>
                              {selectedRecord && (
                                <div className="space-y-4">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                      <label className="text-sm font-medium">User ID</label>
                                      <p className="text-sm text-muted-foreground">{selectedRecord.userId}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Document Type</label>
                                      <p className="text-sm text-muted-foreground">{selectedRecord.documentType}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Risk Score</label>
                                      <div className="flex items-center gap-2">
                                        <Progress value={selectedRecord.riskScore} className="w-20" />
                                        <span className="text-sm">{selectedRecord.riskScore}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Confidence</label>
                                      <div className="flex items-center gap-2">
                                        <Progress value={selectedRecord.confidence} className="w-20" />
                                        <span className="text-sm">{selectedRecord.confidence.toFixed(1)}%</span>
                                      </div>
                                    </div>
                                  </div>

                                  {selectedRecord.flags.length > 0 && (
                                    <div>
                                      <label className="text-sm font-medium">AI Flags</label>
                                      <div className="space-y-2 mt-2">
                                        {selectedRecord.flags.map((flag, index) => (
                                          <div key={index} className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                                            <AlertTriangle className="h-4 w-4 text-destructive" />
                                            <span className="text-sm text-destructive">{flag}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleRescan(selectedRecord.id)}
                                      disabled={isScanning}
                                      className="bg-primary hover:bg-primary/90"
                                    >
                                      {isScanning ? "Rescanning..." : "AI Rescan"}
                                    </Button>
                                    <Button variant="outline">Manual Review</Button>
                                    <Button variant="outline">Approve</Button>
                                    <Button variant="destructive">Reject</Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRescan(record.id)}
                            disabled={isScanning}
                          >
                            <Scan className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
