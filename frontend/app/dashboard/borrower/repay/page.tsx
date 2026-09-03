"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Scale,
  Clock,
  ArrowRight,
  Copy,
  Zap,
} from "lucide-react"
import { ethers } from "ethers"
import apiInstance from "@/lib/axios-v1"
import { useProofProgress } from "@/store/proof-progress"
import {
  SEPOLIA_REPAYMENT_GATEWAY_ADDRESS,
  REPAYMENT_GATEWAY_ABI,
  SEPOLIA_EXPLORER_URL,
  switchOrAddSepoliaNetwork,
  SEPOLIA_CHAIN_ID,
} from "@/lib/contracts/sepolia-gateways"

const SEPOLIA_EXPLORER = "https://eth-sepolia.blockscout.com"
const CC3_EXPLORER = "https://creditcoin-testnet.blockscout.com"

type StepStatus = "idle" | "broadcasting" | "sepolia_confirmed" | "proving" | "settled" | "error"

interface Loan {
  sagId: string
  tokenId: string
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
  const { walletAddress, balance } = useWalletAuth()
  const { addJob } = useProofProgress()

  const [loans, setLoans] = useState<Loan[]>([])
  const [loadingLoans, setLoadingLoans] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [repayAmount, setRepayAmount] = useState("")
  const [status, setStatus] = useState<StepStatus>("idle")
  const [sepoliaTxHash, setSepoliaTxHash] = useState("")
  const [sepoliaBlock, setSepoliaBlock] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [ethPrice, setEthPrice] = useState(0)
  const [lockedPrice, setLockedPrice] = useState(0)

  const walletBalance = balance || "0"

  useEffect(() => {
    const fetchPrice = () => {
      apiInstance
        .get("/eth-price")
        .then((res) => {
          const price = res.data?.data?.usd
          if (price && price > 0) setEthPrice(price)
        })
        .catch(() => {})
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, 60_000)
    return () => clearInterval(interval)
  }, [])

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

        const tokenId = BigInt(selectedLoan.tokenId)
        const value = ethers.parseEther(repayAmount)

        const usdAmount = (Number(repayAmount) * (lockedPrice || ethPrice)).toFixed(2)
        toast.info(`Sending ${repayAmount} ETH (~$${usdAmount}) to RepaymentGateway...`)
        const tx = await gatewayContract.repay(tokenId, value, { value })
        setSepoliaTxHash(tx.hash)

        const receipt = await tx.wait(1)
        setSepoliaBlock(receipt.blockNumber)
        setStatus("sepolia_confirmed")
        toast.success(`Confirmed in block #${receipt.blockNumber}!`)

        // Record repayment in backend
        const usdVal = (Number(repayAmount) * (lockedPrice || ethPrice)).toFixed(2)
        try {
          await apiInstance.post(`/pledge-requests/repay-by-sag/${selectedLoan.tokenId}`, {
            txHash: tx.hash,
            amountUsd: Number(usdVal),
          }, { timeout: 10000 })
        } catch {}

        // Queue CC3 proof in background
        setStatus("proving")
        try {
          const response = await apiInstance.post(
            "/loan/repay/prove",
            { tokenId: Number(selectedLoan.tokenId), sourceTxHash: tx.hash, chainKey: 1 },
            { timeout: 30000 }
          )
          if (response.data?.success) {
            addJob({
              type: "repay",
              jobId: response.data.data.jobId,
              sagName: selectedLoan.sagName || `SAG #${selectedLoan.tokenId}`,
              sagTokenId: selectedLoan.tokenId,
              amountUsd: selectedLoan.sagProperties?.loan || 0,
              ethAmount: repayAmount,
              sourceTxHash: tx.hash,
            })
          }
        } catch {}

        setStatus("settled")
        toast.success("Repayment sent! CC3 proof processing in background.")
      } else {
        throw new Error("No EVM wallet detected. Please install MetaMask.")
      }
    } catch (err: any) {
      console.error("Repayment error:", err)
      setStatus("error")
      const msg = err?.message || "Repayment failed"
      if (msg.includes("user-rejected") || msg.includes("User denied") || msg.includes("ACTION_REJECTED")) {
        setErrorMessage("You cancelled the transaction in MetaMask. No funds were sent.")
      } else if (msg.includes("insufficient funds") || msg.includes("INSUFFICIENT_FUNDS")) {
        setErrorMessage(
          `Your wallet doesn\'t have enough ETH for this repayment.${ethPrice > 0 && repayAmount ? ` You need ~$${(Number(repayAmount) * ethPrice).toFixed(2)} USD worth of ETH.` : ""} Top up your wallet and try again.`
        )
      } else if (msg.includes("nonce")) {
        setErrorMessage("Transaction nonce error. Please wait a moment and try again, or restart MetaMask.")
      } else if (msg.includes("network") || msg.includes("chain")) {
        setErrorMessage("Network error. Please make sure your wallet is connected to Sepolia.")
      } else {
        setErrorMessage(msg)
      }
      toast.error("Repayment failed")
    }
  }

  const resetForm = () => {
    setStatus("idle")
    setSelectedLoan(null)
    setRepayAmount("")
    setSepoliaTxHash("")
    setSepoliaBlock(null)
    setErrorMessage("")
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/borrower")}
        className="flex items-center gap-2 text-sm font-bold text-[#4A4A4A] hover:text-[#171414] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div>
        <p className="kicker mb-2">Loan Repayment</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">
          Repay Your Loan
        </h1>
        <p className="mt-2 text-sm text-[#4A4A4A]">
          Send ETH to the RepaymentGateway on Sepolia. Attestcoin verifies your payment on CC3.
        </p>
      </div>

      {/* Success State */}
      {status === "settled" && (
        <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#171414]">Repayment Sent</h3>
                <p className="mt-1 text-sm text-[#4A4A4A]">
                  {repayAmount} ETH (~${(Number(repayAmount) * (lockedPrice || ethPrice)).toFixed(2)} USD) for SAG #{selectedLoan?.tokenId} confirmed on Sepolia.
                  <br />
                  CC3 proof is being generated in the background.
                </p>
              </div>

              {/* Tx links */}
              <div className="w-full max-w-sm space-y-2">
                {sepoliaTxHash && (
                  <div className="flex items-center justify-between rounded-xl bg-[#171414]/3 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">Sepolia Tx</span>
                    <a
                      href={`${SEPOLIA_EXPLORER}/tx/${sepoliaTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-xs text-[#e1bac2] hover:underline"
                    >
                      {sepoliaTxHash.slice(0, 10)}...{sepoliaTxHash.slice(-6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl bg-[#171414]/3 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A]/50">CC3 Proof</span>
                  <span className="text-xs text-[#4A4A4A]/60">Processing in background...</span>
                </div>
              </div>

              <Button onClick={resetForm} variant="outline" className="rounded-xl mt-2">
                Make Another Repayment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repayment Form */}
      {status !== "settled" && (
        <>
          {/* How it works */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Wallet, label: "Send ETH", desc: "To RepaymentGateway" },
              { icon: Shield, label: "Attestcoin Proves", desc: "On CC3" },
              { icon: CheckCircle2, label: "Settled", desc: "Pawnshop receives" },
            ].map((step, i) => (
              <div key={step.label} className="flex flex-col items-center text-center rounded-xl bg-white/50 border border-white/60 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171414]/5 mb-2">
                  <step.icon className="h-4 w-4 text-[#e1bac2]" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#171414]">{step.label}</p>
                <p className="text-[9px] text-[#4A4A4A]/50">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Loan Selection */}
          <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[#4A4A4A]/60">Select Active Loan</Label>
                {loadingLoans ? (
                  <div className="flex items-center gap-2 text-sm text-[#4A4A4A]/60 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-[#e1bac2]" /> Loading loans...
                  </div>
                ) : loans.length === 0 ? (
                  <div className="py-4 text-center">
                    <Scale className="mx-auto mb-2 h-8 w-8 text-[#4A4A4A]/20" />
                    <p className="text-sm font-bold text-[#171414]">No active loans</p>
                    <p className="text-xs text-[#4A4A4A]/50">Apply for a loan first.</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {loans.map((loan) => (
                      <button
                        key={loan.sagId}
                        onClick={() => {
                          setSelectedLoan(loan)
                          setRepayAmount("")
                        }}
                        disabled={status === "broadcasting" || status === "proving"}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          selectedLoan?.sagId === loan.sagId
                            ? "border-[#e1bac2] bg-[#e1bac2]/10 shadow-sm"
                            : "border-white/60 bg-white/40 hover:bg-white/60 hover:border-[#e1bac2]/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171414]/5">
                              <Scale className="h-5 w-5 text-[#e1bac2]" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#171414]">
                                {loan.sagName || `SAG #${loan.tokenId}`}
                              </p>
                              <p className="text-xs text-[#4A4A4A]/60">
                                {loan.sagProperties?.weightG}g {loan.sagProperties?.karat}K Gold
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-bold text-[#171414]">
                                ${loan.sagProperties?.loan?.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-[#4A4A4A]/50">Loan Amount</p>
                            </div>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                              Active
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Amount Input */}
          {selectedLoan && (
            <Card className="border-white/60 bg-white/70 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#4A4A4A]/60">Repayment Amount</Label>
                    {walletBalance && Number(walletBalance) > 0 && (
                      <span className="text-[10px] text-[#4A4A4A]/50">
                        Wallet: {Number(walletBalance).toFixed(4)} ETH{ethPrice > 0 && <span> ≈ ${(Number(walletBalance) * ethPrice).toFixed(2)}</span>}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]/40" />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      disabled={status === "broadcasting" || status === "proving"}
                      className="rounded-xl pl-10 pr-16 font-mono text-lg h-12"
                      min="0"
                      step="0.001"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-[#4A4A4A]/40">
                      ETH
                    </span>
                  </div>
                  {repayAmount && ethPrice > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-xs text-[#4A4A4A]/60">
                        ≈ ${(Number(repayAmount) * (lockedPrice || ethPrice)).toFixed(2)} USD
                      </p>
                      <p className="text-[10px] text-[#4A4A4A]/40">
                        @ ${(lockedPrice || ethPrice).toLocaleString()}/ETH
                        {lockedPrice > 0 && lockedPrice !== ethPrice && (
                          <span className="ml-1 text-[#e1bac2]">locked</span>
                        )}
                      </p>
                    </div>
                  )}
                  {repayAmount && walletBalance && Number(repayAmount) > Number(walletBalance) && (
                    <p className="mt-1 text-xs text-red-500 font-bold">
                      ⚠ Amount exceeds your wallet balance ({Number(walletBalance).toFixed(4)} ETH)
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {["0.001", "0.005", "0.01", "0.05"].map((eth) => (
                      <button
                        key={eth}
                        type="button"
                        onClick={() => {
                          setRepayAmount(eth)
                          setLockedPrice(ethPrice)
                        }}
                        disabled={status === "broadcasting" || status === "proving"}
                        className="flex-1 rounded-lg border border-[#171414]/10 bg-white/50 px-3 py-2 text-center transition-colors hover:bg-[#e1bac2]/10 hover:border-[#e1bac2]/30 disabled:opacity-50"
                      >
                        <p className="font-mono text-xs font-bold text-[#171414]">{eth}</p>
                        <p className="font-mono text-[9px] text-[#4A4A4A]/40">ETH</p>
                        {ethPrice > 0 && (
                          <p className="font-mono text-[9px] text-[#4A4A4A]/50">${(Number(eth) * ethPrice).toFixed(2)}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                {(status === "broadcasting" || status === "sepolia_confirmed" || status === "proving") && (
                  <div className="rounded-xl bg-[#171414]/3 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-[#e1bac2]" />
                      <span className="text-xs font-bold text-[#171414]">
                        {status === "broadcasting" && "Sending to RepaymentGateway..."}
                        {status === "sepolia_confirmed" && "Confirmed! Queuing CC3 proof..."}
                        {status === "proving" && "CC3 proof queued. Check banner for progress."}
                      </span>
                    </div>
                    {sepoliaTxHash && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#4A4A4A]/50">Sepolia Tx</span>
                        <a
                          href={`${SEPOLIA_EXPLORER}/tx/${sepoliaTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-[#e1bac2] hover:underline"
                        >
                          {sepoliaTxHash.slice(0, 10)}... <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {status === "error" && errorMessage && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-800">Repayment Failed</p>
                      <p className="mt-1 text-[11px] text-red-600 font-mono break-all">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={handleRepay}
                    disabled={!selectedLoan || !repayAmount || Number(repayAmount) <= 0 || (walletBalance && Number(repayAmount) > Number(walletBalance)) || status === "broadcasting" || status === "proving"}
                    className="w-full rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black h-12 text-sm font-bold gap-2"
                  >
                    {status === "broadcasting" || status === "proving" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Repay on Sepolia
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await switchOrAddSepoliaNetwork()
                        toast.success("Switched to Sepolia")
                      } catch (err: any) {
                        toast.error(err.message)
                      }
                    }}
                    className="w-full rounded-xl text-xs h-9"
                  >
                    Switch Wallet to Sepolia
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
