"use client"

import { useEffect, useRef } from "react"
import { useProofProgress, type ProofJob } from "@/store/proof-progress"
import apiInstance from "@/lib/axios-v1"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Zap } from "lucide-react"
import { useState } from "react"

const INVEST_STATUS_API = "/investor/deposit/status"
const REPAY_STATUS_API = "/loan/repay/status"

function ProofJobRow({ job }: { job: ProofJob }) {
  const { updateJob, removeJob } = useProofProgress()
  const isPending = job.status === "queued" || job.status === "proving"

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        {job.status === "completed" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : job.status === "failed" ? (
          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
        ) : (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#e1bac2]" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#171414] truncate">
            {job.type === "invest" ? "Investment" : "Repayment"} — {job.sagName || `SAG #${job.sagTokenId}`}
          </p>
          <p className="text-[10px] text-[#4A4A4A]/60 truncate">{job.message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isPending && (
          <div className="w-16">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#171414]/5">
              <div
                className="h-full rounded-full bg-[#e1bac2] transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}
        {job.cc3TxHash && (
          <a
            href={`https://creditcoin-testnet.blockscout.com/tx/${job.cc3TxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-[#e1bac2] hover:underline"
          >
            CC3 ↗
          </a>
        )}
        {!isPending && (
          <button
            onClick={() => removeJob(job.id)}
            className="text-[10px] text-[#4A4A4A]/40 hover:text-[#4A4A4A]"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export function ProofBanner() {
  const { jobs, updateJob } = useProofProgress()
  const [expanded, setExpanded] = useState(false)
  const jobsRef = useRef(jobs)
  jobsRef.current = jobs
  const polledRef = useRef<Set<string>>(new Set())

  const pendingJobs = jobs.filter((j) => j.status === "queued" || j.status === "proving")
  const completedJobs = jobs.filter((j) => j.status === "completed")
  const hasActive = pendingJobs.length > 0

  // Poll all pending jobs
  useEffect(() => {
    if (pendingJobs.length === 0) return

    const interval = setInterval(async () => {
      for (const job of jobsRef.current) {
        if (job.status !== "queued" && job.status !== "proving") continue
        if (polledRef.current.has(`${job.id}-done`)) continue

        const api =
          job.type === "invest"
            ? `${INVEST_STATUS_API}/${job.jobId}`
            : `${REPAY_STATUS_API}/${job.jobId}`

        try {
          const res = await apiInstance.get(api)
          if (res.data?.success && res.data?.data) {
            const { state, result, error: err, progress } = res.data.data

            if (state === "COMPLETED" && result) {
              polledRef.current.add(`${job.id}-done`)
              const cc3Hash = result.transactionHash || result.cc3TxHash || ""
              updateJob(job.id, {
                status: "completed",
                progress: 100,
                message: "Proof verified on CC3!",
                cc3TxHash: cc3Hash,
              })
              // Update repayment record with CC3 hash
              if (job.type === "repay" && cc3Hash) {
                apiInstance.post(`/pledge-requests/repay-by-sag/${job.sagTokenId}`, {
                  txHash: job.sourceTxHash,
                  cc3TxHash: cc3Hash,
                  amountUsd: job.amountUsd || 0,
                }, { timeout: 10000 }).catch(() => {})
              }
            } else if (state === "FAILED") {
              polledRef.current.add(`${job.id}-done`)
              updateJob(job.id, {
                status: "failed",
                message: err || "Proof failed on CC3",
              })
            } else if (progress) {
              updateJob(job.id, {
                status: "proving",
                progress: Math.max(job.progress, progress),
                message:
                  progress >= 75
                    ? "Submitting proof to CC3..."
                    : progress >= 45
                    ? "Generating cryptographic proof..."
                    : "Waiting for Attestcoin prover to index block...",
              })
            }
          }
        } catch {
          // Network errors — keep polling
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [pendingJobs.length, updateJob])

  // Auto-expand when there are active jobs
  useEffect(() => {
    if (hasActive) setExpanded(true)
  }, [hasActive])

  if (jobs.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="border-white/60 bg-white/90 backdrop-blur-xl shadow-lg">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#e1bac2]" />
              <span className="text-xs font-bold text-[#171414]">
                {hasActive
                  ? `${pendingJobs.length} proof${pendingJobs.length > 1 ? "s" : ""} in progress`
                  : `${completedJobs.length} proof${completedJobs.length > 1 ? "s" : ""} completed`}
              </span>
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-[#4A4A4A]/40" />
            ) : (
              <ChevronUp className="h-4 w-4 text-[#4A4A4A]/40" />
            )}
          </div>
        </button>
        {expanded && (
          <CardContent className="border-t border-[#171414]/5 px-4 pb-3 pt-0 max-h-60 overflow-y-auto custom-scrollbar">
            {jobs.map((job) => (
              <ProofJobRow key={job.id} job={job} />
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
