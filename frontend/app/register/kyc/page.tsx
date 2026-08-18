"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Check, FileText, Loader2, ScanFace, Upload, User } from "lucide-react"

const idTypes = {
  nin: { label: "NIN Number", placeholder: "e.g., 12345678901" },
  passport: { label: "Passport Number", placeholder: "e.g., A01234567" },
  license: { label: "License Number", placeholder: "e.g., ABC1234567" },
} as const

type IdType = keyof typeof idTypes

export default function KycVerificationPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    dateOfBirth: "",
    nationality: "Nigeria",
  })

  // ID Verification
  const [idType, setIdType] = useState<IdType>("nin")
  const [idNumber, setIdNumber] = useState("")
  const [idFrontUploaded, setIdFrontUploaded] = useState(false)
  const [idBackUploaded, setIdBackUploaded] = useState(false)

  // Facial Verification
  const [selfieUploaded, setSelfieUploaded] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPersonalInfo({
      ...personalInfo,
      [name]: value,
    })
  }

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      // Simulate verification process
      setIsLoading(true)
      setTimeout(() => {
        setIsLoading(false)
        setVerificationComplete(true)
      }, 2000)
    }
  }

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleIdUpload = (side: "front" | "back") => {
    if (side === "front") {
      setIdFrontUploaded(true)
    } else {
      setIdBackUploaded(true)
    }
  }

  const handleSelfieUpload = () => {
    setSelfieUploaded(true)
  }

  const handleComplete = () => {
    router.push("/dashboard")
  }

  const stepCircle = (n: number, done: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm transition-colors ${
      done || step > n
        ? "bg-[#171414] text-[#E1BAC2]"
        : step === n
          ? "border border-[#171414] bg-[#171414] text-[#E1BAC2]"
          : "border border-[#171414]/15 bg-white/60 text-muted-foreground"
    }`

  return (
    <div className="container max-w-4xl px-4 py-14 md:px-6">
      <div className="mb-10 flex flex-col items-center justify-center text-center">
        <p className="kicker-gold">Identity Verification</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">KYC Verification</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Complete your identity verification to access all features of Sanad.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-10">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#171414]/15"></div>
          </div>
          <div className="relative flex justify-between">
            <div className="flex flex-col items-center">
              <div className={stepCircle(1, step > 1)}>{step > 1 ? <Check className="h-5 w-5" /> : "1"}</div>
              <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#4A4A4A]">Personal Info</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={stepCircle(2, step > 2)}>{step > 2 ? <Check className="h-5 w-5" /> : "2"}</div>
              <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#4A4A4A]">ID Verification</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={stepCircle(3, verificationComplete)}>
                {verificationComplete ? <Check className="h-5 w-5" /> : "3"}
              </div>
              <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#4A4A4A]">Facial Verification</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
        <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
          <CardTitle className="font-display">
            {step === 1 ? "Personal Information" : step === 2 ? "ID Verification" : "Facial Verification"}
          </CardTitle>
          <CardDescription className="text-[#4A4A4A]">
            {step === 1
              ? "Provide your personal details"
              : step === 2
                ? "Upload your identification documents"
                : "Complete facial verification for security"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="Enter your first name"
                    value={personalInfo.firstName}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Enter your last name"
                    value={personalInfo.lastName}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={personalInfo.email}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+234 801 234 5678"
                    value={personalInfo.phone}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Enter your address"
                  value={personalInfo.address}
                  onChange={handlePersonalInfoChange}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="e.g., Abuja"
                    value={personalInfo.city}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    placeholder="e.g., FCT"
                    value={personalInfo.state}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    placeholder="e.g., 900001"
                    value={personalInfo.postalCode}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={personalInfo.dateOfBirth}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Select
                    value={personalInfo.nationality}
                    onValueChange={(value) => setPersonalInfo({ ...personalInfo, nationality: value })}
                  >
                    <SelectTrigger id="nationality">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nigeria">Nigeria</SelectItem>
                      <SelectItem value="Malaysia">Malaysia</SelectItem>
                      <SelectItem value="Indonesia">Indonesia</SelectItem>
                      <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                      <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ID Type</Label>
                <RadioGroup
                  value={idType}
                  onValueChange={(v) => setIdType(v as IdType)}
                  className="grid grid-cols-1 gap-2 md:grid-cols-3"
                >
                  <div className="flex items-center space-x-2 rounded-2xl border border-[#171414]/15 bg-white/50 p-3 has-[[data-state=checked]]:border-[#171414] has-[[data-state=checked]]:bg-white/80">
                    <RadioGroupItem value="nin" id="nin" />
                    <Label htmlFor="nin" className="cursor-pointer">NIN (National ID)</Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-2xl border border-[#171414]/15 bg-white/50 p-3 has-[[data-state=checked]]:border-[#171414] has-[[data-state=checked]]:bg-white/80">
                    <RadioGroupItem value="passport" id="passport" />
                    <Label htmlFor="passport" className="cursor-pointer">International Passport</Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-2xl border border-[#171414]/15 bg-white/50 p-3 has-[[data-state=checked]]:border-[#171414] has-[[data-state=checked]]:bg-white/80">
                    <RadioGroupItem value="license" id="license" />
                    <Label htmlFor="license" className="cursor-pointer">Driver&apos;s License</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="id-number">{idTypes[idType].label}</Label>
                <Input
                  id="id-number"
                  placeholder={idTypes[idType].placeholder}
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(["front", "back"] as const).map((side) => {
                  const uploaded = side === "front" ? idFrontUploaded : idBackUploaded
                  return (
                    <div key={side} className="rounded-2xl border border-[#171414]/10 bg-white/50 p-4">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div
                          className={`flex h-40 w-full items-center justify-center rounded-2xl border-2 border-dashed ${
                            uploaded
                              ? "border-success/40 bg-success/5"
                              : "border-[#171414]/20 bg-white/40"
                          }`}
                        >
                          {uploaded ? (
                            <div className="flex flex-col items-center gap-2">
                              <Check className="h-10 w-10 text-success" />
                              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                                {side} uploaded
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-10 w-10 text-muted-foreground" />
                              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                                {side} of ID
                              </p>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-full border-[#171414]/15 text-[#171414] hover:bg-white/60"
                          onClick={() => handleIdUpload(side)}
                          disabled={uploaded}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload {side === "front" ? "Front" : "Back"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-full max-w-md rounded-2xl border border-[#171414]/10 bg-white/50 p-4">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div
                    className={`flex h-64 w-full items-center justify-center rounded-2xl border-2 border-dashed ${
                      selfieUploaded ? "border-success/40 bg-success/5" : "border-[#171414]/20 bg-white/40"
                    }`}
                  >
                    {selfieUploaded ? (
                      <div className="flex flex-col items-center gap-2">
                        <Check className="h-16 w-16 text-success" />
                        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          Selfie uploaded
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <ScanFace className="h-16 w-16 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Take a selfie or upload a photo</p>
                        <p className="text-xs text-muted-foreground">Make sure your face is clearly visible</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="rounded-full border-[#171414]/15 text-[#171414] hover:bg-white/60"
                      onClick={handleSelfieUpload}
                      disabled={selfieUploaded}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full border-[#171414]/15 text-[#171414] hover:bg-white/60"
                      onClick={handleSelfieUpload}
                      disabled={selfieUploaded}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                  </div>

                  {selfieUploaded && !verificationComplete && (
                    <div className="mt-2 flex items-center gap-2 text-center">
                      <Loader2 className="h-4 w-4 animate-spin text-[#4A4A4A]" />
                      <p className="text-sm text-muted-foreground">Our AI system is verifying your identity...</p>
                    </div>
                  )}

                  {verificationComplete && (
                    <div className="mt-2 space-y-2 text-center">
                      <div className="flex items-center justify-center">
                        <Check className="h-8 w-8 text-success" />
                      </div>
                      <p className="font-medium text-success">Verification Successful!</p>
                      <p className="text-sm text-muted-foreground">
                        Your identity has been verified. You can now proceed to your dashboard.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between p-6">
          {step > 1 ? (
            <Button
              variant="outline"
              className="rounded-full border-[#171414]/15 text-[#171414] hover:bg-white/60"
              onClick={handlePrevStep}
            >
              Previous Step
            </Button>
          ) : (
            <div></div>
          )}

          {verificationComplete ? (
            <Button
              onClick={handleComplete}
              className="rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black"
            >
              Go to Dashboard
            </Button>
          ) : (
            <Button
              onClick={handleNextStep}
              className="rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-50"
              disabled={
                (step === 1 &&
                  (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.email || !personalInfo.phone)) ||
                (step === 2 && (!idNumber || !idFrontUploaded || !idBackUploaded)) ||
                (step === 3 && !selfieUploaded) ||
                isLoading
              }
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : step === 3 ? (
                "Complete Verification"
              ) : (
                "Next Step"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
