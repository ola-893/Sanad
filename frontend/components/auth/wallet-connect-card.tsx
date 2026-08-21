'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wallet, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { useWalletAuth, UserRole } from '@/hooks/use-wallet-auth';
import { toast } from 'sonner';
import { copyAddress, getNetworkName } from '@/lib/web3';

interface WalletConnectCardProps {
  role: UserRole;
  title: string;
  description: string;
  icon: React.ReactNode;
  registerHref?: string;
  dashboardPath: string;
  footerLinks?: Array<{ href: string; label: string }>;
}

export function WalletConnectCard({
  role,
  title,
  description,
  icon,
  registerHref,
  dashboardPath,
  footerLinks = [],
}: WalletConnectCardProps) {
  const router = useRouter();
  const {
    walletAddress,
    isConnected,
    isConnecting,
    isSigning,
    balance,
    error,
    isMetaMaskAvailable,
    isAuthenticated,
    autoLoginChecked,
    connect,
    signAndLogin,
    truncateAddress,
  } = useWalletAuth();

  const [copied, setCopied] = useState(false);
  const [chainId, setChainId] = useState<number>(0);
  const [autoRedirecting, setAutoRedirecting] = useState(false);

  // Auto-redirect if wallet connected + already authenticated
  useEffect(() => {
    if (autoLoginChecked && isConnected && isAuthenticated && !autoRedirecting) {
      setAutoRedirecting(true);
      toast.success('Welcome back! Redirecting to dashboard...');
      router.push(dashboardPath);
    }
  }, [autoLoginChecked, isConnected, isAuthenticated, autoRedirecting, dashboardPath, router]);

  // Detect network on connect
  useEffect(() => {
    if (isConnected) {
      import('@/lib/web3').then(({ getChainId }) => {
        getChainId().then(setChainId).catch(() => {});
      });
    }
  }, [isConnected]);

  const handleConnect = async () => {
    try {
      await connect();
      toast.success('Wallet connected!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect wallet');
    }
  };

  const handleSignAndLogin = async () => {
    const result = await signAndLogin(role);

    if (result.success) {
      toast.success('Login successful!');
      router.push(dashboardPath);
    } else if (result.needsRegistration) {
      toast.info('No account found. Redirecting to registration...');
      router.push(registerHref);
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await copyAddress(walletAddress);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
      <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-[#4A4A4A]">{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {/* MetaMask not installed */}
        {!isMetaMaskAvailable && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">MetaMask not detected</p>
              <p className="text-xs text-amber-600 mt-1">
                Please install MetaMask to continue.{' '}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-800"
                >
                  Install MetaMask
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Not connected — show connect button */}
        {!isConnected && (
          <Button
            onClick={handleConnect}
            disabled={isConnecting || !isMetaMaskAvailable}
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
        )}

        {/* Auto-redirecting state */}
        {autoRedirecting && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-[#171414]/10 bg-[#F5F5F3] p-6">
            <Loader2 className="h-5 w-5 animate-spin text-[#171414]" />
            <div>
              <p className="text-sm font-medium text-[#171414]">Already connected!</p>
              <p className="text-xs text-muted-foreground">Redirecting to your dashboard...</p>
            </div>
          </div>
        )}

        {/* Connected + already authenticated — show brief state before redirect */}
        {isConnected && isAuthenticated && !autoRedirecting && autoLoginChecked && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Wallet recognized</p>
              <p className="text-xs text-emerald-600">Setting up your session...</p>
            </div>
          </div>
        )}

        {/* Connected — show wallet info + sign button */}
        {isConnected && walletAddress && !isAuthenticated && !autoRedirecting && (
          <div className="space-y-4">
            {/* Wallet badge */}
            <div className="flex items-center justify-between rounded-xl border border-[#171414]/10 bg-[#F5F5F3] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1BAC2]/20">
                  <Wallet className="h-5 w-5 text-[#E1BAC2]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#4A4A4A]">Connected Wallet</p>
                  <p className="font-mono text-sm font-bold text-[#171414]">
                    {truncateAddress(walletAddress)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyAddress}
                className="rounded-lg p-2 hover:bg-[#171414]/5 transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-[#4A4A4A]" />
                )}
              </button>
            </div>

            {/* Balance & Network */}
            {balance && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-[#4A4A4A]">{getNetworkName(chainId)} Balance</span>
                <span className="font-mono text-sm font-bold text-[#171414]">{balance} ETH</span>
              </div>
            )}

            {/* Sign & Login button */}
            <Button
              onClick={handleSignAndLogin}
              disabled={isSigning}
              className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-50"
            >
              {isSigning ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Sign & Login
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-3 p-6 pt-0">
        {registerHref && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a href={registerHref} className="font-medium text-primary underline-offset-4 hover:underline">
              Register
            </a>
          </p>
        )}
        {footerLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {link.label}
          </a>
        ))}
      </CardFooter>
    </Card>
  );
}
