import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "compact"
  className?: string
  asLink?: boolean
  surface?: "light" | "dark"
}

/**
 * Sanad wordmark — ink seal with rose diamond + Manrope wordmark.
 * Built for the Flux system: the seal is a dark pill that reads on
 * both the frosted header and the dark footer; the wordmark uses
 * currentColor so it adapts to the surface it sits on.
 */
export function Logo({ variant = "full", className = "", asLink = true, surface = "light" }: LogoProps) {
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-[0_0_16px_rgba(225,186,194,0.25)] transition-shadow group-hover:shadow-[0_0_24px_rgba(225,186,194,0.45)]",
          surface === "dark"
            ? "border border-[#E1BAC2]/25 bg-[#E1BAC2]/10"
            : "bg-[#171414]",
        )}
      >
        <span className="h-2.5 w-2.5 rotate-45 bg-[#E1BAC2] shadow-[0_0_8px_rgba(225,186,194,0.6)]" />
      </span>
      {variant === "full" && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-extrabold tracking-tight text-current">
            Sanad
          </span>
          <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.32em] text-[#E1BAC2]">
            Protocol
          </span>
        </span>
      )}
    </>
  )

  const rootClassName = cn(
    "group flex items-center gap-2.5",
    surface === "dark" ? "text-[#F5F5F3]" : "text-[#171414]",
    className,
  )

  if (!asLink) {
    return <span className={rootClassName}>{content}</span>
  }

  return (
    <Link href="/" className={rootClassName} aria-label="Sanad Protocol — home">
      {content}
    </Link>
  )
}
