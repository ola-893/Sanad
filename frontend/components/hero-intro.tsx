import Link from "next/link"
import { ArrowDown, ArrowRight } from "lucide-react"
import { GoldBar } from "@/components/gold-bar"

/**
 * Landing hero — Flux two-column composition.
 * Editorial copy on the left, the procedural gold ingot on the right.
 */
export function HeroIntro() {
  return (
    <section className="relative flex min-h-screen w-full items-center overflow-hidden bg-[#F5F5F3]">
      {/* Radial gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_68%_40%,rgba(250,250,248,0.96)_0%,rgba(245,245,243,0.76)_56%,rgba(235,235,232,0.9)_100%)]"
      />
      {/* Fine grid */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(rgba(23,20,20,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(23,20,20,0.03)_1px,transparent_1px)] bg-[size:72px_72px]"
      />

      <div className="container relative z-10 grid grid-cols-1 items-center gap-16 px-6 pb-24 pt-28 lg:grid-cols-2 lg:gap-10 lg:pb-28 lg:pt-32">
        {/* Copy */}
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#171414]/20 bg-white/35 px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#171414]">
            <span className="h-1.5 w-1.5 rotate-45 bg-[#E1BAC2]" aria-hidden />
            Sanad Protocol · Creditcoin CC3
          </span>

          <h1 className="mt-7 font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-[#171414] sm:text-6xl lg:text-7xl">
            Gold, vaulted.
            <br />
            <span className="font-semibold text-[#4A4A4A]">Liquidity, unlocked.</span>
          </h1>

          <p className="mt-7 max-w-md text-sm leading-relaxed text-[#4A4A4A] sm:text-base">
            A Shariah-compliant credit network that turns physical gold into on-chain notes —
            connecting 50,000+ Ar-Rahnu operators to global liquidity, with every loan auditable
            from vault to settlement.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/login"
              className="flux-pill inline-flex items-center justify-center gap-2 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em]"
            >
              Apply Now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-[#171414]/20 bg-white/75 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#171414] shadow-[0_0_24px_rgba(225,186,194,0.2)] backdrop-blur-md transition-all hover:bg-[#E1BAC2] hover:text-[#171414]"
            >
              How It Works
            </Link>
          </div>

        </div>

        {/* Procedural gold ingot */}
        <div className="relative flex items-center justify-center">
          <GoldBar intensity={0.55} className="w-full max-w-[560px]" />
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-2.5">
        <ArrowDown className="h-3.5 w-3.5 animate-bounce text-[#E1BAC2]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#171414]/50">
          Scroll to explore
        </span>
      </div>
    </section>
  )
}
