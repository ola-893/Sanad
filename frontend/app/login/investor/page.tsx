'use client';

import { UserIcon } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { WalletConnectCard } from '@/components/auth/wallet-connect-card';

export default function InvestorLoginPage() {
  return (
    <AuthShell
      kicker="Investor Portal"
      title="Investor Login"
      subtitle="Connect your wallet to browse and invest in SAG tokens"
      auditNote="Secure wallet-based authentication"
      footerLinks={[
        { href: '/login', label: '← Back to role selection' },
        { href: '/register/investor', label: "Don't have an account? Register" },
        { href: '/', label: 'Return to Homepage' },
      ]}
    >
      <WalletConnectCard
        role="investor"
        title="Investor Sign In"
        description="Connect your MetaMask wallet to access your investment dashboard"
        icon={<UserIcon className="h-5 w-5" />}
        registerHref="/register/investor"
        dashboardPath="/investor/dashboard"
      />
    </AuthShell>
  );
}
