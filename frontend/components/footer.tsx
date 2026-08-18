import Link from "next/link"
import { Linkedin, X } from "lucide-react"
import { Logo } from "@/components/logo"

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/ar-rahnu-industry", label: "Ar-Rahnu Industry" },
  { href: "/apply", label: "Apply for Financing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact Us" },
]

const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/shariah", label: "Shariah Compliance" },
  { href: "/security", label: "Security" },
]

const portalLinks = [
  { href: "/investor/login", label: "Investor Portal" },
  { href: "/pawnshop/login", label: "Pawnshop Portal" },
  { href: "/admin/login", label: "Admin Portal" },
]

export function Footer() {
  return (
    <footer className="site-footer overflow-hidden bg-deepGreen py-12 text-ivory sm:py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-14 grid grid-cols-1 gap-12 md:grid-cols-12">
          {/* Brand & mission */}
          <div className="space-y-4 md:col-span-5">
            <div className="flex items-center gap-3">
              <Logo />
              <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2]">
                Gold-backed Credit Network
              </span>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-ivory/80">
              A Shariah-compliant gold-backed credit network. Physical gold collateral, tokenized on
              Creditcoin and financed by global liquidity.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://x.com/sanadfinance"
                className="text-ivory/60 transition-colors hover:text-[#E1BAC2]"
                aria-label="X (Twitter)"
              >
                <X className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/sanad-finance"
                className="text-ivory/60 transition-colors hover:text-[#E1BAC2]"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Navigate */}
          <div className="space-y-3 text-xs md:col-span-2">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ivory">
              Navigate
            </h4>
            <ul className="space-y-2 text-ivory/80">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-[#E1BAC2]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3 text-xs md:col-span-2">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ivory">
              Legal
            </h4>
            <ul className="space-y-2 text-ivory/80">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-[#E1BAC2]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div className="space-y-3 text-xs md:col-span-3">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ivory">
              Portals
            </h4>
            <ul className="space-y-2 text-ivory/80">
              {portalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-[#E1BAC2]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Watermark */}
        <div className="relative -mx-4 mb-8 flex h-[20vh] min-h-[100px] items-center justify-center sm:-mx-6 sm:h-[30vh] lg:-mx-8">
          <span
            aria-hidden
            className="select-none font-display text-[22vw] font-extrabold leading-none tracking-tight text-ivory/[0.04]"
          >
            SANAD
          </span>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-ivory/10 pt-8 text-xs text-ivory/90 sm:flex-row">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ivory/60">
            © {new Date().getFullYear()} Sanad Protocol
          </span>
          <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.15em] text-ivory/60">
            <span>Gold-backed</span>
            <span>Creditcoin CC3</span>
            <span>Shariah-compliant</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
