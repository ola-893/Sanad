'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, UserIcon, StoreIcon, BriefcaseIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';

type LoginRole = 'borrower' | 'investor' | 'pawnshop';

const roles: Array<{
  id: LoginRole;
  title: string;
  description: string;
  icon: typeof UserIcon;
  href: string;
  color: string;
}> = [
  {
    id: 'borrower',
    title: 'Borrower',
    description: 'Apply for Shariah-compliant gold financing',
    icon: BriefcaseIcon,
    href: '/login/borrower',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'investor',
    title: 'Investor',
    description: 'Browse and invest in SAG tokens for yield',
    icon: UserIcon,
    href: '/login/investor',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'pawnshop',
    title: 'Pawnshop Owner',
    description: 'Manage your Ar-Rahnu branch and create SAG tokens',
    icon: StoreIcon,
    href: '/login/pawnshop',
    color: 'bg-emerald-50 text-emerald-600',
  },
];

export default function LoginPage() {
  const router = useRouter();

  return (
    <AuthShell
      kicker="Welcome Back"
      title="Sign In to Sanad"
      subtitle="Choose your role to continue with wallet-based authentication"
      auditNote="Secure wallet-based authentication · No password required"
      footerLinks={[
        { href: '/register', label: "Don't have an account? Register" },
        { href: '/', label: 'Return to Homepage' },
      ]}
    >
      <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
        <CardContent className="space-y-4 p-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
            Select Your Role
          </p>

          <div className="space-y-2">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => router.push(role.href)}
                  className="w-full rounded-xl border border-[#171414]/10 bg-white/40 p-4 text-left transition-all hover:bg-white/60 hover:border-[#E1BAC2] hover:shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${role.color} transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-sm font-bold text-[#171414]">
                        {role.title}
                      </p>
                      <p className="text-xs text-[#4A4A4A]">{role.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#4A4A4A] group-hover:text-[#E1BAC2] transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Admin — subtle, not a card */}
          <div className="pt-2 border-t border-[#171414]/5">
            <button
              type="button"
              onClick={() => router.push('/admin/login')}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-[11px] text-[#4A4A4A]/60 hover:text-[#4A4A4A] transition-colors"
            >
              <ShieldCheck className="h-3 w-3" />
              Admin Access
            </button>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
