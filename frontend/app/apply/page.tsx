"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JewelrySubmission } from "@/components/apply/jewelry-submission"
import { KYCVerification } from "@/components/apply/kyc-verification"
import { WalletConnection } from "@/components/apply/wallet-connection"
import { LoanOffer } from "@/components/apply/loan-offer"
import { Stepper } from "@/components/apply/stepper"

const steps = [
  "kyc",
  "jewelry",
  "wallet",
  "offer",
]

export default function ApplyPage() {

  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => prev - 1);
  }, [])

  useEffect(() => {
    if (currentStep === 3) {
      nextStep();
    }

    console.log("currentStep", currentStep);
  }, [currentStep, nextStep])

  return (
    <div className="container mx-auto px-4 py-10 md:px-6">
      <div className="mb-10 border-b border-[#171414]/15 pb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#171414]/20 bg-white/35 px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#171414]">
          <span className="h-1.5 w-1.5 rotate-45 bg-[#E1BAC2]" aria-hidden />
          Application
        </span>
        <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-[#171414]">
          Apply for
          <br />
          <span className="font-semibold text-[#4A4A4A]">financing.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Complete the following steps to apply for Shariah-compliant gold financing. Our AI-assisted
          system will evaluate your gold and provide you with an offer.
        </p>
      </div>

      <Stepper currentStep={currentStep} />

      <Tabs defaultValue={`apply-step-${currentStep}`} className="mt-8" key={`apply-step-${currentStep}`}>
        {/* <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
          <TabsTrigger value="jewelry">Jewelry Submission</TabsTrigger>
          <TabsTrigger value="wallet">Wallet Connection</TabsTrigger>
          <TabsTrigger value="offer">Loan Offer</TabsTrigger>
        </TabsList> */}

        <TabsContent value={`apply-step-1`} >
          <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
            <CardHeader>
              <CardTitle>KYC Verification</CardTitle>
              <CardDescription>Verify your identity to proceed with your financing application.</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading KYC verification...</div>}>
                <KYCVerification nextStep={nextStep} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={`apply-step-2`} >
          <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
            <CardHeader>
              <CardTitle>Jewelry Submission</CardTitle>
              <CardDescription>Upload images and details of your jewelry for AI-powered assessment.</CardDescription>
            </CardHeader>
            <CardContent>
              <JewelrySubmission nextStep={nextStep} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={`apply-step-3`} >
          <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
            <CardHeader>
              <CardTitle>Wallet Connection</CardTitle>
              <CardDescription>Connect your wallet to receive financing and make repayments.</CardDescription>
            </CardHeader>
            <CardContent>
              <WalletConnection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={`apply-step-4`} >
          <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
            <CardHeader>
              <CardTitle>Loan Offer</CardTitle>
              <CardDescription>Review and accept your financing offer.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoanOffer />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
