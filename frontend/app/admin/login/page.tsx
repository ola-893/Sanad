'use client';

import { ShieldCheckIcon } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { WalletConnectCard } from '@/components/auth/wallet-connect-card';

export default function AdminLoginPage() {
  return (
    <AuthShell
      kicker="Administration"
      title="Admin Access"
      subtitle="Sign in to the Sanad management console"
      auditNote="Role-based access · Sessions logged and audited"
      footerLinks={[
        { href: '/login', label: 'User Login' },
        { href: '/', label: 'Return to Homepage' },
      ]}
    >
      <WalletConnectCard
        role="admin"
        title="Admin Sign In"
        description="Connect your authorized wallet to access the platform admin console"
        icon={<ShieldCheckIcon className="h-5 w-5" />}

        dashboardPath="/admin/dashboard"
      />
    </AuthShell>
  );
}
