import type { ReactNode } from "react"
import { Reveal } from "@/components/reveal"
import { cn } from "@/lib/utils"

interface MarketingHeroProps {
  kicker: string
  title: string
  description?: string
  children?: ReactNode
  align?: "left" | "center"
  dark?: boolean
}

export function MarketingHero({
  kicker,
  title,
  description,
  children,
  align = "left",
  dark = false,
}: MarketingHeroProps) {
  return (
    <section
      className={cn(
        "border-b border-border",
        dark ? "bg-deepGreen text-ivory" : "bg-background",
      )}
    >
      <div
        className={cn(
          "container mx-auto px-4 py-16 md:px-6 md:py-20",
          align === "center" && "text-center",
        )}
      >
        <Reveal>
          <p className={cn("chapter-label", dark && "text-gold", align === "center" && "justify-center")}>
            {kicker}
          </p>
          <h1
            className={cn(
              "mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl",
              align === "center" && "mx-auto",
              dark && "text-ivory",
            )}
          >
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                "mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground",
                align === "center" && "mx-auto",
                dark && "text-ivory/80",
              )}
            >
              {description}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </Reveal>
      </div>
    </section>
  )
}
