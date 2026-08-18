import { ArrowRight, Camera, CreditCard, FileCheck, Upload, Wallet } from "lucide-react"

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: "Submit Application",
      description: "Register and complete KYC verification with your ID and facial recognition.",
      step: "01",
    },
    {
      icon: Camera,
      title: "Jewelry Submission",
      description: "Submit your gold for AI-assisted appraisal and physical assessment.",
      step: "02",
    },
    {
      icon: FileCheck,
      title: "Receive Offer",
      description: "Get a financing offer based on your gold's value, backed by a SAG note.",
      step: "03",
    },
    {
      icon: Wallet,
      title: "Financing Disbursement",
      description: "Accept the offer and receive funds to your wallet or bank account.",
      step: "04",
    },
    {
      icon: CreditCard,
      title: "Repayment",
      description: "Repay through stablecoins or bank transfer — verified cross-chain.",
      step: "05",
    },
  ]

  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <div
            key={index}
            className="glass-panel-hover glass-panel relative rounded-2xl border border-[#171414]/15 bg-white/60 p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full border border-[#E1BAC2]/20 bg-[#E1BAC2]/10 px-2.5 py-1 font-mono text-[10px] font-bold text-[#E1BAC2]">
                STEP {step.step}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171414]">
                <step.icon className="h-4 w-4 text-[#E1BAC2]" aria-hidden />
              </div>
            </div>
            <h3 className="font-display text-base font-bold text-[#171414]">{step.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#4A4A4A]">{step.description}</p>
            {index < steps.length - 1 && (
              <ArrowRight
                className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-[#E1BAC2] lg:block"
                aria-hidden
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
