import { MarketingHero } from "@/components/marketing-hero"
import { Reveal } from "@/components/reveal"
import { SectionHeading, SectionTag, DarkBand } from "@/components/section-heading"
import Link from "next/link"

const processSteps = [
  {
    step: "01",
    title: "Appraisal",
    description:
      "The customer brings gold jewelry or precious metals to an Ar-Rahnu operator for valuation by certified appraisers.",
  },
  {
    step: "02",
    title: "Financing",
    description:
      "The operator offers a loan (typically 60–80% of the item's value) as Qard Hasan — an interest-free loan.",
  },
  {
    step: "03",
    title: "Safekeeping",
    description:
      "The jewelry is kept securely by the operator, who charges a safekeeping fee (Ujrah) based on the item's value.",
  },
  {
    step: "04",
    title: "Redemption",
    description:
      "The customer repays the loan plus the safekeeping fee to reclaim their jewelry within the agreed period.",
  },
]

const benefitGroups = [
  {
    title: "For Customers",
    items: [
      "Shariah-compliant financing option",
      "Quick access to cash in emergencies",
      "No interest charges or hidden fees",
      "Higher loan-to-value ratio than conventional pawnshops",
      "Safe storage of valuable items",
      "No impact on credit history",
    ],
  },
  {
    title: "For Operators",
    items: [
      "Stable business model with secured lending",
      "Attractive profit margins through safekeeping fees",
      "Growing market demand from Muslim communities",
      "Lower risk compared to unsecured lending",
      "Contribution to financial inclusion",
    ],
  },
  {
    title: "For the Economy",
    items: [
      "Enhanced financial inclusion for unbanked populations",
      "Circulation of idle gold assets in the economy",
      "Reduced reliance on informal lending channels",
      "Support for micro-enterprises and small businesses",
      "Growth of the Islamic financial ecosystem",
    ],
  },
]

const marketPanels = [
  {
    title: "Global Landscape",
    paragraphs: [
      "The global Ar-Rahnu market has been growing steadily, particularly in countries with significant Muslim populations. Malaysia leads as the most developed Ar-Rahnu market, followed by Brunei, Indonesia, Singapore, and Middle Eastern countries.",
      "The increasing demand for Shariah-compliant financial products and growing awareness of Islamic finance principles have contributed to the expansion of Ar-Rahnu services worldwide.",
    ],
  },
  {
    title: "Malaysian Market",
    paragraphs: [
      "Malaysia's Ar-Rahnu industry has evolved significantly since its inception in the 1990s. The market includes a diverse range of operators, from Islamic banks and cooperatives to dedicated Ar-Rahnu institutions.",
      "The industry is well-regulated under Bank Negara Malaysia and the Malaysia Co-operative Societies Commission, providing a stable and trustworthy environment for both operators and customers.",
    ],
  },
]

const challenges = [
  "Limited funding sources for Ar-Rahnu operators",
  "Competition from conventional pawnshops",
  "Fluctuating gold prices affecting collateral values",
  "Operational costs of secure storage and insurance",
  "Need for standardization of practices across operators",
  "Limited public awareness in some markets",
]

const opportunities = [
  "Digital transformation and online Ar-Rahnu services",
  "Expansion into new markets with Muslim populations",
  "Integration with broader Islamic financial ecosystems",
  "Product diversification beyond gold collateral",
  "Partnership with fintech companies",
  "Access to Shariah-compliant funding through platforms like Sanad",
]

export default function ArRahnuIndustryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <MarketingHero
          kicker="Industry"
          title="The Ar-Rahnu industry"
          description="Understanding the Islamic pawnbroking ecosystem — and how Sanad unlocks capital for its operators."
        />

        {/* What is Ar-Rahnu */}
        <section className="bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto grid grid-cols-1 gap-12 px-4 md:grid-cols-12 md:px-6">
            <Reveal className="md:col-span-5">
              <SectionTag label="Foundations" />
              <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-[#171414] md:text-4xl">
                What is
                <br />
                <span className="font-semibold text-[#4A4A4A]">Ar-Rahnu?</span>
              </h2>
            </Reveal>
            <div className="md:col-span-7">
              <Reveal delay={80}>
                <div className="space-y-6 border-l border-[#171414]/15 pl-8">
                  <p className="text-muted-foreground">
                    Ar-Rahnu is an Islamic pawnbroking service that provides Shariah-compliant
                    short-term financing to individuals and businesses. Customers pledge their gold or
                    precious jewelry as collateral for a cash loan — without interest, which is
                    prohibited in Islamic finance.
                  </p>
                  <p className="text-muted-foreground">
                    The word &quot;Ar-Rahnu&quot; comes from Arabic, meaning &quot;pawning&quot; or
                    &quot;collateral.&quot; This financial instrument is based on the Islamic
                    principles of Qard (interest-free loan), Rahn (collateral), Wadiah (safekeeping),
                    and Ujrah (safekeeping fee).
                  </p>
                  <p className="text-muted-foreground">
                    Unlike conventional pawnshops that charge interest, Ar-Rahnu operators charge a
                    safekeeping fee based on the value of the collateral rather than the loan amount,
                    making it compliant with Islamic law.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How Ar-Rahnu Works */}
        <section className="border-t border-[#171414]/15 bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <SectionHeading tag="Process" title="How Ar-Rahnu" accent="works." />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {processSteps.map((step) => (
                <div
                  key={step.step}
                  className="glass-panel-hover glass-panel rounded-2xl border border-[#171414]/15 bg-white/60 p-7"
                >
                  <span className="rounded-full border border-[#E1BAC2]/20 bg-[#E1BAC2]/10 px-2.5 py-1 font-mono text-[10px] font-bold text-[#E1BAC2]">
                    STEP {step.step}
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-[#171414]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A4A4A]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <SectionHeading tag="Benefits" title="Benefits of" accent="Ar-Rahnu." />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {benefitGroups.map((group) => (
                <div
                  key={group.title}
                  className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-8"
                >
                  <h3 className="font-display text-lg font-bold text-[#171414]">{group.title}</h3>
                  <ul className="mt-5 space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-[#4A4A4A]">
                        <span className="mt-1.5 h-1 w-3 shrink-0 bg-[#E1BAC2]" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Market Overview */}
        <section className="border-t border-[#171414]/15 bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <SectionHeading tag="Market" title="Ar-Rahnu market" accent="overview." />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {marketPanels.map((panel) => (
                <div
                  key={panel.title}
                  className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-8"
                >
                  <h3 className="font-display text-lg font-bold text-[#171414]">{panel.title}</h3>
                  {panel.paragraphs.map((paragraph, i) => (
                    <p key={i} className="mt-4 text-sm leading-relaxed text-[#4A4A4A]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Challenges & Opportunities */}
        <section className="bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <SectionHeading tag="Outlook" title="Challenges &" accent="opportunities." />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Reveal>
                <div className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-8">
                  <h3 className="font-display text-xl font-bold text-[#171414]">Industry challenges</h3>
                  <ul className="mt-5 space-y-3">
                    {challenges.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-[#4A4A4A]">
                        <span className="mt-2 h-px w-4 shrink-0 bg-[#E1BAC2]" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={80}>
                <div className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-8">
                  <h3 className="font-display text-xl font-bold text-[#171414]">Growth opportunities</h3>
                  <ul className="mt-5 space-y-3">
                    {opportunities.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-[#4A4A4A]">
                        <span className="mt-2 h-px w-4 shrink-0 bg-[#E1BAC2]" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* CTA */}
        <DarkBand>
          <div className="container mx-auto px-4 py-16 text-center md:px-6 md:py-20">
            <Reveal>
              <SectionTag label="Sanad × Ar-Rahnu" dark />
              <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                How Sanad supports the
                <br />
                <span className="font-semibold text-[#F5F5F3]/60">Ar-Rahnu industry</span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-ivory/75">
                Sanad connects Ar-Rahnu operators with Shariah-compliant funders, helping operators
                expand their capacity to serve more customers — addressing the industry&apos;s key
                challenge: access to capital for growth and sustainability.
              </p>
              <Link
                href="/apply"
                className="flux-pill mt-9 inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em]"
              >
                Join the Sanad Platform
              </Link>
            </Reveal>
          </div>
        </DarkBand>
      </main>
    </div>
  )
}
