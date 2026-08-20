"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Eye, X, ShieldAlert, Loader2 } from "lucide-react"
import apiInstance from "@/lib/axios-v1"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface PendingKycItem {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  documentType: string
  icNo: string
  icFrontPicture?: string
  icBackPicture?: string
  status: string
  riskScore: number
  amlStatus: string
  submittedDate: string
}

export function PendingKyc() {
  const [items, setItems] = useState<PendingKycItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PendingKycItem | null>(null)
  const [showEddModal, setShowEddModal] = useState(false)
  const [eddSourceOfFunds, setEddSourceOfFunds] = useState("")
  const [eddApprovedBy, setEddApprovedBy] = useState("Compliance Officer - Nadia")
  const [eddNotes, setEddNotes] = useState("")

  const fetchPending = async () => {
    setLoading(true)
    try {
      const res = await apiInstance.get("/kyc/pending")
      if (res.data?.data && Array.isArray(res.data.data)) {
        setItems(res.data.data)
      } else {
        setItems([])
      }
    } catch (err) {
      console.warn("Could not fetch pending KYC:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(id)
    try {
      await apiInstance.post(`/kyc/${id}/review`, {
        status,
        reviewerId: "USR_COMPLIANCE_001",
        notes: status === "approved" ? "Standard CDD verification approved." : "Rejected due to mismatched documentation.",
      })
      await fetchPending()
    } catch (err: any) {
      console.error("Error reviewing KYC:", err)
      alert(`Review error: ${err.response?.data?.error || err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEddApprove = async () => {
    if (!selectedItem) return
    if (!eddSourceOfFunds.trim()) {
      alert("Source of Funds is required for EDD approval.")
      return
    }
    if (!eddApprovedBy.trim()) {
      alert("Named senior approver is required for EDD approval.")
      return
    }

    setActionLoading(selectedItem.id)
    try {
      await apiInstance.post(`/kyc/${selectedItem.id}/review`, {
        status: "approved_with_edd",
        reviewerId: "USR_COMPLIANCE_001",
        eddSourceOfFunds,
        eddApprovedBy,
        notes: eddNotes || "Enhanced Due Diligence completed and approved.",
      })
      setShowEddModal(false)
      setSelectedItem(null)
      await fetchPending()
    } catch (err: any) {
      console.error("Error reviewing EDD KYC:", err)
      alert(`EDD Review error: ${err.response?.data?.error || err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center border rounded-2xl bg-white/40">
        <p className="text-sm text-muted-foreground">No pending KYC applications in queue.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((kyc) => {
        const initials = kyc.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "KY"

        return (
          <Card key={kyc.id} className="overflow-hidden border border-[#171414]/15 bg-white/70">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`/placeholder.svg?name=${encodeURIComponent(kyc.name)}`} alt={kyc.name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{kyc.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      ID: {kyc.id} • IC: {kyc.icNo || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                  <div>
                    <p className="text-sm font-medium">Type: {kyc.documentType}</p>
                    <p className="text-xs text-muted-foreground">Submitted: {kyc.submittedDate}</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                      {kyc.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <Button
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white"
                      disabled={actionLoading === kyc.id}
                      onClick={() => handleReview(kyc.id, "approved")}
                    >
                      {actionLoading === kyc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600 text-amber-700 hover:bg-amber-50"
                      disabled={actionLoading === kyc.id}
                      onClick={() => {
                        setSelectedItem(kyc)
                        setShowEddModal(true)
                      }}
                    >
                      <ShieldAlert className="h-4 w-4 mr-1" /> Approve (EDD)
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionLoading === kyc.id}
                      onClick={() => handleReview(kyc.id, "rejected")}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* EDD Approval Dialog */}
      <Dialog open={showEddModal} onOpenChange={setShowEddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enhanced Due Diligence (EDD) Approval</DialogTitle>
            <DialogDescription>
              Per BNM AML/CFT requirements, EDD approval mandates documented source of funds and named senior sign-off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="applicant">Applicant</Label>
              <Input id="applicant" value={selectedItem ? `${selectedItem.name} (${selectedItem.id})` : ""} disabled />
            </div>
            <div>
              <Label htmlFor="sourceOfFunds">Source of Funds / Wealth *</Label>
              <Input
                id="sourceOfFunds"
                placeholder="e.g. Verified business equity, audited dividend returns"
                value={eddSourceOfFunds}
                onChange={(e) => setEddSourceOfFunds(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="approvedBy">Named Senior Approver *</Label>
              <Input
                id="approvedBy"
                placeholder="e.g. Head of Compliance - Dato Rahman"
                value={eddApprovedBy}
                onChange={(e) => setEddApprovedBy(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="eddNotes">Compliance Notes</Label>
              <Textarea
                id="eddNotes"
                placeholder="Additional audit trail notes..."
                value={eddNotes}
                onChange={(e) => setEddNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEddModal(false)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleEddApprove}>
              Submit EDD Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
