import Link from "next/link"
import { ArrowRight, Clock, Layers, Lock, Shield, ShieldOff, Sparkles, TrendingDown } from "lucide-react"
import { LoanCalculator } from "@/components/loan-calculator"
import { Testimonials } from "@/components/testimonials"
import { TokenPurchaseTrackerProvider } from "@/components/token-purchase-tracker-provider"
import { Reveal } from "@/components/reveal"
import { HeroIntro } from "@/components/hero-intro"

/* ---------- shared Flux section atoms ---------- */

function SectionTag({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${
        dark
          ? "border-[#F5F5F3]/25 bg-white/5 text-[#F5F5F3]"
          : "border-[#171414]/20 bg-white/35 text-[#171414]"
      }`}
    >
      <span className="h-1.5 w-1.5 rotate-45 bg-[#E1BAC2]" aria-hidden />
      {label}
    </div>
  )
}

function SectionHeader({
  tag,
  title,
  accent,
  body,
}: {
  tag: string
  title: string
  accent: string
  body?: string
}) {
  return (
    <Reveal className="mx-auto mb-16 max-w-3xl text-center">
      <SectionTag label={tag} />
      <h2 className="mb-4 mt-6 font-display text-3xl font-extrabold leading-tight text-[#171414] sm:text-5xl">
        {title} <br />
        <span className="font-semibold text-[#4A4A4A]">{accent}</span>
      </h2>
      {body && <p className="text-sm leading-relaxed text-[#4A4A4A] sm:text-base">{body}</p>}
    </Reveal>
  )
}

/* ---------- data ---------- */

const problems = [
  {
    icon: TrendingDown,
    title: "Gold is locked up",
    body: "Physical gold sits idle in homes and vaults. Borrowers need cash, but the collateral can't move — so the value just sleeps.",
  },
  {
    icon: ShieldOff,
    title: "Lending is trapped locally",
    body: "Ar-Rahnu operators depend on slow bank credit lines and local capital. Global investors who want to fund them have no channel.",
  },
  {
    icon: Clock,
    title: "Trust is expensive",
    body: "Every pawn loan needs appraisal, custody, and repayment tracking. Today that paperwork is manual, opaque, and hard to audit.",
  },
]

const metrics = [
  { label: "Capital turnover", value: "5×", sub: "vs. traditional bank lines" },
  { label: "Cost of capital", value: "30–40%", sub: "lower via global liquidity" },
  { label: "Pawnshops & co-ops", value: "50,000+", sub: "across emerging markets" },
  { label: "Auditable on-chain", value: "100%", sub: "every loan, every repayment" },
]

const steps = [
  {
    step: "01",
    title: "Pledge",
    subtitle: "Physical gold",
    icon: Lock,
    description: "Borrowers deposit gold at a verified Ar-Rahnu branch. Custody begins the moment the vault seal is applied.",
    detail: "Custody stays at the branch — a verified custodian, never a bridge.",
  },
  {
    step: "02",
    title: "Appraise",
    subtitle: "AI valuation",
    icon: TrendingDown,
    description: "The AI gold evaluator computes fair market value, applies purity haircuts, and checks volatility against live policy.",
    detail: "LTV, purity, and volatility — every risk metric computed transparently.",
  },
  {
    step: "03",
    title: "Tokenize",
    subtitle: "SAG note",
    icon: Layers,
    description: "The custody certificate and appraisal are anchored to IPFS and minted as a SAG note on Creditcoin.",
    detail: "Provenance, on-chain — from physical vault to digital note.",
  },
  {
    step: "04",
    title: "Fund & settle",
    subtitle: "Cross-chain",
    icon: Sparkles,
    description: "Global investors supply liquidity. Repayment on Sepolia is verified cross-chain via the Attestcoin prover, then the note is burned.",
    detail: "Repayment releases collateral; credit history is written immutably.",
  },
]

const pipelineRows = [
  { step: "01", title: "Pledge", value: "VAULT SEALED" },
  { step: "02", title: "Appraise", value: "LTV 70.0%" },
  { step: "03", title: "Tokenize", value: "SAG-10291" },
  { step: "04", title: "Fund", value: "CC3 · 102031" },
  { step: "05", title: "Settle", value: "NOTE BURNED" },
]

const governance = [
  { index: "G.01", title: "Institutional KYC", description: "Identity verification for every participant" },
  { index: "G.02", title: "On-chain audit trail", description: "Immutable history on Creditcoin, indexed to PostgreSQL" },
  { index: "G.03", title: "Profit auto-tracking", description: "Automated daily profit calculation and distribution" },
  { index: "G.04", title: "Burn on settlement", description: "Notes destroyed the moment a loan is repaid" },
  { index: "G.05", title: "Immutable history", description: "Every appraisal, mint, and repayment recorded forever" },
  { index: "G.06", title: "Multi-layer security", description: "Enterprise-grade encryption and access controls" },
]

const riskRows = [
  { risk: "Ar-Rahnu default", mitigation: "Institutional repayment mandate enforced on-chain" },
  { risk: "Investor dissatisfaction", mitigation: "Transparent returns, daily profit visibility, secure payout" },
  { risk: "Token mismanagement", mitigation: "Burn upon settlement, immutable collateral history" },
  { risk: "Legal non-compliance", mitigation: "Centralized KYC + LegalOps review, regulatory policy engine" },
]

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ============ HERO — text left, gold bar right ============ */}
      <HeroIntro />

      {/* ============ THE PROBLEM ============ */}
      <section className="relative overflow-hidden bg-[#F5F5F3] px-3 pb-24 pt-8 sm:px-5">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#F5F5F3] to-transparent" />
        <div className="relative mx-auto max-w-7xl rounded-[28px] border border-white/45 bg-white/55 px-4 py-16 shadow-[0_30px_90px_rgba(30,30,30,0.08)] backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              tag="The Problem"
              title="Physical gold,"
              accent="financially frozen."
              body="The oldest collateral on earth has no modern liquidity layer. Sanad was built to change that."
            />

            <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3">
              {problems.map((p, i) => {
                const Icon = p.icon
                return (
                  <Reveal key={p.title} delay={i * 100}>
                    <div className="glass-panel-hover glass-panel h-full rounded-2xl border border-[#171414]/15 bg-white/60 p-8 shadow-soft-editorial">
                      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#E1BAC2]/10">
                        <Icon className="h-6 w-6 text-[#E1BAC2]" />
                      </div>
                      <h3 className="mb-3 font-display text-xl font-bold text-[#171414]">{p.title}</h3>
                      <p className="text-sm leading-relaxed text-[#4A4A4A]">{p.body}</p>
                    </div>
                  </Reveal>
                )
              })}
            </div>

            {/* Metrics — divided row inside the glass panel */}
            <Reveal>
              <div className="grid grid-cols-2 divide-x divide-[#171414]/10 border-t border-[#171414]/10 pt-12 lg:grid-cols-4">
                {metrics.map((m) => (
                  <div key={m.label} className="px-6 py-4 text-center lg:py-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#4A4A4A]">
                      {m.label}
                    </p>
                    <p className="mt-3 font-display text-4xl font-extrabold tabular tracking-tight text-[#171414] sm:text-5xl">
                      {m.value}
                    </p>
                    <p className="mt-2 text-xs text-[#4A4A4A]">{m.sub}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="border-t border-[#171414]/15 bg-[#F5F5F3] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            tag="How It Works"
            title="From vault to settlement,"
            accent="in four steps."
            body="Sanad handles the complexity behind the scenes. You pledge gold, and liquidity flows."
          />

          {/* Visual flow — ledger panel */}
          <Reveal>
            <div className="glass-panel mb-12 overflow-hidden rounded-3xl border border-[#171414]/15 bg-white/60 p-6 shadow-soft-editorial sm:p-8">
              <div className="mb-6 flex items-center justify-between border-b border-[#171414]/10 pb-4">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]">
                  Collateral Flow
                </h3>
                <span className="rounded-full border border-[#E1BAC2]/30 bg-[#E1BAC2]/10 px-3 py-1 font-mono text-[10px] font-bold text-[#E1BAC2]">
                  Creditcoin CC3 · Sepolia
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {pipelineRows.map((row, i) => (
                  <div key={row.step} className="flex items-center gap-4 rounded-2xl bg-[#F5F5F3] px-5 py-3.5">
                    <span className="w-8 font-mono text-[10px] font-bold text-[#E1BAC2]">{row.step}</span>
                    <span className="flex-1 font-display text-sm font-bold text-[#171414]">{row.title}</span>
                    <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] sm:block">
                      {row.value}
                    </span>
                    {i < pipelineRows.length - 1 && (
                      <span className="hidden text-[#171414]/30 sm:block" aria-hidden>
                        ↓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Step cards */}
          <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, idx) => {
              const Icon = s.icon
              return (
                <Reveal key={s.step} delay={idx * 80}>
                  <div className="glass-panel-hover glass-panel h-full rounded-3xl border border-[#171414]/15 bg-white/60 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-full border border-[#E1BAC2]/20 bg-[#E1BAC2]/10 px-2.5 py-1 font-mono text-[10px] font-bold text-[#E1BAC2]">
                        STEP {s.step}
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171414]">
                        <Icon className="h-4 w-4 text-[#E1BAC2]" />
                      </div>
                    </div>
                    <h4 className="font-display text-base font-bold text-[#171414]">{s.title}</h4>
                    <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#E1BAC2]">
                      {s.subtitle}
                    </p>
                    <p className="mb-4 text-xs leading-relaxed text-[#4A4A4A]">{s.description}</p>
                    <div className="rounded-xl border border-[#171414]/15 bg-[#F5F5F3] p-3 text-[11px] font-medium text-[#171414]">
                      {s.detail}
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ SIMULATOR ============ */}
      <section id="calculator" className="border-t border-[#171414]/15 bg-[#F5F5F3] py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="self-start lg:sticky lg:top-28 lg:col-span-5">
            <Reveal>
              <SectionTag label="Simulator" />
              <h2 className="mb-4 mt-6 font-display text-3xl font-extrabold leading-tight text-[#171414] sm:text-5xl">
                Calculate your <br />
                <span className="font-semibold text-[#4A4A4A]">financing offer.</span>
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-[#4A4A4A]">
                Weight, purity, and live market price — with a Shariah-compliant haircut applied.
                Final valuation after physical assessment at the branch.
              </p>
              <Link
              href="/login"
              className="flux-pill mt-8 inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em]"
              >
                Register & Apply <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Reveal>
          </div>
          <div className="lg:col-span-7">
            <Reveal delay={100}>
              <div className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-6 shadow-soft-editorial sm:p-8">
                <div className="mb-6 flex items-center justify-between border-b border-[#171414]/10 pb-4">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]">
                    Financing Calculator
                  </h3>
                  <span className="rounded-full border border-[#E1BAC2]/30 bg-[#E1BAC2]/10 px-3 py-1 font-mono text-[10px] font-bold text-[#E1BAC2]">
                    MYR · Live
                  </span>
                </div>
                <LoanCalculator />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ SECURITY & TRUST ============ */}
      <section className="border-t border-[#171414]/15 bg-[#F5F5F3] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            tag="Security & Trust"
            title="Compliance and security,"
            accent="engineered in."
          />

          <div className="mb-14 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-[#171414]/15 bg-[#171414]/10 md:grid-cols-2 lg:grid-cols-3">
            {governance.map((item, i) => (
              <Reveal key={item.index} delay={i * 60} className="bg-[#F5F5F3]">
                <div className="glass-panel-hover h-full bg-white/70 p-8">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#E1BAC2]">
                    {item.index}
                  </p>
                  <h3 className="mt-4 font-display text-xl font-bold text-[#171414]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#4A4A4A]">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
              <div className="flex items-center justify-between border-b border-[#171414]/10 px-6 py-4">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#171414]">
                  Risk Register
                </h3>
                <Shield className="h-4 w-4 text-[#E1BAC2]" />
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#171414]/10 bg-[#F5F5F3]/60">
                    <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#4A4A4A]">
                      Risk
                    </th>
                    <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#4A4A4A]">
                      Mitigation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {riskRows.map((row, i) => (
                    <tr
                      key={row.risk}
                      className={i < riskRows.length - 1 ? "border-b border-[#171414]/10" : ""}
                    >
                      <td className="px-6 py-5 font-display text-sm font-bold text-[#171414]">{row.risk}</td>
                      <td className="px-6 py-5 text-sm text-[#4A4A4A]">{row.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ VOICES ============ */}
      <section className="border-t border-[#171414]/15 bg-[#F5F5F3] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader tag="Voices" title="Trusted by operators," accent="backed by investors." />
          <Testimonials />
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative overflow-hidden bg-[#171414] py-24 text-[#F5F5F3] sm:py-32">
        <div
          aria-hidden
          className="absolute -left-32 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-[#E1BAC2]/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <SectionTag label="Begin" dark />
            <h2 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Unlock your gold&apos;s value.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-[#F5F5F3]/70 sm:text-base">
              Apply for Shariah-compliant financing — appraisal, tokenization, and funding on a
              transparent, auditable chain.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#E1BAC2] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#171414] transition-all hover:bg-white"
              >
                Apply Now <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/investor/login"
                className="rounded-full border border-[#F5F5F3]/25 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#F5F5F3] transition-all hover:border-[#E1BAC2] hover:text-[#E1BAC2]"
              >
                Investor Portal
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Token Purchase Progress Tracker */}
      <TokenPurchaseTrackerProvider />
    </div>
  )
}
