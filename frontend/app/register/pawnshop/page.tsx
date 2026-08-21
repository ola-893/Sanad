'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Wallet,
  Store,
  Check,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Building2,
} from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { useWalletAuth } from '@/hooks/use-wallet-auth';
import { toast } from 'sonner';
import Link from 'next/link';
import apiInstance from '@/lib/axios-v1';

const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nassarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

const SERVICES = [
  'Gold Pawning',
  'Silver Pawning',
  'Diamond Pawning',
  'Jewelry Valuation',
  'Buy-Back Services',
  'Gold Bar Sales',
  'Investment Consultation',
  'Shariah-Compliant Financing',
];

const STEP_LABELS = ['Account', 'Business Info', 'Location', 'Contact & Services'];

interface FormData {
  // Step 1 – Account
  ownerFirstName: string;
  ownerLastName: string;
  email: string;
  phone: string;
  // Step 2 – Business
  businessName: string;
  ssmRegistrationNo: string;
  businessType: string;
  arRahnuLicenseNumber: string;
  licenseExpiry: string;
  yearEstablished: string;
  branchCount: string;
  // Step 3 – Location
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  // Step 4 – Contact & Services
  businessPhone: string;
  businessEmail: string;
  website: string;
  servicesOffered: string[];
  operatingHours: string;
}

const initialFormData: FormData = {
  ownerFirstName: '',
  ownerLastName: '',
  email: '',
  phone: '',
  businessName: '',
  ssmRegistrationNo: '',
  businessType: '',
  arRahnuLicenseNumber: '',
  licenseExpiry: '',
  yearEstablished: '',
  branchCount: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  businessPhone: '',
  businessEmail: '',
  website: '',
  servicesOffered: [],
  operatingHours: 'Mon–Fri: 9:00 AM – 6:00 PM | Sat: 9:00 AM – 1:00 PM | Sun: Closed',
};

export default function PawnshopRegisterPage() {
  const router = useRouter();
  const {
    walletAddress,
    isConnected,
    isConnecting,
    isSigning,
    connect,
    signAndRegister,
    truncateAddress,
  } = useWalletAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // ── Helpers ──────────────────────────────────────────────

  const setField = useCallback(
    (name: keyof FormData, value: string | string[]) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    },
    [errors],
  );

  const toggleService = useCallback((service: string) => {
    setFormData((prev) => {
      const has = prev.servicesOffered.includes(service);
      return {
        ...prev,
        servicesOffered: has
          ? prev.servicesOffered.filter((s) => s !== service)
          : [...prev.servicesOffered, service],
      };
    });
  }, []);

  // ── Validation per step ──────────────────────────────────

  const validateStep = useCallback(
    (s: number) => {
      const e: Record<string, string> = {};

      if (s === 1) {
        if (!isConnected) e.wallet = 'Please connect your wallet first';
        if (!formData.ownerFirstName.trim()) e.ownerFirstName = 'First name is required';
        if (!formData.ownerLastName.trim()) e.ownerLastName = 'Last name is required';
        if (!formData.email.trim()) {
          e.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          e.email = 'Invalid email';
        }
        if (!formData.phone.trim()) e.phone = 'Phone number is required';
      }

      if (s === 2) {
        if (!formData.businessName.trim()) e.businessName = 'Business name is required';
        if (!formData.ssmRegistrationNo.trim()) e.ssmRegistrationNo = 'Registration number is required';
        if (!formData.businessType) e.businessType = 'Business type is required';
        if (!formData.arRahnuLicenseNumber.trim()) e.arRahnuLicenseNumber = 'License number is required';
        if (!formData.yearEstablished.trim()) e.yearEstablished = 'Year established is required';
        if (!formData.branchCount.trim()) e.branchCount = 'Branch count is required';
      }

      if (s === 3) {
        if (!formData.addressLine1.trim()) e.addressLine1 = 'Address is required';
        if (!formData.city.trim()) e.city = 'City is required';
        if (!formData.state) e.state = 'State is required';
        if (!formData.postalCode.trim()) e.postalCode = 'Postal code is required';
      }

      if (s === 4) {
        if (!formData.businessPhone.trim()) e.businessPhone = 'Business phone is required';
        if (!formData.businessEmail.trim()) {
          e.businessEmail = 'Business email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.businessEmail)) {
          e.businessEmail = 'Invalid email';
        }
        if (formData.servicesOffered.length === 0) e.servicesOffered = 'Select at least one service';
      }

      setErrors(e);
      return Object.keys(e).length === 0;
    },
    [formData, isConnected],
  );

  const goNext = () => {
    if (validateStep(step)) setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  // ── Geolocation ──────────────────────────────────────────

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setIsDetectingLocation(false);
        toast.success('Location detected');
      },
      () => {
        setIsDetectingLocation(false);
        toast.error('Unable to retrieve your location');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ── Submit ───────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    // Step 1: wallet + account creation
    const regResult = await signAndRegister('pawnshop', {
      userFirstName: formData.ownerFirstName.trim(),
      userLastName: formData.ownerLastName.trim(),
      userEmail: formData.email.trim().toLowerCase(),
      userContactNo: formData.phone.trim(),
      roleId: 'PAWNSHOP',
    });

    if (!regResult.success) {
      toast.error(regResult.error || 'Registration failed');
      return;
    }

    // Step 2: save full business profile
    try {
      await apiInstance.post('/pawnshop/profile', {
        businessName: formData.businessName.trim(),
        businessRegistrationNo: formData.ssmRegistrationNo.trim(),
        businessType: formData.businessType,
        licenseNumber: formData.arRahnuLicenseNumber.trim(),
        licenseExpiry: formData.licenseExpiry || undefined,
        yearEstablished: formData.yearEstablished.trim(),
        branchCount: formData.branchCount.trim(),
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim(),
        city: formData.city.trim(),
        state: formData.state,
        postalCode: formData.postalCode.trim(),
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        businessPhone: formData.businessPhone.trim(),
        businessEmail: formData.businessEmail.trim().toLowerCase(),
        website: formData.website.trim() || undefined,
        servicesOffered: formData.servicesOffered,
        operatingHours: {
          monday: '9:00 AM - 5:00 PM',
          tuesday: '9:00 AM - 5:00 PM',
          wednesday: '9:00 AM - 5:00 PM',
          thursday: '9:00 AM - 5:00 PM',
          friday: '9:00 AM - 5:00 PM',
          saturday: '9:00 AM - 1:00 PM',
          sunday: 'Closed',
        },
      });

      toast.success('Pawnshop account created!', { description: 'Redirecting to your dashboard...' });
      sessionStorage.removeItem('pendingWalletAddress');
      router.push('/pawnshop/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save business profile';
      toast.error(msg);
    }
  };

  // ── Render helpers ───────────────────────────────────────

  const fieldError = (key: string) =>
    errors[key] ? <p className="text-xs text-destructive">{errors[key]}</p> : null;

  const labelCls = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]';

  // ── Steps ────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ─── Step 1: Account ───────────────────────────────────
      case 1:
        return (
          <div className="space-y-5">
            {/* Wallet */}
            <div className="space-y-2">
              <Label className={labelCls}>Wallet</Label>
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
              {fieldError('wallet')}
            </div>

            {/* Owner name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerFirstName" className={labelCls}>
                  First Name
                </Label>
                <Input
                  id="ownerFirstName"
                  placeholder="First name"
                  value={formData.ownerFirstName}
                  onChange={(e) => setField('ownerFirstName', e.target.value)}
                  className="rounded-xl"
                />
                {fieldError('ownerFirstName')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerLastName" className={labelCls}>
                  Last Name
                </Label>
                <Input
                  id="ownerLastName"
                  placeholder="Last name"
                  value={formData.ownerLastName}
                  onChange={(e) => setField('ownerLastName', e.target.value)}
                  className="rounded-xl"
                />
                {fieldError('ownerLastName')}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className={labelCls}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setField('email', e.target.value)}
                className="rounded-xl"
              />
              {fieldError('email')}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className={labelCls}>
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className="rounded-xl"
              />
              {fieldError('phone')}
            </div>
          </div>
        );

      // ─── Step 2: Business Info ─────────────────────────────
      case 2:
        return (
          <div className="space-y-5">
            {/* Business name */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className={labelCls}>
                Business Name
              </Label>
              <Input
                id="businessName"
                placeholder="e.g., Gold Pawn Brokers"
                value={formData.businessName}
                onChange={(e) => setField('businessName', e.target.value)}
                className="rounded-xl"
              />
              {fieldError('businessName')}
            </div>

            {/* SSM */}
            <div className="space-y-2">
              <Label htmlFor="ssmRegistrationNo" className={labelCls}>
                SSM Registration No
              </Label>
              <Input
                id="ssmRegistrationNo"
                placeholder="e.g., RC-123456"
                value={formData.ssmRegistrationNo}
                onChange={(e) => setField('ssmRegistrationNo', e.target.value)}
                className="rounded-xl"
              />
              {fieldError('ssmRegistrationNo')}
            </div>

            {/* Business type */}
            <div className="space-y-2">
              <Label className={labelCls}>Business Type</Label>
              <Select
                value={formData.businessType}
                onValueChange={(v) => setField('businessType', v)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar-rahnu">Ar-Rahnu</SelectItem>
                  <SelectItem value="gold-dealer">Gold Dealer</SelectItem>
                  <SelectItem value="pawnbroker">Pawnbroker</SelectItem>
                </SelectContent>
              </Select>
              {fieldError('businessType')}
            </div>

            {/* License no */}
            <div className="space-y-2">
              <Label htmlFor="arRahnuLicenseNumber" className={labelCls}>
                Business License Number
              </Label>
              <Input
                id="arRahnuLicenseNumber"
                placeholder="e.g., LICENSE-00123"
                value={formData.arRahnuLicenseNumber}
                onChange={(e) => setField('arRahnuLicenseNumber', e.target.value)}
                className="rounded-xl"
              />
              {fieldError('arRahnuLicenseNumber')}
            </div>

            {/* License expiry + Year established */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseExpiry" className={labelCls}>
                  License Expiry
                </Label>
                <Input
                  id="licenseExpiry"
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => setField('licenseExpiry', e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearEstablished" className={labelCls}>
                  Year Established
                </Label>
                <Input
                  id="yearEstablished"
                  placeholder="e.g., 2020"
                  value={formData.yearEstablished}
                  onChange={(e) => setField('yearEstablished', e.target.value)}
                  className="rounded-xl"
                />
                {fieldError('yearEstablished')}
              </div>
            </div>

            {/* Branch count */}
            <div className="space-y-2">
              <Label htmlFor="branchCount" className={labelCls}>
                Branch Count
              </Label>
              <Input
                id="branchCount"
                type="number"
                min="1"
                placeholder="e.g., 1"
                value={formData.branchCount}
                onChange={(e) => setField('branchCount', e.target.value)}
                className="rounded-xl"
              />
              {fieldError('branchCount')}
            </div>
          </div>
        );

      // ─── Step 3: Location ──────────────────────────────────
      case 3:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="addressLine1" className={labelCls}>
                Address Line 1
              </Label>
              <Input
                id="addressLine1"
                placeholder="Street address"
                value={formData.addressLine1}
                onChange={(e) => setField('addressLine1', e.target.value)}
                className="rounded-xl"
              />
              {fieldError('addressLine1')}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2" className={labelCls}>
                Address Line 2
              </Label>
              <Input
                id="addressLine2"
                placeholder="Suite / Floor (optional)"
                value={formData.addressLine2}
                onChange={(e) => setField('addressLine2', e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className={labelCls}>
                  City
                </Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setField('city', e.target.value)}
                  className="rounded-xl"
                />
                {fieldError('city')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode" className={labelCls}>
                  Postal Code
                </Label>
                <Input
                  id="postalCode"
                  placeholder="Postal code"
                  value={formData.postalCode}
                  onChange={(e) => setField('postalCode', e.target.value)}
                  className="rounded-xl"
                />
                {fieldError('postalCode')}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelCls}>State</Label>
              <Select value={formData.state} onValueChange={(v) => setField('state', v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {NIGERIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError('state')}
            </div>

            {/* GPS Coordinates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={labelCls}>GPS Coordinates</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="h-7 gap-1 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#171414]"
                >
                  {isDetectingLocation ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MapPin className="h-3 w-3" />
                  )}
                  Auto-detect
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Input
                    id="latitude"
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChange={(e) => setField('latitude', e.target.value)}
                    className="rounded-xl font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    id="longitude"
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChange={(e) => setField('longitude', e.target.value)}
                    className="rounded-xl font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      // ─── Step 4: Contact & Services ────────────────────────
      case 4:
        return (
          <div className="space-y-5">
            {/* Business phone */}
            <div className="space-y-2">
              <Label htmlFor="businessPhone" className={labelCls}>
                Business Phone
              </Label>
              <Input
                id="businessPhone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.businessPhone}
                onChange={(e) => setField('businessPhone', e.target.value)}
                className="rounded-xl"
              />
              {fieldError('businessPhone')}
            </div>

            {/* Business email */}
            <div className="space-y-2">
              <Label htmlFor="businessEmail" className={labelCls}>
                Business Email
              </Label>
              <Input
                id="businessEmail"
                type="email"
                placeholder="info@example.com"
                value={formData.businessEmail}
                onChange={(e) => setField('businessEmail', e.target.value)}
                className="rounded-xl"
              />
              {fieldError('businessEmail')}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className={labelCls}>
                Website
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com (optional)"
                value={formData.website}
                onChange={(e) => setField('website', e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Services offered */}
            <div className="space-y-2">
              <Label className={labelCls}>Services Offered</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICES.map((service) => {
                  const active = formData.servicesOffered.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                        active
                          ? 'border-[#171414] bg-[#171414] text-[#E1BAC2]'
                          : 'border-[#171414]/20 bg-white/60 text-[#4A4A4A] hover:border-[#171414]/40'
                      }`}
                    >
                      {active && <Check className="mr-1 inline h-3 w-3" />}
                      {service}
                    </button>
                  );
                })}
              </div>
              {fieldError('servicesOffered')}
            </div>

            {/* Operating hours */}
            <div className="space-y-2">
              <Label htmlFor="operatingHours" className={labelCls}>
                Operating Hours
              </Label>
              <Input
                id="operatingHours"
                value={formData.operatingHours}
                onChange={(e) => setField('operatingHours', e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Main render ──────────────────────────────────────────

  return (
    <AuthShell
      kicker="Partner Portal"
      title="Register Pawnshop"
      subtitle="Set up your branch to manage borrowers and create SAG tokens"
      auditNote="Wallet-based authentication · No password required"
      footerLinks={[
        { href: '/register', label: '← Back to role selection' },
        { href: '/pawnshop/login', label: 'Already have an account? Sign in' },
      ]}
    >
        <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
          {/* Header */}
          <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Pawnshop Registration
              </CardTitle>
              <span className="rounded-full bg-[#171414]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#171414]">
                Step {step} of 4
              </span>
            </div>
            <CardDescription className="text-[#4A4A4A]">
              {STEP_LABELS[step - 1]}
            </CardDescription>
          </CardHeader>

          {/* Step content */}
          <CardContent className="space-y-5 p-6">{renderStep()}</CardContent>

          {/* Navigation */}
          <div className={`flex items-center p-6 pt-0 ${step > 1 ? 'justify-between' : 'justify-center'}`}>
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                className="rounded-full border-[#171414]/20 font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button
                type="button"
                onClick={goNext}
                className="rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black"
              >
                Continue
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!isConnected || isSigning}
                className="rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-50"
              >
                {isSigning ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing &amp; Registering...
                  </div>
                ) : (
                  <>
                    <Building2 className="mr-1 h-4 w-4" />
                    Register
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Terms note */}
          <div className="border-t border-[#171414]/10 px-6 pb-6 pt-4">
            <p className="text-center text-xs text-muted-foreground">
              By registering you agree to our{' '}
              <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
                Partner Agreement
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </Card>
    </AuthShell>
  );
}
