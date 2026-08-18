import { HowItWorks } from "@/components/how-it-works"
import { MarketingHero } from "@/components/marketing-hero"
import { Reveal } from "@/components/reveal"
import { SectionHeading } from "@/components/section-heading"
import { Shield, Zap, FileCheck } from "lucide-react"

const benefits = [
  {
    icon: Shield,
    title: "Shariah Compliant",
    description: "Fully compliant with Islamic finance principles and Ar-Rahnu practice.",
  },
  {
    icon: Zap,
    title: "Fast & Secure",
    description: "AI-assisted appraisal with on-chain security for rapid processing.",
  },
  {
    icon: FileCheck,
    title: "Tokenized Collateral",
    description: "Your gold becomes a SAG note — transparent, verifiable ownership.",
  },
]

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <MarketingHero
          kicker="How It Works"
          title="How it works"
          description="Turn physical gold into Shariah-compliant financing through a transparent, auditable pipeline — appraisal, tokenization, funding, and settlement."
          children={
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E1BAC2]/40 bg-[#E1BAC2]/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#E1BAC2]">
              Creditcoin CC3 · Gold-Backed
            </span>
          }
        />

        <section className="bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <SectionHeading
              tag="The Process"
              title="From gold to liquidity,"
              accent="in five steps."
            />
            <Reveal>
              <HowItWorks />
            </Reveal>
          </div>
        </section>

        <section className="border-t border-[#171414]/15 bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <SectionHeading
              tag="Why Sanad"
              title="Why choose"
              accent="our platform."
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="glass-panel-hover glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-8"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#E1BAC2]/10">
                    <benefit.icon className="h-6 w-6 text-[#E1BAC2]" aria-hidden />
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#171414]">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A4A4A]">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
