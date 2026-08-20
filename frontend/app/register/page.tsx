'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wallet, UserIcon, StoreIcon, BriefcaseIcon, ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { useWalletAuth } from '@/hooks/use-wallet-auth';
import { toast } from 'sonner';

type UserRole = 'borrower' | 'investor' | 'pawnshop';

const roles: Array<{
  id: UserRole;
  title: string;
  description: string;
  icon: typeof UserIcon;
  href: string;
}> = [
  {
    id: 'borrower',
    title: 'Borrower',
    description: 'Apply for Shariah-compliant gold financing',
    icon: BriefcaseIcon,
    href: '/register/kyc',
  },
  {
    id: 'investor',
    title: 'Investor',
    description: 'Browse and invest in SAG tokens for yield',
    icon: UserIcon,
    href: '/register/investor',
  },
  {
    id: 'pawnshop',
    title: 'Pawnshop Owner',
    description: 'Manage your Ar-Rahnu branch and create SAG tokens',
    icon: StoreIcon,
    href: '/register/pawnshop',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { walletAddress, isConnected, isConnecting, connect, truncateAddress } = useWalletAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleConnect = async () => {
    try {
      await connect();
      toast.success('Wallet connected!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect wallet');
    }
  };

  const handleProceed = () => {
    if (!selectedRole) return;
    const role = roles.find((r) => r.id === selectedRole);
    if (role) {
      // Store wallet address for the registration flow
      if (walletAddress) {
        sessionStorage.setItem('pendingWalletAddress', walletAddress);
      }
      router.push(role.href);
    }
  };

  return (
    <AuthShell
      kicker="Get Started"
      title="Create Your Account"
      subtitle="Connect your wallet and choose your role to begin"
      auditNote="Wallet-based authentication · No password required"
      footerLinks={[
        { href: '/login', label: 'Already have an account? Sign in' },
        { href: '/', label: 'Return to Homepage' },
      ]}
    >
      <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
        <CardContent className="space-y-6 p-6">
          {/* Step 1: Connect Wallet */}
          <div className="space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
              Step 1 — Connect Wallet
            </p>

            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-50"
              >
                {isConnecting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Connect MetaMask
                  </div>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-[#F5F5F3] p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <Wallet className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-mono text-sm font-bold text-[#171414]">
                    {truncateAddress(walletAddress!)}
                  </span>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                  Connected
                </span>
              </div>
            )}
          </div>

          {/* Step 2: Choose Role */}
          <div className="space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
              Step 2 — Choose Your Role
            </p>

            <div className="space-y-2">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    disabled={!isConnected}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-[#E1BAC2] bg-[#E1BAC2]/10 shadow-md'
                        : 'border-[#171414]/10 bg-white/40 hover:bg-white/60'
                    } disabled:opacity-40`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isSelected ? 'bg-[#E1BAC2]' : 'bg-[#F5F5F3]'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${isSelected ? 'text-[#171414]' : 'text-[#4A4A4A]'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-display text-sm font-bold ${
                            isSelected ? 'text-[#171414]' : 'text-[#4A4A4A]'
                          }`}
                        >
                          {role.title}
                        </p>
                        <p className="text-xs text-[#4A4A4A]">{role.description}</p>
                      </div>
                      <ArrowRight
                        className={`h-4 w-4 ${
                          isSelected ? 'text-[#E1BAC2]' : 'text-transparent'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Proceed button */}
          <Button
            onClick={handleProceed}
            disabled={!isConnected || !selectedRole}
            className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-40"
          >
            Continue to Registration
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
