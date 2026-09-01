"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ShieldCheck,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Coins,
  Cpu,
  Layers,
  Sparkles,
  ArrowUpRight,
} from "lucide-react"
import { toast } from "sonner"
import apiInstance from "@/lib/axios-v1"
import {
  SEPOLIA_INVESTOR_VAULT_ADDRESS,
  INVESTOR_VAULT_ABI,
  SEPOLIA_EXPLORER_URL,
  switchOrAddSepoliaNetwork,
  SEPOLIA_CHAIN_ID,
  checkEip7702Delegation,
} from "@/lib/contracts/sepolia-gateways"
import { SANAD_LIQUIDITY_POOL_ADDRESS, SANAD_LIQUIDITY_POOL_ABI } from "@/lib/contracts/sanad-liquidity-pool"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/70 shadow-soft-editorial"

type StepStatus = "idle" | "broadcasting" | "sepolia_confirmed" | "proving" | "settled" | "error"

interface CrossChainDepositCardProps {
  onSuccess?: () => void
}

export function CrossChainDepositCard({ onSuccess }: CrossChainDepositCardProps) {
  const [amountWei, setAmountWei] = useState<string>("1000")
  const [status, setStatus] = useState<StepStatus>("idle")
  const [sepoliaTxHash, setSepoliaTxHash] = useState<string>("")
  const [sepoliaBlock, setSepoliaBlock] = useState<number | null>(null)
  const [cc3TxHash, setCc3TxHash] = useState<string>("")
  const [creditedLpBalance, setCreditedLpBalance] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [statusText, setStatusText] = useState<string>("")

  const cc3ExplorerBase =
    process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || "https://creditcoin-testnet.blockscout.com"

  const handleSwitchNetwork = async () => {
    try {
      await switchOrAddSepoliaNetwork()
      toast.success("Switched network to Ethereum Sepolia")
    } catch (err: any) {
      toast.error(err.message || "Failed to switch network")
    }
  }

  const handleExecuteDeposit = async () => {
    if (!amountWei || BigInt(amountWei || "0") <= BigInt(0)) {
      toast.error("Please enter a valid deposit amount in wei")
      return
    }

    setErrorMessage(null)
    setStatus("broadcasting")
    setProgressPercent(15)
    setStatusText("Broadcasting deposit to Sepolia Investor Vault...")

    let txHash = sepoliaTxHash.trim()

    try {
      // 1. Check if MetaMask is available to broadcast on Sepolia
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const network = await provider.getNetwork()

        // Switch to Sepolia if needed
        if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
          toast.info("Switching wallet to Ethereum Sepolia testnet...")
          await switchOrAddSepoliaNetwork()
        }

        const signer = await provider.getSigner()
        const userAddress = await signer.getAddress()

        // Pre-flight check: EIP-7702 delegation detection
        const delegation = await checkEip7702Delegation(provider, userAddress)
        if (delegation.isDelegated) {
          const errMsg = `EIP-7702 Account Delegation Detected: Wallet ${userAddress.slice(0, 8)}... has active delegation to ${delegation.delegatedAddress?.slice(0, 8)}... Transactions are routed through DelegationManager with 0 wei value, causing Attestcoin proofs to fail on Creditcoin CC3. Please revoke EIP-7702 delegation or use a standard EOA wallet.`
          setErrorMessage(errMsg)
          setStatus("error")
          toast.error("EIP-7702 Delegation Detected", {
            description: "Your wallet routes calls through a delegation proxy, which prevents CC3 proof verification. Please revoke delegation or use a standard EOA.",
            duration: 12000,
          })
          return
        }

        const vaultContract = new ethers.Contract(
          SEPOLIA_INVESTOR_VAULT_ADDRESS,
          INVESTOR_VAULT_ABI,
          signer
        )

        const val = BigInt(amountWei)
        toast.info(`Depositing ${amountWei} wei into Sepolia InvestorVault...`)

        const tx = await vaultContract.deposit(val, {
          value: val,
        })

        txHash = tx.hash
        setSepoliaTxHash(txHash)
        setStatusText(`Waiting for Sepolia block confirmation (Tx: ${txHash.slice(0, 10)}...)...`)
        setProgressPercent(35)

        const receipt = await tx.wait(1)
        setSepoliaBlock(receipt.blockNumber)
        setStatus("sepolia_confirmed")
        toast.success(`Sepolia deposit confirmed in block #${receipt.blockNumber}!`)
      } else {
        if (!txHash) {
          throw new Error("No EVM wallet detected. Please paste a confirmed Sepolia transaction hash.")
        }
      }

      // 2. Request Attestcoin Proof & Credit LP balance on CC3
      setStatus("proving")
      setProgressPercent(60)
      setStatusText("Generating Attestcoin cryptographic proof via CC3 Prover...")

      const response = await apiInstance.post("/investor/deposit/prove", {
        sourceTxHash: txHash,
        chainKey: 1, // 1 = Sepolia
      }, { timeout: 900000 })  // 15 min — CC3 proof can be slow

      if (!response.data?.success) {
        throw new Error(response.data?.error || response.data?.message || "Attestcoin proof verification failed")
      }

      const resultData = response.data.data
      const settledCc3Hash = resultData.cc3TxHash || resultData.transactionHash
      setCc3TxHash(settledCc3Hash)
      setProgressPercent(100)
      setStatus("settled")
      setStatusText("Cross-chain deposit verified and LP balance credited on Creditcoin CC3!")

      toast.success("Cross-chain deposit cryptographically verified on CC3!", {
        description: `Credit Tx: ${settledCc3Hash?.slice(0, 12)}...`,
        action: {
          label: "View CC3 Tx",
          onClick: () => window.open(`${cc3ExplorerBase}/tx/${settledCc3Hash}`, "_blank"),
        },
      })

      // Query updated investor LP balance on CC3
      try {
        const cc3Provider = new ethers.JsonRpcProvider("https://rpc.cc3-testnet.creditcoin.network")
        const poolContract = new ethers.Contract(
          SANAD_LIQUIDITY_POOL_ADDRESS,
          SANAD_LIQUIDITY_POOL_ABI,
          cc3Provider
        )
        const recipient = resultData.investor || (typeof window !== "undefined" && (window as any).ethereum?.selectedAddress)
        if (recipient) {
          const bal = await poolContract.lpBalances(recipient)
          setCreditedLpBalance(ethers.formatEther(bal))
        }
      } catch (err) {
        console.warn("Could not query updated CC3 LP balance:", err)
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error("Cross-chain deposit error:", err)
      setStatus("error")
      setErrorMessage(err.message || "Cross-chain deposit failed")
      toast.error(err.message || "Failed to process cross-chain deposit")
    }
  }

  return (
    <Card className={glass}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
              <Coins className="h-4 w-4" />
            </span>
            <div>
              <p className="kicker-gold">Attestcoin Cross-Chain Gateway</p>
              <CardTitle className="font-display text-xl">Sepolia Investor Deposit</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 text-[10px] font-mono">
              Sepolia (ChainKey: 1) ➔ CC3 (102031)
            </Badge>
          </div>
        </div>
        <CardDescription>
          Deposit liquidity from Ethereum Sepolia directly into the Sanad Ar-Rahnu Liquidity Pool. Creditcoin's Attestcoin Prover proves your deposit on-chain and credits your LP share.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Gateway Architecture Notice */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-950 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-emerald-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Investor Vault Contract:</span>
            <a
              href={`${SEPOLIA_EXPLORER_URL}/address/${SEPOLIA_INVESTOR_VAULT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] underline hover:text-emerald-700 break-all"
            >
              {SEPOLIA_INVESTOR_VAULT_ADDRESS}
            </a>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Strict <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">msg.value == amount</code> verification ensures 100% cryptographic collateral backing.
          </p>
        </div>

        {/* Input Parameters */}
        <div className="space-y-2">
          <Label htmlFor="amountWeiDeposit">Deposit Amount (Wei)</Label>
          <Input
            id="amountWeiDeposit"
            type="text"
            placeholder="e.g. 1000"
            value={amountWei}
            onChange={(e) => setAmountWei(e.target.value)}
            disabled={status === "broadcasting" || status === "proving"}
          />
          <div className="flex gap-1.5 pt-1">
            {["1000", "5000", "10000", "1000000"].map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setAmountWei(preset)}
              >
                {preset} wei
              </Button>
            ))}
          </div>
        </div>

        {/* Manual Tx Override / Fallback */}
        <div className="space-y-2">
          <Label htmlFor="sepoliaTxHashDeposit">Existing Sepolia Transaction Hash (Optional / Relay Mode)</Label>
          <Input
            id="sepoliaTxHashDeposit"
            type="text"
            placeholder="0x..."
            value={sepoliaTxHash}
            onChange={(e) => setSepoliaTxHash(e.target.value)}
            disabled={status === "broadcasting" || status === "proving"}
            className="font-mono text-xs"
          />
        </div>

        {/* Status Progress Bar */}
        {(status === "broadcasting" || status === "sepolia_confirmed" || status === "proving" || status === "settled") && (
          <div className="space-y-2 rounded-2xl border border-black/10 bg-[#FAFAF8] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium flex items-center gap-1.5">
                {status === "settled" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                )}
                {statusText}
              </span>
              <span className="font-mono text-muted-foreground">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Error Notification */}
        {status === "error" && errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-950">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-900">Deposit Error</p>
              <p className="font-mono text-[11px] break-all">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Verification Summary */}
        {status === "settled" && (
          <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
            <div className="flex items-center gap-2 font-semibold text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Cross-Chain Deposit Credited On-Chain</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 pt-1 font-mono text-[11px]">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase">1. Sepolia Deposit Tx</p>
                <a
                  href={`${SEPOLIA_EXPLORER_URL}/tx/${sepoliaTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline flex items-center gap-1 hover:text-emerald-900 break-all"
                >
                  {sepoliaTxHash.slice(0, 14)}...{sepoliaTxHash.slice(-8)}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>

              <div>
                <p className="text-muted-foreground text-[10px] uppercase">2. CC3 Pool Credit Tx</p>
                <a
                  href={`${cc3ExplorerBase}/tx/${cc3TxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline flex items-center gap-1 hover:text-emerald-900 break-all"
                >
                  {cc3TxHash.slice(0, 14)}...{cc3TxHash.slice(-8)}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            </div>

            {creditedLpBalance !== null && (
              <div className="mt-2 rounded-xl bg-white/80 p-3 border border-emerald-200/60 flex items-center justify-between">
                <span className="text-muted-foreground">Updated Total LP Stake:</span>
                <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-800 font-mono">
                  {creditedLpBalance} tCTC
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleExecuteDeposit}
            disabled={status === "broadcasting" || status === "proving"}
            className="flex-1 rounded-xl bg-[#171414] text-[#E1BAC2] hover:bg-black font-medium"
          >
            {status === "broadcasting" || status === "proving" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Proving Deposit on CC3...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4 text-emerald-400" />
                Deposit on Sepolia & Prove on CC3
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleSwitchNetwork}
            className="rounded-xl border-[#171414]/20"
          >
            Switch to Sepolia
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
