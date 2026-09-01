"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { toast } from "sonner"
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Wallet,
  Shield,
  Coins,
  Cpu,
  Sparkles,
  CreditCard,
} from "lucide-react"
import { ethers } from "ethers"
import apiInstance from "@/lib/axios-v1"
import {
  SEPOLIA_REPAYMENT_GATEWAY_ADDRESS,
  REPAYMENT_GATEWAY_ABI,
  SEPOLIA_EXPLORER_URL,
  switchOrAddSepoliaNetwork,
  SEPOLIA_CHAIN_ID,
} from "@/lib/contracts/sepolia-gateways"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

type StepStatus = "idle" | "selecting" | "broadcasting" | "sepolia_confirmed" | "proving" | "settled" | "error"

interface Loan {
  sagId: string
  sagName: string
  status: string
  approvalStatus: string
  sagProperties: {
    weightG: number
    karat: number
    purity: number
    loan: number
    valuation: number
    currency: string
    assetType: string
  }
}

export default function BorrowerRepayPage() {
  const router = useRouter()
  const { walletAddress } = useWalletAuth()

  const [loans, setLoans] = useState<Loan[]>([])
  const [loadingLoans, setLoadingLoans] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)

  const [repayAmount, setRepayAmount] = useState("")
  const [status, setStatus] = useState<StepStatus>("idle")
  const [sepoliaTxHash, setSepoliaTxHash] = useState("")
  const [sepoliaBlock, setSepoliaBlock] = useState<number | null>(null)
  const [cc3TxHash, setCc3TxHash] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [progressPercent, setProgressPercent] = useState(0)
  const [statusText, setStatusText] = useState("")

  const cc3ExplorerBase =
    process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"

  // Fetch borrower's active loans
  useEffect(() => {
    apiInstance
      .get("/sag")
      .then((res) => {
        const allLoans = res.data.data || []
        const activeLoans = allLoans.filter(
          (l: Loan) => l.status === "active" || l.approvalStatus === "approved"
        )
        setLoans(activeLoans)
      })
      .catch(() => setLoans([]))
      .finally(() => setLoadingLoans(false))
  }, [])

  const handleRepay = async () => {
    if (!selectedLoan || !repayAmount || Number(repayAmount) <= 0) {
      toast.error("Please select a loan and enter a valid repayment amount")
      return
    }

    setErrorMessage("")
    setStatus("broadcasting")
    setProgressPercent(15)
    setStatusText("Broadcasting repayment to Sepolia Repayment Gateway...")

    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const network = await provider.getNetwork()

        if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
          toast.info("Switching wallet to Ethereum Sepolia testnet...")
          await switchOrAddSepoliaNetwork()
        }

        const signer = await provider.getSigner()
        const gatewayContract = new ethers.Contract(
          SEPOLIA_REPAYMENT_GATEWAY_ADDRESS,
          REPAYMENT_GATEWAY_ABI,
          signer
        )

        const tokenId = BigInt(selectedLoan.sagId)
        const value = ethers.parseEther(repayAmount)

        toast.info(`Sending ${repayAmount} ETH to Sepolia RepaymentGateway...`)

        const tx = await gatewayContract.repay(tokenId, value, { value })
        setSepoliaTxHash(tx.hash)

        setStatusText(`Waiting for Sepolia block confirmation (Tx: ${tx.hash.slice(0, 10)}...)...`)
        setProgressPercent(35)

        const receipt = await tx.wait(1)
        setSepoliaBlock(receipt.blockNumber)
        setStatus("sepolia_confirmed")
        toast.success(`Sepolia repayment confirmed in block #${receipt.blockNumber}!`)

        // Auto-prove on CC3
        setStatus("proving")
        setProgressPercent(60)
        setStatusText("Generating Attestcoin cryptographic proof via CC3 Prover...")

        const response = await apiInstance.post("/loan/repay/prove", {
          tokenId: Number(selectedLoan.sagId),
          sourceTxHash: tx.hash,
          chainKey: 1,
        }, { timeout: 900000 })  // 15 min — CC3 proof can be slow

        if (!response.data?.success) {
          throw new Error(response.data?.error || response.data?.message || "Attestcoin proof generation failed")
        }

        const resultData = response.data.data
        const settledCc3Hash = resultData.cc3TxHash || resultData.transactionHash
        setCc3TxHash(settledCc3Hash)
        setProgressPercent(100)
        setStatus("settled")
        setStatusText("Cross-chain repayment verified and loan settled on Creditcoin CC3!")

        toast.success("Cross-chain repayment cryptographically verified on CC3!", {
          description: `Settlement Tx: ${settledCc3Hash?.slice(0, 12)}...`,
        })
      } else {
        throw new Error("No EVM wallet detected. Please install MetaMask.")
      }
    } catch (err: any) {
      console.error("Repayment error:", err)
      setStatus("error")
      setErrorMessage(err.message || "Repayment failed")
      toast.error(err.message || "Failed to process repayment")
    }
  }

  const resetForm = () => {
    setStatus("idle")
    setSelectedLoan(null)
    setRepayAmount("")
    setSepoliaTxHash("")
    setSepoliaBlock(null)
    setCc3TxHash("")
    setErrorMessage("")
    setProgressPercent(0)
    setStatusText("")
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
            <p className="kicker-gold">Loan Repayment</p>
            <h1 className="text-3xl font-display font-bold text-[#171414]">
              Repay Your Gold Loan
            </h1>
            <p className="text-muted-foreground mt-1">
              Pay via Ethereum Sepolia. Attestcoin cryptographically verifies your payment on CC3.
            </p>
          </div>

          {/* Attestcoin Architecture Notice */}
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-cyan-950 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-cyan-900">
              <Shield className="h-4 w-4 text-cyan-600" />
              <span>Attestcoin Cross-Chain Repayment</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Your ETH payment on Sepolia is cryptographically verified by Creditcoin's Attestcoin Prover
              and settled on CC3 -- no cross-chain bridges needed. Both the Sepolia source tx and CC3
              proof tx are recorded for full auditability.
            </p>
          </div>

          {/* Success State */}
          {status === "settled" && (
            <Card className={glass}>
              <CardContent className="p-8">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-700" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-display text-xl font-bold text-[#171414]">Repayment Complete!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your repayment of {repayAmount} ETH for SAG #{selectedLoan?.sagId} has been
                      cryptographically verified on CC3.
                    </p>
                  </div>

                  {/* Tx Summary */}
                  <div className="w-full max-w-md rounded-2xl border border-[#171414]/10 bg-[#FAFAF8] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Loan</span>
                      <span className="font-mono text-sm font-bold text-[#171414]">SAG #{selectedLoan?.sagId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Amount Paid</span>
                      <span className="font-mono text-sm font-bold text-emerald-700">{repayAmount} ETH</span>
                    </div>

                    {/* Dual tx hashes */}
                    <div className="pt-2 border-t border-[#171414]/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground">1. Sepolia Source Tx</span>
                        <a
                          href={`${SEPOLIA_EXPLORER_URL}/tx/${sepoliaTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] text-cyan-700 hover:underline flex items-center gap-1"
                        >
                          {sepoliaTxHash.slice(0, 10)}...{sepoliaTxHash.slice(-6)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground">2. CC3 Proof Tx</span>
                        <a
                          href={`${cc3ExplorerBase}/tx/${cc3TxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          {cc3TxHash.slice(0, 10)}...{cc3TxHash.slice(-6)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                        Repaid & Settled on CC3
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="rounded-full"
                  >
                    Make Another Repayment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Repayment Form */}
          {status !== "settled" && (
            <Card className={glass}>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15">
                    <CreditCard className="h-4 w-4 text-cyan-700" />
                  </span>
                  Make Repayment
                </CardTitle>
                <CardDescription>
                  Select your active loan and enter the repayment amount in ETH
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Loan Selection */}
                <div className="space-y-2">
                  <Label>Select Active Loan</Label>
                  {loadingLoans ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading your loans...
                    </div>
                  ) : loans.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-3">
                      No active loans found. Apply for a loan first.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {loans.map((loan) => (
                        <button
                          key={loan.sagId}
                          onClick={() => {
                            setSelectedLoan(loan)
                            setRepayAmount(String(loan.sagProperties?.loan || ""))
                          }}
                          disabled={status === "broadcasting" || status === "proving"}
                          className={`w-full rounded-xl border p-4 text-left transition-all ${
                            selectedLoan?.sagId === loan.sagId
                              ? "border-cyan-500 bg-cyan-50 shadow-md"
                              : "border-[#171414]/10 bg-white/40 hover:bg-white/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[#171414]">
                                {loan.sagName || `SAG #${loan.sagId}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {loan.sagProperties?.weightG}g {loan.sagProperties?.karat}K Gold
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-[#171414]">
                                ${loan.sagProperties?.loan?.toLocaleString()} {loan.sagProperties?.currency || "USD"}
                              </p>
                              <Badge variant="outline" className="text-[9px] font-mono border-emerald-200 bg-emerald-50 text-emerald-700">
                                Active
                              </Badge>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                {selectedLoan && (
                  <div className="space-y-2">
                    <Label htmlFor="repay-amount">Repayment Amount (ETH)</Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="repay-amount"
                        type="number"
                        placeholder="e.g. 0.005"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        disabled={status === "broadcasting" || status === "proving"}
                        className="rounded-xl pl-10 font-mono"
                        min="0"
                        step="0.001"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                        ETH
                      </span>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      {["0.001", "0.005", "0.01", "0.05"].map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => setRepayAmount(preset)}
                          disabled={status === "broadcasting" || status === "proving"}
                        >
                          {preset} ETH
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {(status === "broadcasting" || status === "sepolia_confirmed" || status === "proving") && (
                  <div className="space-y-2 rounded-2xl border border-black/10 bg-[#FAFAF8] p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                        {statusText}
                      </span>
                      <span className="font-mono text-muted-foreground">{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                )}

                {/* Error */}
                {status === "error" && errorMessage && (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-950">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-rose-900">Repayment Error</p>
                      <p className="font-mono text-[11px] break-all">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <Button
                  onClick={handleRepay}
                  disabled={!selectedLoan || !repayAmount || Number(repayAmount) <= 0 || status === "broadcasting" || status === "proving"}
                  className="w-full rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black gap-2"
                >
                  {status === "broadcasting" || status === "proving" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Cross-Chain Proof...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                      Repay on Sepolia & Settle via Attestcoin
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await switchOrAddSepoliaNetwork()
                      toast.success("Switched to Ethereum Sepolia")
                    } catch (err: any) {
                      toast.error(err.message)
                    }
                  }}
                  className="w-full rounded-xl"
                >
                  Switch Wallet to Sepolia
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
