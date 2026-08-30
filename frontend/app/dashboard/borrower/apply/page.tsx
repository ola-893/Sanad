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
  Shield,
  Link2,
  ExternalLink,
  Upload,
  X,
  CreditCard,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

interface Pawnshop {
  userId: string
  firstName: string
  lastName: string
  walletId: string
  businessName?: string
  businessRegistrationNo?: string
  licenseNumber?: string
  businessType?: string
  yearEstablished?: string
  city?: string
  state?: string
  country?: string
  businessPhone?: string
  businessEmail?: string
  servicesOffered?: string[]
  operatingHours?: Record<string, string>
  kycStatus?: string
  branchCount?: string
  addressLine1?: string
}

interface CreditProfile {
  score: number
  tier: string
  provenEventsCount: number
  cleanRepaymentCount: number
  liquidationCount: number
  defaultCount: number
  provenEvents: Array<{
    sourceTxHash: string
    blockHeight: number
    protocol: string
    eventType: string
    volumeUSD: string
    timestamp: number
    cc3TxHash?: string
  }>
}

const ASSET_TYPES = ["Gold", "Silver", "Diamond"]
const KARAT_OPTIONS = [18, 22, 24]

const PROTOCOL_NAMES: Record<number, string> = {
  0: "Aave v3", 1: "Compound v3", 2: "Morpho Blue", 3: "Spark Protocol",
  4: "MakerDAO", 5: "Euler v2", 6: "Fluid", 7: "Maple Finance",
  8: "Goldfinch", 9: "Fraxlend",
}

const EVENT_TYPE_NAMES: Record<number, string> = {
  0: "Clean Repayment", 1: "Liquidation", 2: "Default",
  3: "Collateral Supply", 4: "Active Borrow",
}

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

  // Gold images - store both preview URLs (blob) and server URLs
  const [goldImages, setGoldImages] = useState<string[]>([])
  const [goldImagePreviews, setGoldImagePreviews] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Borrower credit profile (auto-fetched)
  const [creditProfile, setCreditProfile] = useState<CreditProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Fetch pawnshops
  useEffect(() => {
    apiInstance
      .get("/pledge-requests/pawnshops")
      .then((res) => setPawnshops(res.data.data || []))
      .catch(() => setPawnshops([]))
  }, [])

  // V2: Auto-fetch borrower credit profile
  useEffect(() => {
    if (!walletAddress) return
    setLoadingProfile(true)
    apiInstance.get(`/credit-oracle/profile/${walletAddress}`)
      .then((res) => setCreditProfile(res.data?.data || null))
      .catch(() => setCreditProfile(null))
      .finally(() => setLoadingProfile(false))
  }, [walletAddress])

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

  // Handle gold image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    try {
      // Create preview URLs immediately from file objects
      const previews: string[] = []
      for (let i = 0; i < files.length; i++) {
        previews.push(URL.createObjectURL(files[i]))
      }
      setGoldImagePreviews((prev) => [...prev, ...previews])

      // Upload to server in background
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append("images", files[i])
      }
      const res = await apiInstance.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const urls = res.data?.data?.files?.map((f: any) => f.url) || []
      setGoldImages((prev) => [...prev, ...urls])
      toast.success(`${urls.length} image(s) uploaded`)
    } catch {
      toast.error("Failed to upload images")
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = (index: number) => {
    // Revoke the blob URL to free memory
    if (goldImagePreviews[index]) {
      URL.revokeObjectURL(goldImagePreviews[index])
    }
    setGoldImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setGoldImages((prev) => prev.filter((_, i) => i !== index))
  }

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
        goldImages,
      })
      setSubmitted(true)
      toast.success("Pledge request sent!", {
        description: "The pawnshop owner will review your credit profile and gold details.",
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
                  </span>
                  . Your credit profile and DeFi history have been attached for review.
                </p>
                <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4 max-w-sm mx-auto text-left">
                  <p className="text-xs font-medium text-[#171414] mb-2">What happens next:</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Pawnshop reviews your credit profile and gold details</li>
                    <li>If interested, pawnshop shares their contact and location</li>
                    <li>You meet physically for gold assessment</li>
                    <li>Pawnshop verifies gold and records payment</li>
                    <li>SAG NFT is minted for investors to fund</li>
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
            {[1, 2, 3, 4].map((s) => (
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
                <span className={`text-xs font-medium hidden sm:inline ${s === step ? "text-[#171414]" : "text-muted-foreground"}`}>
                  {s === 1 ? "Select Pawnshop" : s === 2 ? "Gold Details" : s === 3 ? "Gold Photo" : "Review"}
                </span>
                {s < 4 && <div className="flex-1 h-px bg-[#171414]/10" />}
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
                      className={`w-full rounded-xl border p-5 text-left transition-all ${
                        selectedPawnshop === p.userId
                          ? "border-[#E1BAC2] bg-[#E1BAC2]/10 shadow-md"
                          : "border-[#171414]/10 bg-white/40 hover:bg-white/60"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            selectedPawnshop === p.userId ? "bg-[#E1BAC2]" : "bg-[#F5F5F3]"
                          }`}
                        >
                          <Store className={`h-6 w-6 ${selectedPawnshop === p.userId ? "text-[#171414]" : "text-[#4A4A4A]"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#171414]">
                            {p.businessName || `${p.firstName} ${p.lastName}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.firstName} {p.lastName}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {p.city && p.state && (
                              <span className="text-[11px] text-[#4A4A4A]">
                                {p.city}, {p.state}
                              </span>
                            )}
                            {p.yearEstablished && (
                              <span className="text-[11px] text-[#4A4A4A]">
                                Est. {p.yearEstablished}
                              </span>
                            )}
                          </div>
                          {p.servicesOffered && Array.isArray(p.servicesOffered) && p.servicesOffered.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(p.servicesOffered as string[]).slice(0, 3).map((s: string) => (
                                <span key={s} className="inline-block rounded-full bg-[#171414]/5 px-2 py-0.5 text-[10px] font-mono text-[#4A4A4A]">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                              p.kycStatus === "approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : p.kycStatus === "pending"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-50 text-slate-600 border border-slate-200"
                            }`}>
                              {p.kycStatus === "approved" ? "Verified" : p.kycStatus === "pending" ? "Pending KYC" : "Unverified"}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 mt-1 ${
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
                      Estimated Value (USD)
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
                      Requested Loan Amount (USD)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
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

          {/* Step 3: Gold Photo */}
          {step === 3 && (
            <Card className={glass}>
              <CardHeader>
                <p className="kicker-gold">Step 3</p>
                <CardTitle className="font-display">Gold Photo</CardTitle>
                <CardDescription>
                  Upload clear photos of the gold you want to pledge (helps the pawnshop preview before meeting)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image upload area */}
                <div className="rounded-2xl border-2 border-dashed border-[#171414]/15 bg-[#FAFAF8] p-8 text-center hover:border-[#E1BAC2]/50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="gold-image-upload"
                  />
                  <label htmlFor="gold-image-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      {uploadingImage ? (
                        <Loader2 className="h-8 w-8 text-[#E1BAC2] animate-spin" />
                      ) : (
                        <Upload className="h-8 w-8 text-[#171414]/30" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[#171414]">
                          {uploadingImage ? "Uploading..." : "Click to upload photos"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPEG, PNG or GIF. Max 5MB per file.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Uploaded images preview */}
                {goldImagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {goldImagePreviews.map((preview, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-[#171414]/10">
                        <img src={preview} alt={`Gold ${i + 1}`} className="w-full h-32 object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {goldImages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Optional but recommended -- pawnshops prefer to see the gold before agreeing to meet
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <Card className={glass}>
              <CardHeader>
                <p className="kicker-gold">Step 4</p>
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
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="h-4 w-4 text-[#171414]" />
                    <span className="text-sm font-medium text-[#171414]">
                      {selected?.businessName || `${selected?.firstName} ${selected?.lastName}`}
                    </span>
                    {selected?.kycStatus === "approved" && (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px]">Verified</Badge>
                    )}
                  </div>
                  {selected?.city && selected?.state && (
                    <p className="text-xs text-muted-foreground">{selected.city}, {selected.state}</p>
                  )}
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
                        ${Number(estimatedValue).toLocaleString()}
                      </span>
                    </div>
                    {requestedAmount && (
                      <div>
                        <span className="text-muted-foreground">Requested Loan:</span>{" "}
                        <span className="font-medium text-[#171414]">
                          ${Number(requestedAmount).toLocaleString()}
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

                {/* Gold Photos */}
                {goldImagePreviews.length > 0 && (
                  <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      Gold Photos ({goldImagePreviews.length})
                    </p>
                    <div className="flex gap-2 overflow-x-auto">
                      {goldImagePreviews.map((preview, i) => (
                        <img key={i} src={preview} alt={`Gold ${i + 1}`} className="h-20 w-20 rounded-lg object-cover shrink-0" />
                      ))}
                    </div>
                  </div>
                )}

                {/* V2: Credit Profile Summary (auto-attached) */}
                {creditProfile && (
                  <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      Your Credit Profile (auto-attached)
                    </p>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[#171414]" />
                        <span className="text-sm font-bold text-[#171414]">{creditProfile.score}/1000</span>
                      </div>
                      <Badge className="bg-[#171414]/5 text-[#171414] text-[9px]">{creditProfile.tier}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-muted-foreground">{creditProfile.cleanRepaymentCount} Repayments</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span className="text-muted-foreground">{creditProfile.liquidationCount} Liquidations</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Link2 className="h-3 w-3 text-[#E1BAC2]" />
                        <span className="text-muted-foreground">{creditProfile.provenEventsCount} Proven Events</span>
                      </div>
                    </div>
                    {creditProfile.provenEvents.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#171414]/10">
                        <p className="text-[10px] font-mono text-muted-foreground mb-2">Verified DeFi Events:</p>
                        <div className="space-y-1.5">
                          {creditProfile.provenEvents.slice(0, 3).map((evt, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px]">
                              <span className="text-muted-foreground">
                                {typeof evt.eventType === "number" ? EVENT_TYPE_NAMES[evt.eventType] : evt.eventType}
                              </span>
                              <span className="text-muted-foreground">on</span>
                              <span className="font-medium text-[#171414]">{evt.protocol}</span>
                              <span className="text-muted-foreground ml-auto font-mono">
                                {evt.cc3TxHash ? "CC3 Proven" : "Pending"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="mt-2 text-[9px] text-muted-foreground">
                      This profile is cryptographically proven via Attestcoin on Creditcoin CC3. The pawnshop can verify all transaction links.
                    </p>
                  </div>
                )}

                {loadingProfile && (
                  <div className="rounded-xl border border-[#171414]/10 bg-[#FAFAF8] p-4 flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[#E1BAC2]" />
                    <span className="text-xs text-muted-foreground">Loading your credit profile...</span>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs text-amber-800">
                    <strong>Important:</strong> After the pawnshop accepts this request, they will share their
                    contact details and location. You will need to meet physically for gold assessment.
                    The loan will only be disbursed after the pawnshop verifies the gold in person.
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
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? !canProceedStep1 : step === 2 ? !canProceedStep2 : false}
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
