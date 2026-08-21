'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw, ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/logo'

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF8] items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center rounded-full bg-[#171414] py-2 pl-2 pr-4">
            <Logo asLink={false} surface="dark" />
          </div>
        </div>

        {/* Error Card */}
        <div className={`${glass} p-8 sm:p-10 text-center`}>
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1BAC2]/20">
            <AlertTriangle className="h-8 w-8 text-[#171414]" />
          </div>

          {/* Title */}
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171414]">
            Something went wrong
          </h1>

          {/* Subtitle */}
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-[#4A4A4A]">
            {error.message?.includes('SAG')
              ? 'Failed to load investment opportunities'
              : 'We encountered an unexpected error'}
          </p>

          {/* Error digest (dev) */}
          {error.digest && (
            <p className="mt-2 font-mono text-[10px] text-[#4A4A4A]/60">
              Error ID: {error.digest}
            </p>
          )}

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <button
              onClick={reset}
              className="w-full rounded-full bg-[#171414] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#E1BAC2] transition-colors hover:bg-black flex items-center justify-center gap-2"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Try Again
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full rounded-full border border-[#171414]/15 bg-white/60 px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#171414] transition-colors hover:bg-[#171414]/5 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Home
            </button>
          </div>

          {/* Dev details */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] hover:text-[#171414]">
                Technical Details
              </summary>
              <pre className="mt-2 rounded-xl bg-[#F5F5F3] border border-[#171414]/10 p-3 font-mono text-[11px] text-[#4A4A4A] overflow-auto max-h-40">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>

        {/* Help text */}
        <p className="text-center font-mono text-[10px] text-[#4A4A4A]/60">
          If this persists, check your network connection or try again later.
        </p>
      </div>
    </div>
  )
}
