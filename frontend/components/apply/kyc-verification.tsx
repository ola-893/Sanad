"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Camera, Check, FileText, Loader2, ScanFace, Upload } from "lucide-react"

interface KYCVerificationProps {
  nextStep: () => void;
}

const idTypes = {
  nin: { label: "NIN Number", placeholder: "e.g., 12345678901" },
  passport: { label: "Passport Number", placeholder: "e.g., A01234567" },
  license: { label: "License Number", placeholder: "e.g., ABC1234567" },
} as const

type IdType = keyof typeof idTypes

export function KYCVerification({ nextStep }: KYCVerificationProps) {
  const [step, setStep] = useState(1)
  const [idType, setIdType] = useState<IdType>("nin")
  const [idNumber, setIdNumber] = useState("")
  const [idFrontUploaded, setIdFrontUploaded] = useState(false)
  const [idBackUploaded, setIdBackUploaded] = useState(false)
  const [selfieUploaded, setSelfieUploaded] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)

  useEffect(() => {
    if (localStorage.getItem("--step-1-completed") === "true") {
      console.log("Step 1 completed")
      setStep(3);
      setSelfieUploaded(true);
      setIdFrontUploaded(true);
      setIdBackUploaded(true);
      setVerificationComplete(true);
    }
  }, []);

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1)
      setVerificationComplete(false);
    } else {
      // Simulate verification process
      setVerificationComplete(true);
      localStorage.setItem("--step-1-completed", "true")
      nextStep();
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

  const primaryBtn =
    "rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-50"
  const outlineBtn = "rounded-full border-[#171414]/15 text-[#171414] hover:bg-white/60"

  return (
    <div className="space-y-6">
      <Tabs value={`step-${step}`} className="w-full">
        <TabsContent value="step-1" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" placeholder="Enter your first name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" placeholder="Enter your last name" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+234 801 234 5678" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="Enter your address" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="e.g., Abuja" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="e.g., FCT" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal-code">Postal Code</Label>
              <Input id="postal-code" placeholder="e.g., 900001" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleNextStep} className={primaryBtn}>
              Next Step
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="step-2" className="space-y-4 pt-4">
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
                          uploaded ? "border-success/40 bg-success/5" : "border-[#171414]/20 bg-white/40"
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
                      <Button variant="outline" className={outlineBtn} onClick={() => handleIdUpload(side)} disabled={uploaded}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload {side === "front" ? "Front" : "Back"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" className={outlineBtn} onClick={handlePrevStep}>
              Previous Step
            </Button>
            <Button
              onClick={handleNextStep}
              className={primaryBtn}
              disabled={!idFrontUploaded || !idBackUploaded || !idNumber}
            >
              Next Step
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="step-3" className="space-y-4 pt-4">
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
                  <Button variant="outline" className={outlineBtn} onClick={handleSelfieUpload} disabled={selfieUploaded}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                  <Button variant="outline" className={outlineBtn} onClick={handleSelfieUpload} disabled={selfieUploaded}>
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
                      Your identity has been verified. You can now proceed to the next step.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" className={outlineBtn} onClick={handlePrevStep}>
              Previous Step
            </Button>
            <Button onClick={handleNextStep} className={primaryBtn} disabled={!selfieUploaded}>
              {verificationComplete ? "Complete Verification" : "Verify Identity"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
