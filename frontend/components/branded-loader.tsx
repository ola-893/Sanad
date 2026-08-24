"use client"

import Image from "next/image"

export function BrandedLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F3]">
      <div className="flex flex-col items-center gap-6">
        {/* Logo image with pulse ring */}
        <div className="relative">
          {/* Outer ring pulse */}
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#E1BAC2]/30" />
          {/* Static ring */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#171414]/10 bg-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <Image
              src="/images/logo.png"
              alt="Sanad Protocol"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              priority
            />
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
