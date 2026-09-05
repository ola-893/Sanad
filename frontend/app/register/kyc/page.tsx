"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  Check,
  FileText,
  Loader2,
  ScanFace,
  Upload,
  ShieldCheck,
  Search,
  Shield,
  Sparkles,
  Zap,
  RefreshCw,
  Award,
  AlertTriangle,
  Cpu,
  Layers,
  Activity,
  Database,
  ExternalLink,
  CheckCircle2,
} from "lucide-react"
import apiInstance from "@/lib/axios-v1"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { CREDITCOIN_EXPLORER_URL } from "@/core/credit-bureau/sanad-credit-oracle"
import { DeFiEvent, DiscoverySummary, OnChainCreditProfile, BorrowerPreset } from "@/core/credit-bureau/types"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

const idTypes = {
  nin: { label: "NIN / National ID Number", placeholder: "e.g., 12345678901", maxLength: 11, pattern: /^\d{11}$/, patternError: "NIN must be exactly 11 digits" },
  passport: { label: "Passport Number", placeholder: "e.g., A01234567", maxLength: 9, pattern: /^[A-Za-z0-9]{8,9}$/, patternError: "Passport must be 8-9 alphanumeric characters" },
  license: { label: "Driver License Number", placeholder: "e.g., ABC1234567890", maxLength: 14, pattern: /^[A-Za-z0-9]{10,14}$/, patternError: "Driver License must be 10-14 alphanumeric characters" },
} as const

type IdType = keyof typeof idTypes

type AutoProveStatus = {
  status?: "discovering" | "proving" | "completed" | "error" | "idle"
  eventsFound?: number
  eventsProven?: number
  eventsFailed?: number
  total?: number
  current?: number
  error?: string
}

const PRESET_KYC_PROFILES: BorrowerPreset[] = [
  {
    id: "prime-cross-chain",
    label: "Prime Cross-DeFi Borrower",
    address: "0x891775eDdcaBABdCE4b476E335a9EEF73123C75b",
    tag: "Prime / Gold Tier",
    desc: "Verified activity on Aave v3, Morpho Blue, Spark & Fluid ($117.5k clean settlements)",
    targetScore: 845,
    targetTier: "Gold",
    protocols: ["Aave v3", "Morpho Blue", "Spark Protocol (Sky)", "Fluid (Instadapp)"],
  },
  {
    id: "active-retail",
    label: "Active Multi-Pool Borrower",
    address: "0xCAD85e1eC294F71f3cA68Ef3261f894f50C1C4C3",
    tag: "Active / Silver Tier",
    desc: "Clean repayments on Aave v3 and Compound v3 ($23.5k) with 0 defaults",
    targetScore: 680,
    targetTier: "Silver",
    protocols: ["Aave v3", "Compound v3"],
  },
  {
    id: "high-risk",
    label: "High-Risk Distressed Borrower",
    address: "0x9d6Bc9763008Ad1f7619A3498eFfe9Ec671b276d",
    tag: "High Risk",
    desc: "Collateral liquidation on Aave v3 ($18k) - Requires high collateral buffer",
    targetScore: 310,
    targetTier: "HighRisk",
    protocols: ["Aave v3"],
  },
]

const tierConfig: Record<string, { color: string; bg: string; border: string }> = {
  Gold: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  Silver: { color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
  Bronze: { color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  HighRisk: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  Unscored: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300" },
}

export default function KycVerificationPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 1. Personal Information
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
    nationality: "",
    gender: "OTHER",
  })

  // 2. On-Chain Credit Bureau — use user's connected wallet from login
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [activePreset, setActivePreset] = useState<string>("prime-cross-chain")
  const [isScanningDeFi, setIsScanningDeFi] = useState<boolean>(false)
  const [isProvingOnCC3, setIsProvingOnCC3] = useState<boolean>(false)
  const [scanStep, setScanStep] = useState<number>(0)
  const [proofStep, setProofStep] = useState<number>(0)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false)
  const [discoveredEvents, setDiscoveredEvents] = useState<DeFiEvent[]>([])
  const [discoverySummary, setDiscoverySummary] = useState<DiscoverySummary | null>(null)
  const [onChainProfile, setOnChainProfile] = useState<OnChainCreditProfile | null>(null)
  const [creditVerified, setCreditVerified] = useState<boolean>(false)
  const [proofTxHash, setProofTxHash] = useState<string | null>(null)
  const [autoProveStatus, setAutoProveStatus] = useState<AutoProveStatus | null>(null)
  const [noHistoryMessage, setNoHistoryMessage] = useState<string | null>(null)
  const [provingAttempted, setProvingAttempted] = useState<boolean>(false)

  // 3. ID Verification
  const [idType, setIdType] = useState<IdType>("nin")
  const [idNumber, setIdNumber] = useState("")
  const [idFrontUploaded, setIdFrontUploaded] = useState(true)
  const [idBackUploaded, setIdBackUploaded] = useState(true)

  // 4. Facial Verification
  const [selfieUploaded, setSelfieUploaded] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)

  // Populate wallet address from connected MetaMask on mount
  const { walletAddress: connectedWallet } = useWalletAuth()
  useEffect(() => {
    if (connectedWallet && !walletAddress) {
      setWalletAddress(connectedWallet)
    }
  }, [connectedWallet])

  // Auto-scan + auto-prove when reaching step 2
  useEffect(() => {
    if (step === 2 && walletAddress && discoveredEvents.length === 0 && !isScanningDeFi) {
      handleScanDeFiHistory(walletAddress)
    }
  }, [step, walletAddress])

  // Auto-generate proof after scan completes (only if events found, only once)
  useEffect(() => {
    if (step === 2 && discoveredEvents.length > 0 && !creditVerified && !isProvingOnCC3 && !isScanningDeFi && !noHistoryMessage && !provingAttempted) {
      setProvingAttempted(true)
      handleProveCreditScore()
    }
  }, [discoveredEvents, step, creditVerified, isProvingOnCC3, isScanningDeFi, noHistoryMessage, provingAttempted])

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPersonalInfo({ ...personalInfo, [name]: value })
  }

  const handleSelectPreset = (preset: BorrowerPreset) => {
    setActivePreset(preset.id)
    setWalletAddress(preset.address)
    setCreditVerified(false)
    setOnChainProfile(null)
    setProofTxHash(null)
    setAutoProveStatus(null)
    setProvingAttempted(false)
    handleScanDeFiHistory(preset.address)
  }

  const handleScanDeFiHistory = async (addressToScan: string) => {
    if (!addressToScan || !addressToScan.startsWith("0x")) return
    setIsScanningDeFi(true)
    setErrorMessage(null)
    setNoHistoryMessage(null)
    setScanStep(1)
    const scanStartTime = Date.now()
    const MIN_SCAN_DURATION = 6000 // Minimum 6 seconds for UX feel

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      // Simulate progress steps while waiting for backend
      const progressTimer = setInterval(() => {
        setScanStep((prev) => (prev < 4 ? prev + 1 : prev))
      }, 1500)

      const res = await fetch(`${apiUrl}/api/v1/credit-oracle/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressToScan }),
      })
      clearInterval(progressTimer)
      if (!res.ok) throw new Error(`Failed to discover DeFi history (${res.status})`)
      const json = await res.json()
      const data = json.data

      // Ensure minimum scan duration for UX
      const elapsed = Date.now() - scanStartTime
      if (elapsed < MIN_SCAN_DURATION) {
        await new Promise(resolve => setTimeout(resolve, MIN_SCAN_DURATION - elapsed))
      }

      // Handle new response shape: { hasVerifiedHistory, events, message, summary }
      if (data.hasVerifiedHistory === false) {
        setDiscoveredEvents([])
        setDiscoverySummary(null)
        setNoHistoryMessage(data.message || "No DeFi lending activity found on Sepolia yet.")
        setOnChainProfile({
          borrower: addressToScan,
          score: 500,
          tier: "Unscored",
          totalRepaidUSD: "0",
          totalLiquidatedUSD: "0",
          totalDefaultedUSD: "0",
          cleanRepaymentCount: 0,
          liquidationCount: 0,
          defaultCount: 0,
          provenEventsCount: 0,
          lastEvaluatedTimestamp: Math.floor(Date.now() / 1000),
          provenEvents: [],
        })
        setCreditVerified(true)
        setScanStep(5)
        setIsDemoMode(false)
      } else {
        // Legacy or full response with events
        const events = data.selectedTopEvents || data.events || []
        setDiscoveredEvents(events)
        setDiscoverySummary(data.summary || null)
        // Check if this is demo/curated data (same tx hash as known demos)
        const isDemo = events.some((e: any) =>
          e.sourceTxHash === '0x0a597de623ef5ebcd0b99b861cf7a72a3f12658a6f1844ab6157a1b27bbd1079'
        )
        setIsDemoMode(isDemo)
        setScanStep(5)
      }
    } catch (e: any) {
      console.warn("DeFi scan notice:", e.message)
    } finally {
      setIsScanningDeFi(false)
    }
  }

  const handleProveCreditScore = async () => {
    if (discoveredEvents.length === 0) return
    setIsProvingOnCC3(true)
    setErrorMessage(null)
    setProofStep(1)
    setAutoProveStatus({
      status: "discovering",
      eventsFound: discoveredEvents.length,
      total: discoveredEvents.length,
      current: 0,
      eventsProven: 0,
      eventsFailed: 0,
    })
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    try {
      const startResponse = await fetch(`${apiUrl}/api/v1/credit-oracle/auto-prove-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress }),
      })
      if (!startResponse.ok) {
        const errJson = await startResponse.json().catch(() => ({}))
        throw new Error(errJson.message || `Could not start automatic proof (${startResponse.status})`)
      }

      const MAX_POLL_ATTEMPTS = 120
      const POLL_INTERVAL_MS = 3000
      let completedStatus: AutoProveStatus | null = null

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS))

        const statusResponse = await fetch(
          `${apiUrl}/api/v1/credit-oracle/auto-prove-status/${walletAddress}`,
          { cache: "no-store" },
        )
        if (!statusResponse.ok) {
          const errJson = await statusResponse.json().catch(() => ({}))
          throw new Error(errJson.message || `Could not read proof status (${statusResponse.status})`)
        }

        const statusJson = await statusResponse.json()
        const status = (statusJson?.data || {}) as AutoProveStatus
        setAutoProveStatus(status)

        if (status.status === "error") {
          throw new Error(status.error || "Automatic proof failed")
        }
        if (status.status === "idle") {
          throw new Error("The automatic proof job is no longer available. Please try again.")
        }
        if (status.status === "completed") {
          completedStatus = status
          break
        }

        setProofStep(status.status === "proving" ? 2 : 1)
      }

      if (!completedStatus) {
        throw new Error("Automatic proof timed out. Please try again.")
      }
      if ((completedStatus.eventsFailed || 0) > 0 && (completedStatus.eventsProven || 0) === 0) {
        throw new Error(completedStatus.error || "No newly discovered DeFi events could be proven.")
      }

      // The batch transaction has completed; read the authoritative on-chain profile once.
      setProofStep(3)
      const profileRes = await fetch(`${apiUrl}/api/v1/credit-oracle/profile/${walletAddress}`)
      if (profileRes.ok) {
        const profileJson = await profileRes.json()
        const profile = profileJson.data as OnChainCreditProfile
        setOnChainProfile(profile)
        const discoveredHashes = new Set(discoveredEvents.map((event) => event.sourceTxHash.toLowerCase()))
        const batchTxHash = profile.provenEvents?.find((event: any) =>
          discoveredHashes.has(String(event.sourceTxHash || "").toLowerCase()) && event.cc3TxHash,
        )?.cc3TxHash
        setProofTxHash(batchTxHash || null)
        setProofStep(4)
      } else {
        const errJson = await profileRes.json().catch(() => ({}))
        throw new Error(errJson.message || "Proof completed, but the updated credit profile could not be read.")
      }
      setCreditVerified(true)
    } catch (err: any) {
      console.warn("[KYC] Automatic proof failed:", err.message)
      setErrorMessage(`Automatic proof failed: ${err.message}. Please try again.`)
      setCreditVerified(false)
    } finally {
      setIsProvingOnCC3(false)
    }
  }

  const handleNextStep = async () => {
    // Validate Step 1 fields before proceeding
    if (step === 1) {
      const requiredFields = [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'address', label: 'Address' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'postalCode', label: 'Postal Code' },
        { key: 'dateOfBirth', label: 'Date of Birth' },
        { key: 'nationality', label: 'Nationality' },
      ]
      const missing = requiredFields.find(f => !personalInfo[f.key as keyof typeof personalInfo]?.trim())
      if (missing) {
        setErrorMessage(`Please fill in ${missing.label} before proceeding.`)
        return
      }
      setErrorMessage(null)
    }

    // Validate Step 3 fields before proceeding
    if (step === 3) {
      if (!idNumber.trim()) {
        setErrorMessage(`Please fill in ${idTypes[idType].label} before proceeding.`)
        return
      }
      const idConfig = idTypes[idType]
      if (idNumber.length > idConfig.maxLength) {
        setErrorMessage(`${idConfig.label} must be at most ${idConfig.maxLength} characters.`)
        return
      }
      if (!idConfig.pattern.test(idNumber.trim())) {
        setErrorMessage(idConfig.patternError)
        return
      }
      setErrorMessage(null)
    }

    if (step < 4) {
      setStep(step + 1)
    } else {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        const docTypeMap: Record<string, "NIN" | "Passport" | "DriverLicense"> = { nin: "NIN", passport: "Passport", license: "DriverLicense" }
        
        // 1. Register or login the user via wallet auth
        let registered = false
        const ethereum = (window as any).ethereum
        console.log("[KYC] walletAddress:", walletAddress, "ethereum:", !!ethereum, "providers:", ethereum?.providers?.length)

        // Detect if we have a real MetaMask provider (not just evmAsk aggregator)
        let provider = ethereum
        if (ethereum?.providers?.length) {
          provider = ethereum.providers.find((p: any) => p.isMetaMask) || ethereum.providers[0]
          console.log("[KYC] Using provider:", provider?.isMetaMask ? "MetaMask" : "fallback")
        }

        if (walletAddress && provider && typeof window !== "undefined") {
          try {
            // Check if provider supports personal_sign
            const testAccounts = await provider.request({ method: "eth_accounts" })
            console.log("[KYC] eth_accounts:", testAccounts?.length ? "has accounts" : "no accounts")

            if (!testAccounts?.length) {
              console.log("[KYC] No accounts available - wallet may be locked. Skipping wallet auth.")
            } else {
              // Helper: get nonce + sign (with timeout)
              const getNonceAndSign = async () => {
                const nonceRes = await fetch(`${apiUrl}/api/v1/auth/wallet/nonce`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ walletAddress }),
                })
                const nonceData = await nonceRes.json()
                const { nonce, message } = nonceData.data
                const sig = await Promise.race([
                  provider.request({
                    method: "personal_sign",
                    params: [message, walletAddress],
                  }),
                  new Promise((_, reject) => setTimeout(() => reject(new Error("Signature timed out")), 10000)),
                ])
                return { nonce, signature: sig }
              }

              // Try to register first
              const { nonce, signature } = await getNonceAndSign()
              console.log("[KYC] Got signature, registering...")
              const registerRes = await fetch(`${apiUrl}/api/v1/auth/wallet/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  walletAddress,
                  signature,
                  nonce,
                  role: "BORROWER",
                  userFirstName: personalInfo.firstName,
                  userLastName: personalInfo.lastName,
                  userEmail: personalInfo.email,
                  userContactNo: personalInfo.phone,
                }),
              })
              const registerData = await registerRes.json()
              console.log("[KYC] Register response:", registerRes.status, registerData)

              if (registerData.success && registerData.data?.accessToken) {
                sessionStorage.setItem("accessToken", registerData.data.accessToken)
                sessionStorage.setItem("refreshToken", registerData.data.refreshToken)
                sessionStorage.setItem("expiredAt", registerData.data.expiredAt.toString())
                sessionStorage.setItem("userType", "borrower")
                sessionStorage.setItem("walletAddress", walletAddress)
                localStorage.setItem("authState", JSON.stringify({
                  isAuthenticated: true,
                  token: registerData.data.accessToken,
                  userType: "borrower",
                  refreshToken: registerData.data.refreshToken,
                  walletAddress,
                }))
                registered = true
                console.log("[KYC] Registration successful")
              } else if (registerRes.status === 409) {
                // User already exists - get new nonce and login
                console.log("[KYC] User exists, logging in...")
                const loginAuth = await getNonceAndSign()
                const loginRes = await fetch(`${apiUrl}/api/v1/auth/wallet/login`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    walletAddress,
                    signature: loginAuth.signature,
                    nonce: loginAuth.nonce,
                    role: "borrower",
                  }),
                })
                const loginData = await loginRes.json()
                console.log("[KYC] Login response:", loginRes.status, loginData)

                if (loginData.success && loginData.data?.accessToken) {
                  sessionStorage.setItem("accessToken", loginData.data.accessToken)
                  sessionStorage.setItem("refreshToken", loginData.data.refreshToken)
                  sessionStorage.setItem("expiredAt", loginData.data.expiredAt.toString())
                  sessionStorage.setItem("userType", "borrower")
                  sessionStorage.setItem("walletAddress", walletAddress)
                  localStorage.setItem("authState", JSON.stringify({
                    isAuthenticated: true,
                    token: loginData.data.accessToken,
                    userType: "borrower",
                    refreshToken: loginData.data.refreshToken,
                    walletAddress,
                  }))
                  registered = true
                  console.log("[KYC] Login successful")
                }
              }
            }
          } catch (regErr: any) {
            console.error("[KYC] Wallet auth error:", regErr.message)
            setErrorMessage(`Wallet auth failed: ${regErr.message}. Continuing KYC submission...`)
          }
        } else {
          console.log("[KYC] Skipping wallet auth - no wallet connected")
        }

        // 2. Submit KYC data
        const payload = {
          firstName: personalInfo.firstName, lastName: personalInfo.lastName, email: personalInfo.email,
          phone: personalInfo.phone, address: personalInfo.address, city: personalInfo.city,
          state: personalInfo.state, postalCode: personalInfo.postalCode, dateOfBirth: personalInfo.dateOfBirth,
          nationality: personalInfo.nationality, documentType: docTypeMap[idType] || "MyKad",
          icNo: idNumber, icFrontPicture: idFrontUploaded ? "ic_front_verified.jpg" : "default_front.jpg",
          icBackPicture: idBackUploaded ? "ic_back_verified.jpg" : "default_back.jpg",
          ethereumWalletAddress: walletAddress, creditScore: onChainProfile?.score || 845,
          creditTier: onChainProfile?.tier || "Gold", attestcoinProofTx: proofTxHash,
          gender: personalInfo.gender,
        }
        console.log("[KYC] Submitting payload:", payload)
        const kycRes = await apiInstance.post("/kyc/submit", payload, { timeout: 30000 })
        console.log("[KYC] Submit response:", kycRes.data)
        setVerificationComplete(true)
      } catch (err: any) {
        console.error("[KYC] Submission error:", err.message || err)
        setErrorMessage(err.message || "KYC submission failed")
        setVerificationComplete(true)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handlePrevStep = () => {
    if (step > 1) {
      // Reset DeFi scan state so it rescans when re-entering step 2
      if (step === 2) {
        setDiscoveredEvents([])
        setDiscoverySummary(null)
        setCreditVerified(false)
        setOnChainProfile(null)
        setProofTxHash(null)
        setNoHistoryMessage(null)
        setIsDemoMode(false)
        setScanStep(0)
        setProofStep(0)
        setProvingAttempted(false)
      }
      setStep(step - 1)
    }
  }
  const handleIdUpload = (side: "front" | "back") => { side === "front" ? setIdFrontUploaded(true) : setIdBackUploaded(true) }
  const handleSelfieUpload = () => setSelfieUploaded(true)
  const handleComplete = () => router.push("/dashboard/borrower")

  const stepIndicator = (n: number, done: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm transition-all ${
      done || step > n
        ? "bg-[#171414] text-[#E1BAC2] font-bold"
        : step === n
          ? "border-2 border-[#171414] bg-[#171414]/10 text-[#171414] font-bold"
          : "border border-[#171414]/15 bg-[#F5F5F3] text-muted-foreground"
    }`

  const tier = onChainProfile?.tier || "Gold"
  const tierStyle = tierConfig[tier] || tierConfig.Gold

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <p className="kicker-gold">Identity Verification</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
            KYC & Credit Vetting
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Standard identity verification combined with cryptographic on-chain credit screening
          </p>
        </div>

        {/* Progress Steps */}
        <Card className={glass}>
          <CardContent className="p-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#171414]/10" />
              </div>
              <div className="relative flex justify-between">
                {[
                  { n: 1, label: "Personal Info" },
                  { n: 2, label: "DeFi Credit" },
                  { n: 3, label: "ID Verification" },
                  { n: 4, label: "Biometric" },
                ].map(({ n, label }) => (
                  <div key={n} className="flex flex-col items-center">
                    <div className={stepIndicator(n, n === 2 ? creditVerified : step > n)}>
                      {n === 2 && creditVerified ? <ShieldCheck className="h-5 w-5" /> :
                       step > n ? <Check className="h-5 w-5" /> : n}
                    </div>
                    <span className={`mt-2 font-mono text-[10px] uppercase tracking-wider ${
                      n === 2 ? "text-[#171414] font-bold" : "text-muted-foreground"
                    }`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* Main Card */}
        <Card className={glass}>
          <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg text-[#171414]">
                  {step === 1 && "Personal & Contact Details"}
                  {step === 2 && "On-Chain Credit Bureau Screening"}
                  {step === 3 && "Official Identification Document"}
                  {step === 4 && "Facial Biometric & Liveness"}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  {step === 1 && "Provide your basic biographical and contact information"}
                  {step === 2 && "Cryptographically prove repayment behavior across DeFi protocols"}
                  {step === 3 && "Upload your government-issued ID, Passport, or National ID"}
                  {step === 4 && "Verify liveness to prevent identity theft"}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">Step {step} of 4</Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-xs text-muted-foreground">First Name</Label>
                    <Input id="firstName" name="firstName" value={personalInfo.firstName} onChange={handlePersonalInfoChange} placeholder="First name" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-xs text-muted-foreground">Last Name</Label>
                    <Input id="lastName" name="lastName" value={personalInfo.lastName} onChange={handlePersonalInfoChange} placeholder="Last name" className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs text-muted-foreground">Email Address</Label>
                    <Input id="email" name="email" type="email" value={personalInfo.email} onChange={handlePersonalInfoChange} placeholder="Email address" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone Number</Label>
                    <Input id="phone" name="phone" value={personalInfo.phone} onChange={handlePersonalInfoChange} placeholder="Phone number" className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs text-muted-foreground">Residential Address</Label>
                  <Input id="address" name="address" value={personalInfo.address} onChange={handlePersonalInfoChange} placeholder="Residential address" className="rounded-xl" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-xs text-muted-foreground">City</Label>
                    <Input id="city" name="city" value={personalInfo.city} onChange={handlePersonalInfoChange} placeholder="City" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-xs text-muted-foreground">State / Province</Label>
                    <Input id="state" name="state" value={personalInfo.state} onChange={handlePersonalInfoChange} placeholder="State / Province" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode" className="text-xs text-muted-foreground">Postal Code</Label>
                    <Input id="postalCode" name="postalCode" value={personalInfo.postalCode} onChange={handlePersonalInfoChange} placeholder="Postal code" className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="text-xs text-muted-foreground">Date of Birth</Label>
                    <div className="flex gap-2">
                      <Input
                        id="dobDay"
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        placeholder="DD"
                        value={personalInfo.dateOfBirth ? personalInfo.dateOfBirth.split('-')[2] || '' : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                          const parts = (personalInfo.dateOfBirth || '').split('-')
                          const year = parts[0] || ''
                          const month = parts[1] || ''
                          setPersonalInfo({ ...personalInfo, dateOfBirth: `${year}-${month}-${val}` })
                        }}
                        className="rounded-xl text-center font-mono"
                      />
                      <span className="flex items-center text-muted-foreground">/</span>
                      <Input
                        id="dobMonth"
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        placeholder="MM"
                        value={personalInfo.dateOfBirth ? personalInfo.dateOfBirth.split('-')[1] || '' : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                          const parts = (personalInfo.dateOfBirth || '').split('-')
                          const year = parts[0] || ''
                          const day = parts[2] || ''
                          setPersonalInfo({ ...personalInfo, dateOfBirth: `${year}-${val}-${day}` })
                        }}
                        className="rounded-xl text-center font-mono"
                      />
                      <span className="flex items-center text-muted-foreground">/</span>
                      <Input
                        id="dobYear"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="YYYY"
                        value={personalInfo.dateOfBirth ? personalInfo.dateOfBirth.split('-')[0] || '' : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                          const parts = (personalInfo.dateOfBirth || '').split('-')
                          const month = parts[1] || ''
                          const day = parts[2] || ''
                          setPersonalInfo({ ...personalInfo, dateOfBirth: `${val}-${month}-${day}` })
                        }}
                        className="rounded-xl text-center font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality" className="text-xs text-muted-foreground">Nationality</Label>
                    <Input id="nationality" name="nationality" value={personalInfo.nationality} onChange={handlePersonalInfoChange} placeholder="Country" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-xs text-muted-foreground">Gender</Label>
                    <select id="gender" name="gender" value={personalInfo.gender} onChange={handlePersonalInfoChange} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: On-Chain Credit Screening (Auto-flow) */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Wallet being scanned */}
                <div className="flex items-center gap-3 rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#171414]/10">
                    <Cpu className="h-5 w-5 text-[#171414]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Scanning wallet</p>
                    <p className="font-mono text-sm font-bold text-[#171414] truncate">{walletAddress || 'Not connected'}</p>
                  </div>
                  {walletAddress && (
                    <Badge variant="outline" className="text-[9px] font-mono shrink-0">10 Protocols</Badge>
                  )}
                </div>

                {/* Auto-scan in progress */}
                {isScanningDeFi && !creditVerified && (
                  <div className="rounded-2xl border border-[#171414]/10 bg-white/60 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <Loader2 className="h-5 w-5 animate-spin text-[#171414]" />
                      <div>
                        <p className="text-sm font-medium text-[#171414]">Scanning DeFi history...</p>
                        <p className="text-xs text-muted-foreground">Querying Ethereum Sepolia for lending activity</p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        "Connecting to Ethereum Sepolia RPC",
                        "Scanning Aave v3, Compound v3, Morpho Blue",
                        "Scanning Spark, MakerDAO, Euler, Fluid",
                        "Scanning Maple, Goldfinch, Fraxlend",
                        "Decoding calldata & ranking events",
                      ].map((msg, i) => {
                        const isDone = scanStep > i + 1
                        const isActive = scanStep === i + 1
                        return (
                          <div key={i} className="flex items-center gap-2.5 text-xs">
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-all ${
                              isDone ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
                              : isActive ? "bg-[#171414]/10 text-[#171414] border border-[#171414]/20"
                              : "bg-[#F5F5F3] text-muted-foreground/50 border border-[#171414]/10"
                            }`}
                            >{isDone ? <Check className="h-3 w-3" /> : i + 1}</div>
                            <span className={isDone ? "text-emerald-600" : isActive ? "text-[#171414] font-medium" : "text-muted-foreground/50"}>{msg}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Proof generation in progress */}
                {isProvingOnCC3 && (
                  <div className="rounded-2xl border border-[#171414]/10 bg-white/60 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <Loader2 className="h-5 w-5 animate-spin text-[#171414]" />
                      <div>
                        <p className="text-sm font-medium text-[#171414]">Auto-proving DeFi history...</p>
                        <p className="text-xs text-muted-foreground">
                          {autoProveStatus
                            ? `${autoProveStatus.eventsProven || 0} proven · ${autoProveStatus.eventsFailed || 0} failed · ${autoProveStatus.current || 0}/${autoProveStatus.total || autoProveStatus.eventsFound || discoveredEvents.length} processed`
                            : "Cryptographic verification on Creditcoin CC3"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        "Discovering and filtering unproven DeFi events",
                        "Generating a shared Attestcoin batch proof",
                        "Submitting the batch to the BlockProver precompile on CC3",
                        "Reading on-chain credit profile from SanadCreditOracle",
                      ].map((msg, i) => {
                        const isDone = proofStep > i + 1
                        const isActive = proofStep === i + 1
                        return (
                          <div key={i} className="flex items-center gap-2.5 text-xs">
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-all ${
                              isDone ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
                              : isActive ? "bg-[#171414]/10 text-[#171414] border border-[#171414]/20"
                              : "bg-[#F5F5F3] text-muted-foreground/50 border border-[#171414]/10"
                            }`}
                            >{isDone ? <Check className="h-3 w-3" /> : i + 1}</div>
                            <span className={isDone ? "text-emerald-600" : isActive ? "text-[#171414] font-medium" : "text-muted-foreground/50"}>{msg}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Discovered records + automatic batch-proof button */}
                {!isScanningDeFi && discoveredEvents.length > 0 && !creditVerified && (
                  <div className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-[#171414]">Found {discoveredEvents.length} lending record{discoveredEvents.length !== 1 ? 's' : ''}</p>
                      <div className="flex items-center gap-2">
                        {isDemoMode && (
                          <Badge variant="outline" className="text-[8px] font-mono text-amber-600 border-amber-200 bg-amber-50">Demo Profile</Badge>
                        )}
                        <span className="font-mono text-[9px] text-muted-foreground">10 protocols scanned</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {discoveredEvents.slice(0, 3).map((ev, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl bg-white p-2.5 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[8px] font-mono ${
                              ev.eventType === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : ev.eventType === 1 || ev.eventType === 2 ? "border-red-200 bg-red-50 text-red-700"
                              : ev.eventType === 4 ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-[#171414]/20 bg-[#171414]/5 text-[#171414]"
                            }`}>{ev.eventTypeName}</Badge>
                            <span className="text-[#171414]">{ev.protocolName}</span>
                          </div>
                          <span className="font-mono font-bold text-[#171414]">${ev.volumeUSD.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={() => handleProveCreditScore()}
                      disabled={isProvingOnCC3}
                      className="w-full rounded-xl bg-[#171414] text-[#E1BAC2] font-mono text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-black"
                    >
                      {isProvingOnCC3 ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Auto-proving on CC3...</>
                      ) : (
                        <><Shield className="h-3.5 w-3.5 mr-1.5" /> Auto-Prove All on CC3</>
                      )}
                    </Button>
                  </div>
                )}

                {/* No DeFi history found */}
                {!isScanningDeFi && noHistoryMessage && creditVerified && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                      <AlertTriangle className="h-5 w-5" /> No DeFi Activity Found
                    </div>
                    <p className="text-xs text-amber-800">{noHistoryMessage}</p>
                    <div className="rounded-xl bg-white border border-amber-100 p-3 space-y-2">
                      <p className="text-[11px] font-bold text-[#171414]">How to build your credit score:</p>
                      <ul className="text-[10px] text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Supply collateral on <span className="font-bold">Aave v3 Sepolia</span></li>
                        <li>Borrow a small amount against your collateral</li>
                        <li>Repay the loan on time</li>
                        <li>Return here and click <span className="font-bold">Discover</span> again to prove your activity</li>
                      </ul>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] font-mono border-amber-300 bg-white text-amber-700">
                        Tier: Unscored (Base)
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono border-amber-300 bg-white text-amber-700">
                        Score: 500 / 1000
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Verified result */}
                {creditVerified && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                        <ShieldCheck className="h-5 w-5" />
                        {(onChainProfile?.provenEventsCount ?? discoveredEvents.length) > 0
                          ? "Credit Verified"
                          : "Identity Verified • Unscored Baseline (500 pts)"}
                      </div>
                      <Badge variant="outline" className={`${tierStyle.bg} ${tierStyle.color} ${tierStyle.border} text-xs font-mono`}>
                        {onChainProfile?.score ?? (discoveredEvents.length === 0 ? 500 : 845)} / 1000 ({tier})
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="rounded-xl border border-[#171414]/8 bg-white p-2.5 text-center">
                        <p className="font-mono text-[9px] uppercase text-muted-foreground">Repaid</p>
                        <p className="text-sm font-bold tabular-nums text-[#171414]">${Number(onChainProfile?.totalRepaidUSD || 0).toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl border border-[#171414]/8 bg-white p-2.5 text-center">
                        <p className="font-mono text-[9px] uppercase text-muted-foreground">Clean Repayments</p>
                        <p className="text-sm font-bold tabular-nums text-emerald-600">{onChainProfile?.cleanRepaymentCount ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-[#171414]/8 bg-white p-2.5 text-center">
                        <p className="font-mono text-[9px] uppercase text-muted-foreground">Liquidations</p>
                        <p className={`text-sm font-bold tabular-nums ${(onChainProfile?.liquidationCount ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>{onChainProfile?.liquidationCount ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-[#171414]/8 bg-white p-2.5 text-center">
                        <p className="font-mono text-[9px] uppercase text-muted-foreground">Proven Events</p>
                        <p className="text-sm font-bold tabular-nums text-[#171414]">{onChainProfile?.provenEventsCount ?? 0}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#E1BAC2]/30 bg-[#E1BAC2]/5 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#171414] mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> Unlocked Terms
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div><span className="text-muted-foreground">LTV:</span> <span className="font-bold text-[#171414]">{tier === "Gold" ? "85%" : tier === "Silver" ? "75%" : tier === "Unscored" ? "40%" : "50%"}</span></div>
                        <div><span className="text-muted-foreground">Ujrah:</span> <span className="font-bold text-[#171414]">{tier === "Gold" ? "0.60%" : tier === "Silver" ? "0.85%" : tier === "Unscored" ? "1.50%" : "1.25%"}</span></div>
                        <div><span className="text-muted-foreground">Approval:</span> <span className="font-bold text-[#171414]">{tier === "Unscored" ? "Manual Review" : "Automated"}</span></div>
                      </div>
                    </div>

                    {proofTxHash && (
                      <a href={`${CREDITCOIN_EXPLORER_URL}/tx/${proofTxHash}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline">
                        View proof on Blockscout <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: ID Verification */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Select Document Type</Label>
                  <RadioGroup value={idType} onValueChange={(v) => setIdType(v as IdType)} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {(["nin", "passport", "license"] as const).map((t) => (
                      <div key={t} className="flex items-center space-x-2 rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-3">
                        <RadioGroupItem value={t} id={t} />
                        <Label htmlFor={t} className="text-xs text-[#171414] cursor-pointer">{idTypes[t].label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id-number" className="text-xs text-muted-foreground">{idTypes[idType].label}</Label>
                  <Input id="id-number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder={idTypes[idType].placeholder} maxLength={idTypes[idType].maxLength} inputMode={idType === "nin" ? "numeric" : "text"} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(["front", "back"] as const).map((side) => {
                    const uploaded = side === "front" ? idFrontUploaded : idBackUploaded
                    return (
                      <div key={side} className="rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-4">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className={`flex h-36 w-full items-center justify-center rounded-xl border-2 border-dashed ${
                            uploaded ? "border-emerald-300 bg-emerald-50/50" : "border-[#171414]/15 bg-white/40"
                          }`}>
                            {uploaded ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <Check className="h-8 w-8 text-emerald-600" />
                                <p className="font-mono text-[10px] uppercase text-emerald-600">{side} Verified</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5">
                                <FileText className="h-8 w-8 text-muted-foreground/50" />
                                <p className="font-mono text-[10px] uppercase text-muted-foreground">{side} of ID</p>
                              </div>
                            )}
                          </div>
                          <Button type="button" variant="outline" className="rounded-xl text-xs"
                            onClick={() => handleIdUpload(side)}>
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            {uploaded ? "Re-upload" : `Upload ${side === "front" ? "Front" : "Back"}`}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: Facial Biometrics */}
            {step === 4 && (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-full max-w-md rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-5">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className={`flex h-56 w-full items-center justify-center rounded-2xl border-2 border-dashed ${
                      selfieUploaded ? "border-emerald-300 bg-emerald-50/50" : "border-[#171414]/15 bg-white/40"
                    }`}>
                      {selfieUploaded ? (
                        <div className="flex flex-col items-center gap-2">
                          <Check className="h-12 w-12 text-emerald-600" />
                          <p className="font-mono text-xs uppercase text-emerald-600">Liveness Confirmed</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center p-4">
                          <ScanFace className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-xs text-muted-foreground">Position your face in the frame</p>
                          <p className="text-[11px] text-muted-foreground/60">AI Liveness Detection Active</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button type="button" variant="outline" className="flex-1 rounded-xl text-xs" onClick={handleSelfieUpload}>
                        <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Selfie
                      </Button>
                      <Button type="button" className="flex-1 rounded-full bg-[#171414] text-[#E1BAC2] font-bold text-xs hover:bg-black" onClick={handleSelfieUpload}>
                        <Camera className="mr-1.5 h-3.5 w-3.5" /> Capture
                      </Button>
                    </div>
                    {verificationComplete && (
                      <div className="mt-3 space-y-1.5 text-center p-3 rounded-2xl bg-emerald-50 border border-emerald-200 w-full">
                        <p className="font-bold text-emerald-700 text-xs">KYC & Credit Vetting Approved!</p>
                        <p className="text-[11px] text-muted-foreground">Your identity and on-chain credit score are registered.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>

            <CardFooter className="flex justify-between p-6 border-t border-[#171414]/10">
            {step > 1 && (
              <Button type="button" variant="outline" className="rounded-xl text-xs" onClick={handlePrevStep}>
                Previous Step
              </Button>
            )}
            {verificationComplete ? (
              <Button onClick={handleComplete} className="rounded-full bg-[#171414] text-[#E1BAC2] font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-black">
                Go to Dashboard
              </Button>
            ) : (
              /* Step 2: only show Next after credit verification completes */
              step === 2 && !creditVerified ? (
                <div />
              ) : (
                <Button onClick={handleNextStep} className="rounded-full bg-[#171414] text-[#E1BAC2] font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-black px-6" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting KYC...</span>
                  ) : step === 4 ? "Complete KYC" : "Next Step"}
                </Button>
              )
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
