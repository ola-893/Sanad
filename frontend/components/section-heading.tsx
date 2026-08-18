import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Reveal } from "@/components/reveal"

/**
 * Flux-style pill section tag — mono uppercase label in a rounded pill
 * with a rose diamond dot. `dark` for use on ink surfaces.
 */
export function SectionTag({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em]",
        dark
          ? "border-[#F5F5F3]/25 bg-white/5 text-[#F5F5F3]"
          : "border-[#171414]/20 bg-white/35 text-[#171414]",
      )}
    >
      <span className="h-1.5 w-1.5 rotate-45 bg-[#E1BAC2]" aria-hidden />
      {label}
    </span>
  )
}

/**
 * Flux section header — pill tag + two-line Manrope extrabold headline
 * (line one ink, line two muted) + optional body copy.
 */
export function SectionHeading({
  tag,
  title,
  accent,
  body,
  center = false,
  dark = false,
  className,
}: {
  tag: string
  title: string
  accent: string
  body?: string
  center?: boolean
  dark?: boolean
  className?: string
}) {
  return (
    <Reveal
      className={cn(
        "mb-16",
        center ? "mx-auto max-w-3xl text-center" : "max-w-3xl",
        className,
      )}
    >
      <SectionTag label={tag} dark={dark} />
      <h2
        className={cn(
          "mb-4 mt-6 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl",
          dark ? "text-[#F5F5F3]" : "text-[#171414]",
        )}
      >
        {title} <br />
        <span className={cn("font-semibold", dark ? "text-[#F5F5F3]/60" : "text-[#4A4A4A]")}>
          {accent}
        </span>
      </h2>
      {body && (
        <p className={cn("text-sm leading-relaxed sm:text-base", dark ? "text-[#F5F5F3]/70" : "text-[#4A4A4A]")}>
          {body}
        </p>
      )}
    </Reveal>
  )
}

/**
 * Flux frosted glass panel — white/60, backdrop blur, hairline border.
 */
export function GlassPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial",
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Flux dark CTA band — ink ground with rose glow.
 */
export function DarkBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("relative overflow-hidden bg-[#171414] text-[#F5F5F3]", className)}>
      <div
        aria-hidden
        className="absolute -left-32 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-[#E1BAC2]/10 blur-3xl"
      />
      <div className="relative">{children}</div>
    </section>
  )
}
