import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "compact"
  size?: "sm" | "md" | "lg"
  className?: string
  asLink?: boolean
  surface?: "light" | "dark"
}

/**
 * Sanad wordmark — uses the logo image from public/images/logo.png.
 * Built for the Flux system: adapts to both frosted header and dark footer surfaces.
 */
export function Logo({ variant = "full", size = "md", className = "", asLink = true, surface = "light" }: LogoProps) {
  const content = (
    <>
      <Image
        src="/images/logo.png"
        alt="Sanad Protocol"
        width={variant === "compact" ? 36 : size === "lg" ? 240 : 160}
        height={variant === "compact" ? 36 : size === "lg" ? 60 : 40}
        className={cn(
          "h-auto shrink-0 object-contain transition-opacity group-hover:opacity-90",
          variant === "compact"
            ? "h-9 w-9"
            : size === "lg"
              ? "h-16 w-auto"
              : "h-10 w-auto",
        )}
        priority
      />
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
