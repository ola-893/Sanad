'use client';

import { WalletIcon } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { WalletConnectCard } from '@/components/auth/wallet-connect-card';

export default function BorrowerLoginPage() {
  return (
    <AuthShell
      kicker="Borrower Portal"
      title="Borrower Login"
      subtitle="Connect your wallet to access Shariah-compliant financing"
      auditNote="Secure wallet-based authentication"
      footerLinks={[
        { href: '/login', label: '← Back to role selection' },
        { href: '/register', label: "Don't have an account? Register" },
        { href: '/', label: 'Return to Homepage' },
      ]}
    >
      <WalletConnectCard
        role="borrower"
        title="Borrower Sign In"
        description="Connect your MetaMask wallet to access your financing dashboard"
        icon={<WalletIcon className="h-5 w-5" />}
        registerHref="/register"
        dashboardPath="/dashboard/borrower"
      />
    </AuthShell>
  );
}
