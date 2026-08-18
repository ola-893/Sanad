import { MarketingHero } from "@/components/marketing-hero"
import { Reveal } from "@/components/reveal"
import { SectionTag } from "@/components/section-heading"

function ProseHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 font-display text-2xl font-extrabold tracking-tight text-[#171414]">
      {children}
    </h2>
  )
}

function ProseSubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 font-display text-xl font-bold text-[#171414]">{children}</h3>
}

export default function ShariahPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <MarketingHero
          kicker="Governance"
          title="Shariah compliance"
          description="Our commitment to Islamic financial principles — in structure, in governance, and in every transaction."
        />

        <section className="bg-[#F5F5F3] py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4 md:px-6">
            <Reveal>
              <p className="leading-relaxed text-muted-foreground">
                At Sanad, Shariah compliance is at the core of everything we do. We are committed to
                ensuring that all our operations, services, and transactions strictly adhere to
                Islamic financial principles. This page outlines our approach to Shariah compliance
                and the measures we take to maintain it.
              </p>
            </Reveal>

            <Reveal>
              <ProseHeading>Our Shariah Governance Framework</ProseHeading>
              <p className="mt-4 text-muted-foreground">
                Our Shariah governance framework is designed to ensure that all aspects of our
                business are conducted in accordance with Islamic principles. This framework includes:
              </p>
              <ul className="mt-5 space-y-4">
                {[
                  [
                    "Shariah Advisory Board:",
                    "A board of respected scholars specializing in Islamic jurisprudence and finance who provide guidance and oversight on all aspects of our operations.",
                  ],
                  [
                    "Shariah Compliance Department:",
                    "A dedicated team responsible for implementing the recommendations of the Shariah Advisory Board and ensuring day-to-day compliance.",
                  ],
                  [
                    "Regular Shariah Audits:",
                    "Independent reviews of our operations, transactions, and documentation to ensure ongoing compliance.",
                  ],
                  [
                    "Continuous Education:",
                    "Regular training for our staff on Islamic financial principles and their practical application.",
                  ],
                ].map(([label, body]) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="mt-2 h-1 w-3 shrink-0 bg-[#E1BAC2]" aria-hidden />
                    <p className="text-muted-foreground">
                      <strong className="font-medium text-foreground">{label}</strong> {body}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal>
              <ProseHeading>Islamic Financial Principles We Uphold</ProseHeading>

              <ProseSubHeading>Prohibition of Riba (Interest)</ProseSubHeading>
              <p className="mt-3 text-muted-foreground">
                We strictly prohibit any form of interest-based transactions. All our financing
                models are structured to avoid riba, using Shariah-compliant alternatives such as:
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  [
                    "Qard Hasan (Interest-free loan):",
                    "In Ar-Rahnu, the principal component of the financing is considered an interest-free loan.",
                  ],
                  [
                    "Ujrah (Fee-based):",
                    "We charge a safekeeping fee for storing the collateral, not interest on the loan amount.",
                  ],
                  [
                    "Wadiah (Safekeeping):",
                    "The jewelry or assets pledged are held in trust as collateral, with the owner retaining ownership rights.",
                  ],
                ].map(([label, body]) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="mt-2 h-1 w-3 shrink-0 bg-[#E1BAC2]" aria-hidden />
                    <p className="text-muted-foreground">
                      <strong className="font-medium text-foreground">{label}</strong> {body}
                    </p>
                  </li>
                ))}
              </ul>

              <ProseSubHeading>Avoidance of Gharar (Excessive Uncertainty)</ProseSubHeading>
              <p className="mt-3 text-muted-foreground">
                We ensure that all terms, conditions, and pricing are clear, transparent, and agreed
                upon upfront to avoid any excessive uncertainty or ambiguity that could lead to
                disputes.
              </p>

              <ProseSubHeading>Prohibition of Maysir (Gambling / Speculation)</ProseSubHeading>
              <p className="mt-3 text-muted-foreground">
                Our platform does not support speculative activities. All transactions are
                asset-backed and based on real economic activities.
              </p>

              <ProseSubHeading>Ethical Investments and Activities</ProseSubHeading>
              <p className="mt-3 text-muted-foreground">
                We ensure that all transactions and investments facilitated through our platform are
                ethically sound and comply with Shariah principles. We avoid involvement with
                businesses dealing in prohibited goods and services such as alcohol, pork, gambling,
                adult entertainment, and other non-halal activities.
              </p>
            </Reveal>

            <Reveal>
              <ProseHeading>Ar-Rahnu Structure</ProseHeading>
              <p className="mt-4 text-muted-foreground">
                Our Ar-Rahnu model is structured to comply with Shariah principles in the following
                ways:
              </p>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {[
                  [
                    "Qard (Loan)",
                    "The principal amount provided to the customer is considered a benevolent loan (Qard Hasan).",
                  ],
                  [
                    "Rahn (Pledge)",
                    "The customer pledges jewelry or precious metals as security for the loan.",
                  ],
                  [
                    "Wadiah (Safekeeping)",
                    "The pledged item is kept safely by the Ar-Rahnu operator throughout the financing period.",
                  ],
                  [
                    "Ujrah (Fee)",
                    "A safekeeping fee is charged for storage and security of the pledged item, based on its value, not the loan amount.",
                  ],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="glass-panel rounded-2xl border border-[#171414]/15 bg-white/60 p-6"
                  >
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2]">
                      {title}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A4A4A]">{body}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <ProseHeading>Certification and Compliance</ProseHeading>
              <p className="mt-4 text-muted-foreground">
                Our Shariah compliance is certified by recognized authorities in Islamic finance. We
                maintain regular reviews and audits to ensure ongoing compliance with the latest
                interpretations and standards in Islamic financial practices.
              </p>
              <p className="mt-4 text-muted-foreground">
                Additionally, we work closely with regulatory bodies to ensure that our operations not
                only meet Shariah requirements but also comply with relevant financial regulations.
              </p>
            </Reveal>

            <Reveal>
              <ProseHeading>Transparency in Operations</ProseHeading>
              <p className="mt-4 text-muted-foreground">
                We are committed to transparency in all our operations. This includes:
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  "Clear disclosure of all fees and charges",
                  "Transparent contract terms and conditions",
                  "Regular reporting on Shariah compliance",
                  "Open communication about our Shariah governance processes",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-muted-foreground">
                    <span className="mt-2 h-px w-4 shrink-0 bg-[#E1BAC2]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal>
              <ProseHeading>Continuous Improvement</ProseHeading>
              <p className="mt-4 text-muted-foreground">
                Islamic finance is a dynamic field with ongoing scholarly discussions and
                interpretations. We are committed to continuous learning and improvement in our
                Shariah compliance practices. We regularly review and update our policies, procedures,
                and products to align with the latest developments in Islamic financial thought.
              </p>
            </Reveal>

            <Reveal>
              <div className="glass-panel mt-12 rounded-3xl border border-[#E1BAC2]/40 bg-white/60 p-8">
                <SectionTag label="Commitment" />
                <h3 className="mt-5 font-display text-xl font-bold text-[#171414]">
                  Our Shariah Commitment
                </h3>
                <p className="mt-3 text-[#4A4A4A]">
                  At Sanad, we believe that adherence to Shariah principles not only fulfills our
                  religious obligations but also creates a more ethical, transparent, and sustainable
                  financial ecosystem. We are dedicated to serving the needs of our community while
                  upholding the highest standards of Islamic financial practices.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <p className="mt-10 text-muted-foreground">
                If you have any questions or require further clarification about our Shariah
                compliance practices, please don&apos;t hesitate to{" "}
                <a href="/contact" className="text-[#E1BAC2] underline underline-offset-4 hover:text-foreground">
                  contact us
                </a>
                .
              </p>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  )
}
