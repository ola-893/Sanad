'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { EyeIcon, EyeOffIcon, Loader2, Wallet, UserIcon, Check, ArrowLeft } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { useWalletAuth } from '@/hooks/use-wallet-auth';
import { toast } from 'sonner';
import Link from 'next/link';

export default function InvestorRegisterPage() {
  const router = useRouter();
  const { walletAddress, isConnected, isConnecting, isSigning, connect, signAndRegister, truncateAddress } = useWalletAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    agreeTerms: '',
  });

  // Restore wallet from session if coming from role selector
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingWalletAddress');
    if (pending && !isConnected) {
      // Wallet should already be connected from register page
    }
  }, [isConnected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    let valid = true;
    const newErrors = { ...errors };

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      valid = false;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      valid = false;
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email';
      valid = false;
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      valid = false;
    }
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await signAndRegister('investor', {
      userFirstName: formData.firstName.trim(),
      userLastName: formData.lastName.trim(),
      userEmail: formData.email.trim().toLowerCase(),
      userContactNo: formData.phone.trim(),
      roleId: 'INVESTOR',
    });

    if (result.success) {
      toast.success('Account created!', { description: 'Redirecting to your dashboard...' });
      sessionStorage.removeItem('pendingWalletAddress');
      router.push('/investor/dashboard');
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  return (
    <AuthShell
      kicker="Investor Portal"
      title="Create Investor Account"
      subtitle="Register to browse and invest in Shariah-compliant SAG tokens"
      auditNote="Wallet-based authentication · No password required"
      footerLinks={[
        { href: '/register', label: '← Back to role selection' },
        { href: '/investor/login', label: 'Already have an account? Sign in' },
      ]}
    >
      <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
        <form onSubmit={handleSubmit}>
          <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Investor Registration
            </CardTitle>
            <CardDescription className="text-[#4A4A4A]">
              Connect your wallet, then fill in your profile details
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 p-6">
            {/* Wallet Status */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">
                Wallet
              </Label>
              {!isConnected ? (
                <Button
                  type="button"
                  onClick={connect}
                  disabled={isConnecting}
                  variant="outline"
                  className="w-full rounded-xl border-[#171414]/20"
                >
                  {isConnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="mr-2 h-4 w-4" />
                  )}
                  Connect MetaMask
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="font-mono text-sm font-bold text-green-800">
                    {truncateAddress(walletAddress!)}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email (for notifications)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+234 801 234 5678"
                value={formData.phone}
                onChange={handleChange}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            {/* Terms */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeTerms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, agreeTerms: checked as boolean }))
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="agreeTerms" className="text-sm font-medium leading-none">
                    I agree to the terms and conditions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    By continuing, you agree to our{' '}
                    <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
                      Privacy Policy
                    </Link>.
                  </p>
                </div>
              </div>
              {errors.agreeTerms && <p className="text-xs text-destructive">{errors.agreeTerms}</p>}
            </div>
          </CardContent>

          {/* Submit */}
          <div className="flex flex-col space-y-3 p-6 pt-0">
            <Button
              type="submit"
              disabled={!isConnected || isSigning}
              className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-50"
            >
              {isSigning ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing & Creating Account...
                </div>
              ) : (
                'Sign & Create Account'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </AuthShell>
  );
}
