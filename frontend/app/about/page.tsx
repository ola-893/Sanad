import { MarketingHero } from "@/components/marketing-hero"
import { Reveal } from "@/components/reveal"
import { SectionHeading, SectionTag, DarkBand } from "@/components/section-heading"
import { CheckCircle, Compass, Scale, Lightbulb } from "lucide-react"
import Link from "next/link"

const values = [
  {
    icon: Scale,
    title: "Shariah Compliance",
    description:
      "Every transaction and partnership adheres strictly to Islamic financial principles — reviewed by our Shariah Advisory Group.",
  },
  {
    icon: Compass,
    title: "Transparency",
    description:
      "Complete transparency in all operations: valuation, custody, tokenization, and settlement are auditable on-chain.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We continuously evolve the platform to serve Ar-Rahnu operators and funders in the digital age.",
  },
]

const reasons = [
  {
    title: "Comprehensive Platform",
    description:
      "A one-stop solution connecting Ar-Rahnu operators with Shariah-compliant funders, streamlining the entire funding process.",
  },
  {
    title: "Secure Transactions",
    description:
      "Encrypted custody records, immutable on-chain history, and enterprise-grade access controls.",
  },
  {
    title: "Expanded Reach",
    description:
      "Connect with a wider network of operators and funders across the Islamic finance community.",
  },
  {
    title: "Expert Support",
    description:
      "A team experienced in Islamic finance and Ar-Rahnu operations, guiding you through the platform.",
  },
]

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <MarketingHero
          kicker="About"
          title="The preferred center for gold-backed liquidity"
          description="Sanad connects Ar-Rahnu operators with Shariah-compliant funders on Creditcoin 3 — expanding lending capacity and making portable, verifiable credit histories a reality."
        />

        {/* Mission */}
        <section className="bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto grid grid-cols-1 gap-12 px-4 md:grid-cols-12 md:px-6">
            <Reveal className="md:col-span-5">
              <SectionTag label="Mission" />
              <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-[#171414] md:text-4xl">
                Why Sanad
                <br />
                <span className="font-semibold text-[#4A4A4A]">exists.</span>
              </h2>
            </Reveal>
            <div className="md:col-span-7">
              <Reveal delay={80}>
                <div className="space-y-6 border-l border-[#171414]/15 pl-8">
                  <p className="text-muted-foreground">
                    Sanad Protocol is a platform that connects Ar-Rahnu operators with Shariah-compliant
                    funders on Creditcoin 3, allowing them to expand their capacity to serve more
                    customers effectively.
                  </p>
                  <p className="text-muted-foreground">
                    Our mission is to become the preferred center for liquidity needs by providing a
                    comprehensive platform that connects Ar-Rahnu operators (AROs) and funders,
                    creating a seamless ecosystem that benefits all participants in the Islamic
                    financing space.
                  </p>
                  <p className="text-muted-foreground">
                    Whether you&apos;re an Ar-Rahnu Operator seeking to raise funds or a Short Term
                    Funder looking to make meaningful investments, Sanad welcomes you to our community
                    committed to Islamic finance principles.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-t border-[#171414]/15 bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <SectionHeading tag="Values" title="Our" accent="values." />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="glass-panel-hover glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-8"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#E1BAC2]/10">
                    <value.icon className="h-6 w-6 text-[#E1BAC2]" aria-hidden />
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#171414]">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A4A4A]">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why choose */}
        <section className="bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <SectionHeading tag="Why Sanad" title="Why choose" accent="Sanad." />
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
              {reasons.map((reason, i) => (
                <Reveal key={reason.title} delay={i * 60}>
                  <div className="flex items-start gap-5 border-t border-[#171414]/15 pt-6">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171414]">
                      <CheckCircle className="h-4 w-4 text-[#E1BAC2]" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#171414]">{reason.title}</h3>
                      <p className="mt-2 text-sm text-[#4A4A4A]">{reason.description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Commitment */}
        <DarkBand>
          <div className="container mx-auto px-4 py-16 text-center md:px-6 md:py-20">
            <Reveal>
              <SectionTag label="Commitment" dark />
              <p className="mx-auto mt-8 max-w-3xl font-display text-2xl font-extrabold leading-relaxed tracking-tight md:text-3xl">
                &ldquo;The most reliable, transparent, and Shariah-compliant platform for Ar-Rahnu
                operators and funders — strengthening the Islamic finance ecosystem with every
                tokenized loan.&rdquo;
              </p>
              <Link
                href="/apply"
                className="flux-pill mt-9 inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em]"
              >
                Apply for Financing
              </Link>
            </Reveal>
          </div>
        </DarkBand>
      </main>
    </div>
  )
}
