import type { ReactNode } from "react"
import Link from "next/link"
import { LockIcon } from "lucide-react"
import { Logo } from "@/components/logo"

interface AuthShellProps {
  kicker: string
  title: string
  subtitle: string
  auditNote: string
  children: ReactNode
  footerLinks: { href: string; label: string }[]
}

export function AuthShell({ kicker, title, subtitle, auditNote, children, footerLinks }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center space-y-2 text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <p className="kicker-gold">{kicker}</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {children}

        <div className="mt-6 text-center">
          <p className="flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <LockIcon className="h-3 w-3" />
            {auditNote}
          </p>
          <div className="mt-2 space-x-2">
            {footerLinks.map((link, i) => (
              <span key={link.href}>
                {i > 0 && <span className="mr-2 text-xs text-muted-foreground">|</span>}
                <Link href={link.href} className="text-xs text-primary underline-offset-4 hover:underline">
                  {link.label}
                </Link>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
