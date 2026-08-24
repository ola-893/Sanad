import Link from "next/link"
import { ArrowDown, ArrowRight } from "lucide-react"

/**
 * Landing hero — video background matching hero bg, extends behind header.
 */
export function HeroIntro() {
  return (
    <section className="relative -mt-16 flex min-h-screen w-full items-center overflow-hidden bg-black pt-16">
      <div className="container relative z-10 grid grid-cols-1 items-center gap-10 px-6 pb-16 pt-24 md:gap-12 md:pb-20 md:pt-28 lg:grid-cols-2 lg:gap-8 lg:pb-28 lg:pt-32 xl:gap-12">
        {/* Copy — 50% on lg+ */}
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rotate-45 bg-[#E1BAC2]" aria-hidden />
            Sanad Protocol · Creditcoin CC3
          </span>

          <h1 className="mt-7 font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Gold, vaulted.
            <br />
            <span className="font-semibold text-white/70">Liquidity, unlocked.</span>
          </h1>

          <p className="mt-7 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
            A Shariah-compliant credit network that turns physical gold into on-chain notes —
            connecting 50,000+ Ar-Rahnu operators to global liquidity, with every loan auditable
            from vault to settlement.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E1BAC2] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#171414] shadow-[0_0_24px_rgba(225,186,194,0.3)] transition-all hover:bg-[#d4a6af]"
            >
              Apply Now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md transition-all hover:bg-[#E1BAC2] hover:text-[#171414]"
            >
              How It Works
            </Link>
          </div>
        </div>

        {/* Hero video — 50% on lg+ */}
        <div className="relative flex items-center justify-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            // @ts-expect-error — fetchPriority is valid HTML but not yet in React types
            fetchPriority="high"
            poster="/video/hero_2_poster.jpg"
            className="w-full object-contain"
          >
            <source src="/video/hero_2.webm" type="video/webm" />
          </video>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-2.5">
        <ArrowDown className="h-3.5 w-3.5 animate-bounce text-[#E1BAC2]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
          Scroll to explore
        </span>
      </div>
    </section>
  )
}
