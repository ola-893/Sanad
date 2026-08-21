"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAtomValue } from "jotai"
import { userAtom } from "@/store/atoms"
import apiInstance from "@/lib/axios-v1"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Clock,
  Shield,
  Save,
  Loader2,
} from "lucide-react"

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nassarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
] as const

const SERVICES = [
  "Gold Pawning",
  "Silver Pawning",
  "Diamond Pawning",
  "Jewelry Valuation",
  "Buy-Back Services",
  "Gold Bar Sales",
  "Investment Consultation",
  "Shariah-Compliant Financing",
] as const

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const

const DEFAULT_HOURS = {
  monday:    { open: "09:00", close: "17:00", closed: false },
  tuesday:   { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday:  { open: "09:00", close: "17:00", closed: false },
  friday:    { open: "09:00", close: "17:00", closed: false },
  saturday:  { open: "09:00", close: "13:00", closed: false },
  sunday:    { open: "09:00", close: "17:00", closed: true },
}

const GLASS = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"
const INPUT_CLASS = "rounded-xl border-[#171414]/15 bg-[#FAFAF8] focus-visible:ring-[#E1BAC2]"
const LABEL_CLASS = "text-[10px] font-mono uppercase tracking-wider text-[#4A4A4A]"

interface PawnshopProfile {
  id?: string
  walletAddress: string
  businessName: string
  businessRegistrationNo: string
  licenseNumber: string
  licenseExpiry: string
  businessType: string
  yearEstablished: string
  branchCount: number
  businessPhone: string
  businessEmail: string
  website: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  latitude: number | null
  longitude: number | null
  servicesOffered: string[]
  operatingHours: Record<string, { open: string; close: string; closed: boolean }>
  kycStatus: string
}

const EMPTY_PROFILE: PawnshopProfile = {
  walletAddress: "",
  businessName: "",
  businessRegistrationNo: "",
  licenseNumber: "",
  licenseExpiry: "",
  businessType: "ar-rahnu",
  yearEstablished: "",
  branchCount: 1,
  businessPhone: "",
  businessEmail: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  latitude: null,
  longitude: null,
  servicesOffered: [],
  operatingHours: DEFAULT_HOURS,
  kycStatus: "pending",
}

const KYC_COLORS: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
}

export default function PawnshopProfilePage() {
  const user = useAtomValue(userAtom)
  const walletAddress = user?.wallet?.address || ""
  const queryClient = useQueryClient()
  const [form, setForm] = useState<PawnshopProfile>({ ...EMPTY_PROFILE, walletAddress })

  const { data: profile, isLoading } = useQuery({
    queryKey: ["pawnshop-profile"],
    queryFn: async (): Promise<PawnshopProfile> => {
      const { data } = await apiInstance.get("/pawnshop/profile")
      return data.data || data
    },
    enabled: !!walletAddress,
  })

  useEffect(() => {
    if (profile) {
      setForm({
        ...EMPTY_PROFILE,
        ...profile,
        walletAddress: profile.walletAddress || walletAddress,
        servicesOffered: profile.servicesOffered || [],
        operatingHours: { ...DEFAULT_HOURS, ...(profile.operatingHours || {}) },
      })
    } else if (walletAddress) {
      setForm((prev) => ({ ...prev, walletAddress }))
    }
  }, [profile, walletAddress])

  const mutation = useMutation({
    mutationFn: async (payload: PawnshopProfile) => {
      const { data } = await apiInstance.patch("/pawnshop/profile", payload)
      return data
    },
    onSuccess: () => {
      toast.success("Profile saved successfully")
      queryClient.invalidateQueries({ queryKey: ["pawnshop-profile"] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save profile")
    },
  })

  const handleField = (field: keyof PawnshopProfile, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddressField = (field: keyof PawnshopProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleService = (service: string) => {
    setForm((prev) => ({
      ...prev,
      servicesOffered: prev.servicesOffered.includes(service)
        ? prev.servicesOffered.filter((s) => s !== service)
        : [...prev.servicesOffered, service],
    }))
  }

  const handleHours = (day: string, field: "open" | "close" | "closed", value: any) => {
    setForm((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: { ...prev.operatingHours[day], [field]: value },
      },
    }))
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }))
        toast.success("Location detected")
      },
      () => {
        toast.error("Unable to retrieve location")
      }
    )
  }

  const handleSave = () => {
    if (!form.businessName.trim()) {
      toast.error("Business name is required")
      return
    }
    mutation.mutate(form)
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg bg-[#171414]/5 animate-pulse" />
            <div className="h-4 w-64 rounded-lg bg-[#171414]/5 animate-pulse" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className={GLASS}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-5 w-32 rounded bg-[#171414]/5 animate-pulse" />
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map((j) => (
                      <div key={j} className="space-y-2">
                        <div className="h-3 w-16 rounded bg-[#171414]/5 animate-pulse" />
                        <div className="h-10 w-full rounded-xl bg-[#171414]/5 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#E1BAC2]">Pawnshop Portal</p>
          <h1 className="text-3xl font-display font-bold text-[#171414]">Business Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Ar-Rahnu branch details
          </p>
        </div>

        {/* KYC Status */}
        <Card className={`${GLASS} border-l-4 ${
          form.kycStatus === "approved" ? "border-l-emerald-400" :
          form.kycStatus === "rejected" ? "border-l-red-400" : "border-l-amber-400"
        }`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]/20">
                  <Shield className="h-5 w-5 text-[#171414]" />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">KYC Status</p>
                  <p className="text-sm font-medium text-[#171414] capitalize">{form.kycStatus}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] font-mono ${KYC_COLORS[form.kycStatus] || ""}`}>
                {form.kycStatus}
              </Badge>
            </div>
            {form.kycStatus === "pending" && (
              <p className="mt-3 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
                Submit your business documents for verification
              </p>
            )}
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card className={GLASS}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-[#171414]">
              <Building2 className="h-4 w-4 text-[#E1BAC2]" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Business Name</Label>
                <Input
                  value={form.businessName}
                  onChange={(e) => handleField("businessName", e.target.value)}
                  placeholder="e.g., Ar-Rahnu Emas Sdn Bhd"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Business Registration No</Label>
                <Input
                  value={form.businessRegistrationNo}
                  onChange={(e) => handleField("businessRegistrationNo", e.target.value)}
                  placeholder="e.g., 202101-000123"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>License Number</Label>
                <Input
                  value={form.licenseNumber}
                  onChange={(e) => handleField("licenseNumber", e.target.value)}
                  placeholder="e.g., AR-2024-001"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>License Expiry</Label>
                <Input
                  type="date"
                  value={form.licenseExpiry}
                  onChange={(e) => handleField("licenseExpiry", e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Business Type</Label>
                <Select value={form.businessType} onValueChange={(v) => handleField("businessType", v)}>
                  <SelectTrigger className={INPUT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar-rahnu">Ar-Rahnu</SelectItem>
                    <SelectItem value="gold-dealer">Gold Dealer</SelectItem>
                    <SelectItem value="pawnbroker">Pawnbroker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Year Established</Label>
                <Input
                  value={form.yearEstablished}
                  onChange={(e) => handleField("yearEstablished", e.target.value)}
                  placeholder="e.g., 2015"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Branch Count</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.branchCount}
                  onChange={(e) => handleField("branchCount", parseInt(e.target.value) || 1)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className={GLASS}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-[#171414]">
              <Phone className="h-4 w-4 text-[#E1BAC2]" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Business Phone</Label>
                <Input
                  value={form.businessPhone}
                  onChange={(e) => handleField("businessPhone", e.target.value)}
                  placeholder="e.g., +60 3-1234 5678"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Business Email</Label>
                <Input
                  type="email"
                  value={form.businessEmail}
                  onChange={(e) => handleField("businessEmail", e.target.value)}
                  placeholder="e.g., info@arahnu.com"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => handleField("website", e.target.value)}
                  placeholder="e.g., https://arahnu.com"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className={GLASS}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-[#171414]">
              <MapPin className="h-4 w-4 text-[#E1BAC2]" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className={LABEL_CLASS}>Address Line 1</Label>
              <Input
                value={form.addressLine1}
                onChange={(e) => handleAddressField("addressLine1", e.target.value)}
                placeholder="Street address"
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label className={LABEL_CLASS}>Address Line 2</Label>
              <Input
                value={form.addressLine2}
                onChange={(e) => handleAddressField("addressLine2", e.target.value)}
                placeholder="Building, unit, floor (optional)"
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => handleAddressField("city", e.target.value)}
                  placeholder="e.g., Kuala Lumpur"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>State</Label>
                <Select value={form.state} onValueChange={(v) => handleAddressField("state", v)}>
                  <SelectTrigger className={INPUT_CLASS}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Postal Code</Label>
                <Input
                  value={form.postalCode}
                  onChange={(e) => handleAddressField("postalCode", e.target.value)}
                  placeholder="e.g., 50450"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={LABEL_CLASS}>Latitude</Label>
                  <Input
                    value={form.latitude ?? ""}
                    onChange={(e) => handleField("latitude", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="3.139"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={LABEL_CLASS}>Longitude</Label>
                  <Input
                    value={form.longitude ?? ""}
                    onChange={(e) => handleField("longitude", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="101.686"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={detectLocation}
                className="rounded-xl gap-2 shrink-0"
              >
                <MapPin className="h-4 w-4" />
                Auto-Detect
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card className={GLASS}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-[#171414]">
              <Globe className="h-4 w-4 text-[#E1BAC2]" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SERVICES.map((service) => {
                const active = form.servicesOffered.includes(service)
                return (
                  <div
                    key={service}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleService(service)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleService(service) }}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors cursor-pointer ${
                      active
                        ? "border-[#E1BAC2] bg-[#E1BAC2]/15 text-[#171414]"
                        : "border-[#171414]/10 bg-[#FAFAF8] text-muted-foreground hover:bg-[#171414]/5"
                    }`}
                  >
                    <span>{service}</span>
                    <Switch
                      checked={active}
                      onCheckedChange={() => toggleService(service)}
                      className="pointer-events-none"
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card className={GLASS}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-[#171414]">
              <Clock className="h-4 w-4 text-[#E1BAC2]" />
              Operating Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day) => {
              const hours = form.operatingHours[day] || { open: "09:00", close: "17:00", closed: true }
              return (
                <div key={day} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-medium capitalize text-[#171414]">{day}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Switch
                      checked={!hours.closed}
                      onCheckedChange={(checked) => handleHours(day, "closed", !checked)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                    {!hours.closed ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => handleHours(day, "open", e.target.value)}
                          className={`${INPUT_CLASS} w-32 text-xs`}
                        />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => handleHours(day, "close", e.target.value)}
                          className={`${INPUT_CLASS} w-32 text-xs`}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Closed</span>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-8">
          <Button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="rounded-xl gap-2 bg-[#171414] text-[#E1BAC2] hover:bg-black px-8"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {mutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>
  )
}
