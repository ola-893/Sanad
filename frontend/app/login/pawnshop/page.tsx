'use client';

import { StoreIcon } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { WalletConnectCard } from '@/components/auth/wallet-connect-card';

export default function PawnshopLoginPage() {
  return (
    <AuthShell
      kicker="Partner Portal"
      title="Pawnshop Login"
      subtitle="Connect your wallet to manage your Ar-Rahnu branch"
      auditNote="Secure wallet-based authentication"
      footerLinks={[
        { href: '/login', label: '← Back to role selection' },
        { href: '/register/pawnshop', label: "Don't have an account? Register" },
        { href: '/', label: 'Return to Homepage' },
      ]}
    >
      <WalletConnectCard
        role="pawnshop"
        title="Pawnshop Sign In"
        description="Connect your MetaMask wallet to access your pawnshop dashboard"
        icon={<StoreIcon className="h-5 w-5" />}
        registerHref="/register/pawnshop"
        dashboardPath="/pawnshop/dashboard"
      />
    </AuthShell>
  );
}
