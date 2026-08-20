'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Wallet, StoreIcon, Check } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { useWalletAuth } from '@/hooks/use-wallet-auth';
import { toast } from 'sonner';
import Link from 'next/link';

export default function PawnshopRegisterPage() {
  const router = useRouter();
  const { walletAddress, isConnected, isConnecting, isSigning, connect, signAndRegister, truncateAddress } = useWalletAuth();

  const [formData, setFormData] = useState({
    businessName: '',
    ownerFirstName: '',
    ownerLastName: '',
    email: '',
    phone: '',
    businessAddress: '',
    licenseNumber: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!formData.ownerFirstName.trim()) newErrors.ownerFirstName = 'First name is required';
    if (!formData.ownerLastName.trim()) newErrors.ownerLastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.businessAddress.trim()) newErrors.businessAddress = 'Business address is required';
    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
    if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await signAndRegister('pawnshop', {
      userFirstName: formData.ownerFirstName.trim(),
      userLastName: formData.ownerLastName.trim(),
      userEmail: formData.email.trim().toLowerCase(),
      userContactNo: formData.phone.trim(),
      roleId: 'PAWNSHOP',
      businessName: formData.businessName.trim(),
      businessAddress: formData.businessAddress.trim(),
      licenseNumber: formData.licenseNumber.trim(),
    });

    if (result.success) {
      toast.success('Pawnshop account created!', { description: 'Redirecting to your dashboard...' });
      sessionStorage.removeItem('pendingWalletAddress');
      router.push('/pawnshop/dashboard');
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  return (
    <AuthShell
      kicker="Partner Portal"
      title="Register Pawnshop"
      subtitle="Set up your Ar-Rahnu branch to manage borrowers and create SAG tokens"
      auditNote="Wallet-based authentication · No password required"
      footerLinks={[
        { href: '/register', label: '← Back to role selection' },
        { href: '/pawnshop/login', label: 'Already have an account? Sign in' },
      ]}
    >
      <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
        <form onSubmit={handleSubmit}>
          <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
            <CardTitle className="flex items-center gap-2">
              <StoreIcon className="h-5 w-5" />
              Pawnshop Registration
            </CardTitle>
            <CardDescription className="text-[#4A4A4A]">
              Register your Ar-Rahnu branch to tokenize gold collateral
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

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name (Ar-Rahnu Branch)</Label>
              <Input
                id="businessName"
                name="businessName"
                placeholder="e.g., Ar-Rahnu Emas Kuala Lumpur"
                value={formData.businessName}
                onChange={handleChange}
              />
              {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
            </div>

            {/* Owner Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerFirstName">Owner First Name</Label>
                <Input
                  id="ownerFirstName"
                  name="ownerFirstName"
                  placeholder="Ahmad"
                  value={formData.ownerFirstName}
                  onChange={handleChange}
                />
                {errors.ownerFirstName && <p className="text-xs text-destructive">{errors.ownerFirstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerLastName">Owner Last Name</Label>
                <Input
                  id="ownerLastName"
                  name="ownerLastName"
                  placeholder="Bin Abdullah"
                  value={formData.ownerLastName}
                  onChange={handleChange}
                />
                {errors.ownerLastName && <p className="text-xs text-destructive">{errors.ownerLastName}</p>}
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="branch@arahnu.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
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
            </div>

            {/* Business Address */}
            <div className="space-y-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              <Input
                id="businessAddress"
                name="businessAddress"
                placeholder="No. 123, Jalan Emas, 50450 Kuala Lumpur"
                value={formData.businessAddress}
                onChange={handleChange}
              />
              {errors.businessAddress && <p className="text-xs text-destructive">{errors.businessAddress}</p>}
            </div>

            {/* License Number */}
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Ar-Rahnu License Number</Label>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                placeholder="e.g., AR-2024-KL-00123"
                value={formData.licenseNumber}
                onChange={handleChange}
              />
              {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber}</p>}
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
                    I agree to the Pawnshop Partner Terms
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    By continuing, you agree to our{' '}
                    <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
                      Partner Agreement
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
                'Sign & Register Pawnshop'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </AuthShell>
  );
}
