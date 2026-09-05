"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  Check,
  FileText,
  Loader2,
  ScanFace,
  Upload,
  ShieldCheck,
  Cpu,
  Sparkles,
  Zap,
  RefreshCw,
  Search,
  AlertTriangle,
  AlertCircle,
  XCircle,
  ExternalLink,
} from "lucide-react"
import { DeFiEvent, DiscoverySummary, OnChainCreditProfile, BorrowerPreset, AddressSecurityInfo } from "@/core/credit-bureau/types"

interface KYCVerificationProps {
  nextStep: () => void
}

const idTypes = {
  nin: { label: "NIN / National ID", placeholder: "e.g., 920505106666" },
  passport: { label: "Passport Number", placeholder: "e.g., A01234567" },
  license: { label: "License Number", placeholder: "e.g., ABC1234567" },
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

const PRESETS: BorrowerPreset[] = [
  {
    id: "prime-cross-chain",
    label: "💎 Prime Cross-DeFi Borrower",
    address: "0x891775eDdcaBABdCE4b476E335a9EEF73123C75b",
    tag: "Prime / Gold Tier",
    desc: "Verified activity on Aave v3, Morpho Blue, Spark & Fluid ($117.5k volume)",
    targetScore: 845,
    targetTier: "Gold",
    protocols: ["Aave v3", "Morpho Blue", "Spark Protocol (Sky)", "Fluid (Instadapp)"],
  },
  {
    id: "active-retail",
    label: "🪙 Active Multi-Pool Borrower",
    address: "0xCAD85e1eC294F71f3cA68Ef3261f894f50C1C4C3",
    tag: "Active / Silver Tier",
    desc: "Clean repayments on Aave v3 and Compound v3 ($23.5k) with 0 defaults",
    targetScore: 680,
    targetTier: "Silver",
    protocols: ["Aave v3", "Compound v3"],
  },
  {
    id: "flagged-exploiter",
    label: "⚠️ Kelp DAO Exploiter (Flagged)",
    address: "0x1F4C1c2e610f089D6914c4448E6F21Cb0db3adeF",
    tag: "Exploiter / Blacklisted",
    desc: "Tagged on-chain exploiter entity with Tornado.Cash fund routing",
    targetScore: 0,
    targetTier: "HighRisk",
    protocols: ["Aave v3"],
  },
  {
    id: "high-risk",
    label: "🛑 Distressed Borrower (Liquidated)",
    address: "0x9d6Bc9763008Ad1f7619A3498eFfe9Ec671b276d",
    tag: "High Risk",
    desc: "Collateral liquidation breach on Aave v3 ($18k liquidation)",
    targetScore: 310,
    targetTier: "HighRisk",
    protocols: ["Aave v3"],
  },
]

export function KYCVerification({ nextStep }: KYCVerificationProps) {
  const [step, setStep] = useState(1) // 1: Personal, 2: On-Chain Credit Vetting (Core), 3: ID & Facial
  const [idType, setIdType] = useState<IdType>("nin")
  const [idNumber, setIdNumber] = useState("900515145892")
  const [idFrontUploaded, setIdFrontUploaded] = useState(true)
  const [idBackUploaded, setIdBackUploaded] = useState(true)
  const [selfieUploaded, setSelfieUploaded] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)

  // On-Chain Credit Screening
  const [walletAddress, setWalletAddress] = useState<string>(PRESETS[0].address)
  const [activePreset, setActivePreset] = useState<string>("prime-cross-chain")
  const [isScanningDeFi, setIsScanningDeFi] = useState<boolean>(false)
  const [isProvingOnCC3, setIsProvingOnCC3] = useState<boolean>(false)
  const [discoveredEvents, setDiscoveredEvents] = useState<DeFiEvent[]>([])
  const [securityInfo, setSecurityInfo] = useState<AddressSecurityInfo | null>(null)
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)
  const [creditVerified, setCreditVerified] = useState<boolean>(false)
  const [onChainProfile, setOnChainProfile] = useState<OnChainCreditProfile | null>(null)
  const [autoProveStatus, setAutoProveStatus] = useState<AutoProveStatus | null>(null)

  useEffect(() => {
    if (localStorage.getItem("--step-1-completed") === "true") {
      setStep(3)
      setSelfieUploaded(true)
      setIdFrontUploaded(true)
      setIdBackUploaded(true)
      setVerificationComplete(true)
    }
  }, [])

  // Auto scan on step 2
  useEffect(() => {
    if (step === 2 && discoveredEvents.length === 0 && !isScanningDeFi && !securityInfo) {
      handleScanDeFi(walletAddress)
    }
  }, [step])

  const handleScanDeFi = async (addressToScan: string) => {
    if (!addressToScan || !addressToScan.startsWith("0x")) return
    setIsScanningDeFi(true)
    setProofError(null)
    setCreditVerified(false)
    setOnChainProfile(null)
    setAutoProveStatus(null)
    setSecurityInfo(null)
    setScanMessage(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const res = await fetch(`${apiUrl}/api/v1/credit-oracle/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressToScan }),
      })
      if (res.ok) {
        const json = await res.json()
        const events = json.data?.selectedTopEvents || json.data?.events || []
        const secInfo = json.data?.securityInfo || json.securityInfo || null
        setDiscoveredEvents(events)
        setSecurityInfo(secInfo)
        setScanMessage(json.data?.message || json.message || null)
      } else {
        const errJson = await res.json().catch(() => null)
        setScanMessage(errJson?.message || `Failed to scan DeFi history (HTTP ${res.status})`)
      }
    } catch (e: any) {
      console.warn("Scan error:", e)
      setScanMessage(e.message || "Could not connect to backend discovery service")
    } finally {
      setIsScanningDeFi(false)
    }
  }

  const handleProveCredit = async () => {
    if (discoveredEvents.length === 0) return
    setIsProvingOnCC3(true)
    setProofError(null)
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
        const errJson = await startResponse.json().catch(() => null)
        throw new Error(errJson?.message || errJson?.error || `Could not start automatic proof (HTTP ${startResponse.status})`)
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
          const errJson = await statusResponse.json().catch(() => null)
          throw new Error(errJson?.message || errJson?.error || `Could not read automatic-proof status (HTTP ${statusResponse.status})`)
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
      }

      if (!completedStatus) {
        throw new Error("Automatic proof timed out. Please try again.")
      }
      if ((completedStatus.eventsFailed || 0) > 0 && (completedStatus.eventsProven || 0) === 0) {
        throw new Error(completedStatus.error || "No newly discovered DeFi events could be proven.")
      }

      const profileResponse = await fetch(`${apiUrl}/api/v1/credit-oracle/profile/${walletAddress}`, {
        cache: "no-store",
      })
      if (!profileResponse.ok) {
        const errJson = await profileResponse.json().catch(() => null)
        throw new Error(errJson?.message || errJson?.error || "Proof completed, but the updated credit profile could not be read.")
      }

      const profileJson = await profileResponse.json()
      const profile = profileJson?.data as OnChainCreditProfile | undefined
      // Only use the profile returned by the oracle; do not manufacture client-side credit values.
      if (!profile || typeof profile.score !== "number" || !profile.tier) {
        throw new Error("Creditcoin Oracle returned incomplete profile metrics")
      }

      setOnChainProfile(profile)
      setCreditVerified(true)
    } catch (err: any) {
      console.error("Proof error:", err)
      setProofError(err.message || "Network error while submitting proof to Creditcoin Oracle")
      setCreditVerified(false)
    } finally {
      setIsProvingOnCC3(false)
    }
  }

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1)
      setVerificationComplete(false)
    } else {
      setVerificationComplete(true)
      localStorage.setItem("--step-1-completed", "true")
      nextStep()
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
      {/* Mini Step Indicator */}
      <div className="flex items-center justify-between text-xs font-mono border-b border-[#171414]/10 pb-3">
        <span className={step === 1 ? "font-bold text-[#171414]" : "text-muted-foreground"}>
          1. Personal Info
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={step === 2 ? "font-bold text-[#171414] flex items-center gap-1" : "text-muted-foreground flex items-center gap-1"}>
          <ShieldCheck className="h-3.5 w-3.5" />
          2. On-Chain Credit Vetting (Core)
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={step === 3 ? "font-bold text-[#171414]" : "text-muted-foreground"}>
          3. ID & Liveness
        </span>
      </div>

      <Tabs value={`step-${step}`} className="w-full">
        {/* STEP 1: Personal Info */}
        <TabsContent value="step-1" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" defaultValue="Ahmad" placeholder="Enter your first name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" defaultValue="Al-Mansoor" placeholder="Enter your last name" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue="ahmad.mansoor@example.com" placeholder="Enter your email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+234 801 234 5678" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" defaultValue="Menara Islamic Finance, Level 28" placeholder="Enter your address" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" defaultValue="Kuala Lumpur" placeholder="e.g., Kuala Lumpur" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" defaultValue="Wilayah Persekutuan" placeholder="e.g., Wilayah Persekutuan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal-code">Postal Code</Label>
              <Input id="postal-code" defaultValue="50450" placeholder="e.g., 50450" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleNextStep} className={primaryBtn}>
              Proceed to On-Chain Vetting →
            </Button>
          </div>
        </TabsContent>

        {/* STEP 2: ON-CHAIN CREDIT SCREENING (CORE) */}
        <TabsContent value="step-2" className="space-y-4 pt-2">
          <div className="rounded-2xl border border-[#171414]/15 bg-white/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span className="font-bold text-sm text-[#171414]">
                  Ethereum Historical DeFi Credit Screening
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] border-[#171414]/20">
                10 Protocols Checked
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We cryptographically verify your historical borrowing and repayment records across 10 Ethereum DeFi protocols (Aave v3, Compound v3, Morpho Blue, Spark, MakerDAO, Euler, Fluid, Maple, Goldfinch, Fraxlend) on Creditcoin CC3.
            </p>
          </div>

          {/* Preset Selectors */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#171414]">Select Borrower Archetype:</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const isSel = activePreset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActivePreset(p.id)
                      setWalletAddress(p.address)
                      setCreditVerified(false)
                      setProofError(null)
                      setAutoProveStatus(null)
                      handleScanDeFi(p.address)
                    }}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      isSel
                        ? "border-[#171414] bg-white shadow-sm"
                        : "border-[#171414]/15 bg-white/40 hover:bg-white/70"
                    }`}
                  >
                    <div className="font-bold text-xs text-[#171414]">{p.label}</div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{p.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Wallet Address Input */}
          <div className="flex gap-2">
            <Input
              value={walletAddress}
              onChange={(e) => {
                setWalletAddress(e.target.value)
                setCreditVerified(false)
                setProofError(null)
                setAutoProveStatus(null)
              }}
              placeholder="0x..."
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => handleScanDeFi(walletAddress)}
              disabled={isScanningDeFi}
              className={outlineBtn}
            >
              {isScanningDeFi ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Scan"}
            </Button>
          </div>

          {/* SECURITY WARNING BANNER (Rendered when address is flagged) */}
          {securityInfo?.isFlagged && (
            <div className="p-4 rounded-2xl border border-red-500/40 bg-red-500/10 space-y-2 text-xs text-red-900 animate-in fade-in duration-200">
              <div className="flex items-center justify-between font-bold text-red-700">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  Security Alert: {securityInfo.label || "Flagged Entity"}
                </span>
                <Badge variant="destructive" className="text-[9px] uppercase tracking-wider">
                  {securityInfo.category || "FLAGGED"}
                </Badge>
              </div>
              <p className="text-[11px] text-red-800 leading-relaxed">
                {securityInfo.riskWarning}
              </p>
              <div className="pt-1 text-[10px] text-red-700 font-mono">
                Source: {securityInfo.source} • Classification: {securityInfo.category} (Credit Profiling Blocked)
              </div>
            </div>
          )}

          {/* NO HISTORY / SCAN MESSAGE */}
          {!securityInfo?.isFlagged && scanMessage && discoveredEvents.length === 0 && (
            <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-1 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                No Historical DeFi Activity Detected
              </div>
              <p className="text-[11px] text-amber-800">
                {scanMessage} — You can proceed with standard collateral terms at the baseline unscored rate (500 pts).
              </p>
            </div>
          )}

          {/* DISCOVERED EVENTS LIST */}
          {discoveredEvents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#171414]">
                <span>Discovered Historical Events ({discoveredEvents.length})</span>
                <span className="text-[10px] text-muted-foreground font-mono">Ready for Attestcoin Proof</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {discoveredEvents.map((ev, i) => (
                  <div key={ev.sourceTxHash || i} className="p-2.5 rounded-xl border border-[#171414]/10 bg-white/60 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#171414] text-[11px]">{ev.protocolName}: {ev.eventTypeName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[220px]">{ev.sourceTxHash}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700 text-[11px]">${ev.volumeUSD.toLocaleString()}</div>
                      <div className="text-[9px] text-muted-foreground font-mono">+{ev.weightScore} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROOF ERROR BANNER (Rendered visibly on actual failure) */}
          {proofError && (
            <div className="p-3.5 rounded-2xl border border-red-500/40 bg-red-500/10 space-y-2 text-xs text-red-900 animate-in fade-in duration-200">
              <div className="flex items-center justify-between font-bold text-red-700">
                <span className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  Proof Verification Failed
                </span>
                <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">
                  Creditcoin Oracle Rejection
                </Badge>
              </div>
              <p className="text-[11px] text-red-800 break-words font-mono bg-red-500/5 p-2 rounded-lg border border-red-500/20">
                {proofError}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleProveCredit}
                className="text-xs h-7 border-red-300 hover:bg-red-100 text-red-900 rounded-lg"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Retry Attestcoin Proof Verification
              </Button>
            </div>
          )}

          {/* Verification CTA / Result */}
          {!creditVerified ? (
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleProveCredit}
                disabled={isProvingOnCC3 || discoveredEvents.length === 0 || !!securityInfo?.isFlagged}
                className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black py-5 disabled:opacity-40"
              >
                {isProvingOnCC3 ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Auto-proving {autoProveStatus?.eventsProven || 0}/{autoProveStatus?.total || autoProveStatus?.eventsFound || discoveredEvents.length} events on Creditcoin CC3...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    {securityInfo?.isFlagged ? "Verification Blocked for Flagged Address" : "Auto-Prove All DeFi Events on Creditcoin"}
                  </span>
                )}
              </Button>
              {isProvingOnCC3 && autoProveStatus && (
                <p className="text-center text-[10px] font-mono text-muted-foreground" aria-live="polite">
                  {autoProveStatus.status === "discovering" ? "Preparing the batch…" : "Waiting for the CC3 batch transaction…"}
                  {` ${autoProveStatus.eventsProven || 0} proven · ${autoProveStatus.eventsFailed || 0} failed`}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-1.5 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between font-bold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Verified on Creditcoin CC3 Testnet
                </span>
                <span>Score: {onChainProfile?.score} / 1000 ({onChainProfile?.tier} Tier)</span>
              </div>
              <p className="text-[11px] text-emerald-900">
                Total Repaid: <strong>${Number(onChainProfile?.totalRepaidUSD || 0).toLocaleString()}</strong> | Clean Repayments: <strong>{onChainProfile?.cleanRepaymentCount}</strong> | Proven Events: <strong>{onChainProfile?.provenEventsCount}</strong>
              </p>
              <div className="text-[10px] text-emerald-700 font-mono pt-1 border-t border-emerald-500/20 flex justify-between items-center">
                <span>SanadCreditOracle on CC3</span>
                <span className="text-emerald-800 font-bold">Cryptographically Proven ✓</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" className={outlineBtn} onClick={handlePrevStep}>
              Previous Step
            </Button>
            <Button onClick={handleNextStep} className={primaryBtn}>
              Proceed to ID Verification →
            </Button>
          </div>
        </TabsContent>

        {/* STEP 3: ID & Liveness */}
        <TabsContent value="step-3" className="space-y-4 pt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ID Type</Label>
              <RadioGroup
                value={idType}
                onValueChange={(v) => setIdType(v as IdType)}
                className="grid grid-cols-1 gap-2 md:grid-cols-3"
              >
                <div className="flex items-center space-x-2 rounded-2xl border border-[#171414]/15 bg-white/50 p-3 has-[[data-state=checked]]:border-[#171414] has-[[data-state=checked]]:bg-white/80">
                  <RadioGroupItem value="nin" id="nin-apply" />
                  <Label htmlFor="nin-apply" className="cursor-pointer">NIN (National ID)</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-2xl border border-[#171414]/15 bg-white/50 p-3 has-[[data-state=checked]]:border-[#171414] has-[[data-state=checked]]:bg-white/80">
                  <RadioGroupItem value="passport" id="passport-apply" />
                  <Label htmlFor="passport-apply" className="cursor-pointer">Passport</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-2xl border border-[#171414]/15 bg-white/50 p-3 has-[[data-state=checked]]:border-[#171414] has-[[data-state=checked]]:bg-white/80">
                  <RadioGroupItem value="license" id="license-apply" />
                  <Label htmlFor="license-apply" className="cursor-pointer">Driver's License</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="id-number-apply">{idTypes[idType].label}</Label>
              <Input
                id="id-number-apply"
                placeholder={idTypes[idType].placeholder}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(["front", "back"] as const).map((side) => {
                const uploaded = side === "front" ? idFrontUploaded : idBackUploaded
                return (
                  <div key={side} className="rounded-2xl border border-[#171414]/10 bg-white/50 p-3">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div
                        className={`flex h-28 w-full items-center justify-center rounded-xl border-2 border-dashed ${
                          uploaded ? "border-success/40 bg-success/5" : "border-[#171414]/20 bg-white/40"
                        }`}
                      >
                        {uploaded ? (
                          <div className="flex flex-col items-center gap-1">
                            <Check className="h-6 w-6 text-success" />
                            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                              {side} uploaded
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                              {side} of ID
                            </p>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" className={outlineBtn} onClick={() => handleIdUpload(side)}>
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        {uploaded ? "Re-upload" : `Upload ${side === "front" ? "Front" : "Back"}`}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" className={outlineBtn} onClick={handlePrevStep}>
              Previous Step
            </Button>
            <Button onClick={handleNextStep} className={primaryBtn} disabled={!idFrontUploaded || !idBackUploaded}>
              Complete KYC & Proceed to Jewelry Evaluation →
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
