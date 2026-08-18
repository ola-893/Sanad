"use client"

export function BrandedLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F3]">
      <div className="flex flex-col items-center gap-6">
        {/* Animated diamond logo */}
        <div className="relative">
          {/* Outer ring pulse */}
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#E1BAC2]/30" />
          {/* Static ring */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#171414]/10 bg-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            {/* Spinning diamond */}
            <div className="animate-spin" style={{ animationDuration: "3s" }}>
              <div className="h-8 w-8 rotate-45 border-2 border-[#E1BAC2] bg-gradient-to-br from-[#E1BAC2]/20 to-[#E1BAC2]/5" />
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#171414]">
            Sanad
          </h1>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[#4A4A4A]">
            Shariah-Compliant Finance
          </p>
        </div>

        {/* Loading message */}
        <div className="flex items-center gap-3">
          {/* Animated dots */}
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E1BAC2]" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E1BAC2]" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E1BAC2]" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-sm text-[#4A4A4A]">{message}</span>
        </div>
      </div>
    </div>
  )
}
