"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { toast } from "sonner"
import {
  Store,
  ChevronRight,
  ChevronLeft,
  Gem,
  Weight,
  Sparkles,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Send,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface Pawnshop {
  userId: string
  firstName: string
  lastName: string
  walletId: string
}

const ASSET_TYPES = ["Gold", "Silver", "Diamond"]
const KARAT_OPTIONS = [18, 22, 24]

export default function BorrowerApplyPage() {
  const router = useRouter()
  const { walletAddress } = useWalletAuth()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Pawnshop data
  const [pawnshops, setPawnshops] = useState<Pawnshop[]>([])
  const [selectedPawnshop, setSelectedPawnshop] = useState<string>("")

  // Gold details
  const [assetType, setAssetType] = useState("Gold")
  const [karat, setKarat] = useState<number>(22)
  const [weightG, setWeightG] = useState("")
  const [purity, setPurity] = useState("999")
  const [estimatedValue, setEstimatedValue] = useState("")
  const [description, setDescription] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")

  useEffect(() => {
    apiInstance
      .get("/pledge-requests/pawnshops")
      .then((res) => setPawnshops(res.data.data || []))
      .catch(() => setPawnshops([]))
  }, [])

  const selected = pawnshops.find((p) => p.userId === selectedPawnshop)

  const canProceedStep1 = !!selectedPawnshop
  const canProceedStep2 =
    assetType &&
    karat &&
    weightG &&
    Number(weightG) > 0 &&
    purity &&
    Number(purity) > 0 &&
    estimatedValue &&
    Number(estimatedValue) > 0

  const handleSubmit = async () => {
    if (!canProceedStep2 || !canProceedStep1) return
    setSubmitting(true)
    try {
      await apiInstance.post("/pledge-requests", {
        pawnshopId: selectedPawnshop,
        goldDetails: {
          assetType,
          karat,
          weightG: Number(weightG),
          purity: Number(purity),
          estimatedValue: Number(estimatedValue),
          description,
        },
        requestedAmount: requestedAmount || undefined,
      })
      setSubmitted(true)
      toast.success("Pledge request sent!", {
        description: "The pawnshop owner will review your request.",
      })
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <ProtectedRoute requiredRole="borrower">
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/borrower")}
              className="gap-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Card className={glass}>
              <CardContent className="p-12 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-display font-bold text-[#171414]">
                  Request Sent Successfully
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your gold pledge request has been sent to{" "}
                  <span className="font-medium text-[#171414]">
                    {selected?.firstName} {selected?.lastName}
                  </span>.
                  They will review your details and respond shortly.
                </p>
                <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4 max-w-sm mx-auto text-left">
                  <p className="text-xs font-medium text-[#171414] mb-2">What happens next:</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Pawnshop reviews your gold details</li>
                    <li>You meet physically for gold assessment</li>
                    <li>If approved, funds are disbursed to your wallet</li>
                    <li>SAG NFT is minted as collateral record</li>
                  </ol>
                </div>
                <Button
                  onClick={() => router.push("/dashboard/borrower")}
                  className="mt-4 rounded-full bg-[#171414] text-[#E1BAC2] hover:bg-black"
                >
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="borrower">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/borrower")}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          {/* Header */}
          <div>
            <p className="kicker-gold">Apply for Loan</p>
            <h1 className="text-3xl font-display font-bold text-[#171414]">
              Pledge Your Gold
            </h1>
            <p className="text-muted-foreground mt-1">
              Select a pawnshop and submit your gold details for financing
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    s < step
                      ? "bg-emerald-500 text-white"
                      : s === step
                      ? "bg-[#171414] text-[#E1BAC2]"
                      : "bg-[#171414]/10 text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                <span className={`text-xs font-medium ${s === step ? "text-[#171414]" : "text-muted-foreground"}`}>
                  {s === 1 ? "Select Pawnshop" : s === 2 ? "Gold Details" : "Review"}
                </span>
                {s < 3 && <div className="flex-1 h-px bg-[#171414]/10" />}
              </div>
            ))}
          </div>

          {/* Step 1: Select Pawnshop */}
          {step === 1 && (
            <Card className={glass}>
              <CardHeader>
                <p className="kicker-gold">Step 1</p>
                <CardTitle className="font-display">Select a Pawnshop</CardTitle>
                <CardDescription>
                  Choose the Ar-Rahnu pawnshop where you want to pledge your gold
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pawnshops.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No pawnshops available at the moment
                  </div>
                ) : (
                  pawnshops.map((p) => (
                    <button
                      key={p.userId}
                      onClick={() => setSelectedPawnshop(p.userId)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        selectedPawnshop === p.userId
                          ? "border-[#E1BAC2] bg-[#E1BAC2]/10 shadow-md"
                          : "border-[#171414]/10 bg-white/40 hover:bg-white/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            selectedPawnshop === p.userId ? "bg-[#E1BAC2]" : "bg-[#F5F5F3]"
                          }`}
                        >
                          <Store className={`h-5 w-5 ${selectedPawnshop === p.userId ? "text-[#171414]" : "text-[#4A4A4A]"}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#171414]">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {p.walletId.slice(0, 6)}...{p.walletId.slice(-4)}
                          </p>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 ${
                            selectedPawnshop === p.userId ? "text-[#E1BAC2]" : "text-transparent"
                          }`}
                        />
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Gold Details */}
          {step === 2 && (
            <Card className={glass}>
              <CardHeader>
                <p className="kicker-gold">Step 2</p>
                <CardTitle className="font-display">Gold Details</CardTitle>
                <CardDescription>
                  Provide details about the gold you want to pledge
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Asset Type + Karat */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
                      Asset Type
                    </Label>
                    <Select value={assetType} onValueChange={setAssetType}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
                      Karat
                    </Label>
                    <Select value={String(karat)} onValueChange={(v) => setKarat(Number(v))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KARAT_OPTIONS.map((k) => (
                          <SelectItem key={k} value={String(k)}>{k}K</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Weight + Purity */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
                      Weight (grams)
                    </Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="e.g. 25.5"
                        value={weightG}
                        onChange={(e) => setWeightG(e.target.value)}
                        className="rounded-xl pl-10"
                        min="0.1"
                        step="0.1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
                      Purity (max 999)
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 999"
                      value={purity}
                      onChange={(e) => setPurity(e.target.value)}
                      className="rounded-xl"
                      min="1"
                      max="999"
                    />
                  </div>
                </div>

                {/* Estimated Value + Requested Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
                      Estimated Value (MYR)
                    </Label>
                    <div className="relative">
                      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="e.g. 15000"
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(e.target.value)}
                        className="rounded-xl pl-10"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
                      Requested Loan Amount (MYR)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">RM</span>
                      <Input
                        type="number"
                        placeholder="e.g. 10000"
                        value={requestedAmount}
                        onChange={(e) => setRequestedAmount(e.target.value)}
                        className="rounded-xl pl-10"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
                    Additional Notes
                  </Label>
                  <Textarea
                    placeholder="Any additional details about your gold item (e.g., brand, jewelry type, condition)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <Card className={glass}>
              <CardHeader>
                <p className="kicker-gold">Step 3</p>
                <CardTitle className="font-display">Review Your Request</CardTitle>
                <CardDescription>
                  Confirm the details before sending to the pawnshop
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pawnshop */}
                <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Pawnshop
                  </p>
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-[#171414]" />
                    <span className="text-sm font-medium text-[#171414]">
                      {selected?.firstName} {selected?.lastName}
                    </span>
                  </div>
                </div>

                {/* Gold Details */}
                <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    Gold Details
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      <span className="font-medium text-[#171414]">{assetType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Karat:</span>{" "}
                      <span className="font-medium text-[#171414]">{karat}K</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weight:</span>{" "}
                      <span className="font-medium text-[#171414]">{weightG}g</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Purity:</span>{" "}
                      <span className="font-medium text-[#171414]">{purity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estimated Value:</span>{" "}
                      <span className="font-medium text-[#171414]">
                        {Number(estimatedValue).toLocaleString()} MYR
                      </span>
                    </div>
                    {requestedAmount && (
                      <div>
                        <span className="text-muted-foreground">Requested Loan:</span>{" "}
                        <span className="font-medium text-[#171414]">
                          {Number(requestedAmount).toLocaleString()} MYR
                        </span>
                      </div>
                    )}
                  </div>
                  {description && (
                    <div className="mt-3 pt-3 border-t border-[#171414]/10">
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  )}
                </div>

                {/* Disclaimer */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs text-amber-800">
                    <strong>Important:</strong> After the pawnshop accepts this request, you will need to
                    meet physically for gold assessment. The loan will only be disbursed after the pawnshop
                    verifies the gold in person.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="rounded-xl gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                className="rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black gap-2"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? "Sending..." : "Send Request"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
