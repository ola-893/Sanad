"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { EyeIcon, EyeOffIcon, Loader2, LockIcon, MailIcon, StoreIcon } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import apiInstance from '@/lib/axios-v1'
import { toast } from 'sonner'
import type { AxiosError, AxiosResponse } from 'axios'
import { useAtom } from 'jotai'
import { authStateAtom } from '@/store/atoms'

const loginSchema = z.object({
  username: z.string().email('Please enter a valid email address'),
  password: z.string().min(2, 'Password must be at least 2 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function PawnshopLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [, setAuthState] = useAtom(authStateAtom)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    const response = apiInstance.post('/auth/login', data);

    toast.promise(response, {
      loading: 'Signing in...',
      success: (returnedData: AxiosResponse) => {
        const tokenData = returnedData.data.data;
        const role = tokenData.roleName || tokenData.role || 'PAWNSHOP';

        // Store tokens in sessionStorage for the pawnshop portal
        sessionStorage.setItem("accessToken", tokenData.accessToken);
        sessionStorage.setItem("refreshToken", tokenData.refreshToken);
        sessionStorage.setItem("expiredAt", tokenData.expiredAt);
        sessionStorage.setItem("userType", "pawnshop");

        // Update the Jotai auth state so the rest of the app knows the user is authenticated
        setAuthState({
          isAuthenticated: true,
          role: role,
          isLoading: false,
          user: {
            userInfo: {
              roleId: role,
              ...tokenData.user,
            },
          } as any,
        });

        // Also store in localStorage for the admin panel compatibility
        localStorage.setItem('authState', JSON.stringify({
          isAuthenticated: true,
          token: tokenData.accessToken,
          userType: 'pawnshop',
          refreshToken: tokenData.refreshToken,
        }));

        setTimeout(() => {
          router.push('/pawnshop/dashboard')
        }, 2000)

        return `Login Successful!`
      },
      error: (error: AxiosError) => {
        if (error.status === 401) {
          form.setError('password', {
            type: 'manual',
            message: 'Invalid email or password. Please try again.',
          })
          return 'Invalid email or password. Please try again.'
        }
        return 'Error signing in. Please try again later.'
      }
    });
  }

  return (
    <AuthShell
      kicker="Partner Portal"
      title="Pawnshop Portal"
      subtitle="Sign in to your pawnshop account"
      auditNote="Secure pawnshop access with encrypted authentication"
      footerLinks={[
        { href: "/login", label: "Customer Login" },
        { href: "/", label: "Return to Homepage" },
      ]}
    >
      <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
              <CardTitle className="flex items-center gap-2">
                <StoreIcon className="h-5 w-5" />
                Pawnshop Login
              </CardTitle>
              <CardDescription className="text-[#4A4A4A]">Enter your credentials to access your pawnshop dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          autoComplete="email"
                          className="pl-10"
                          placeholder="name@example.com"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      Password
                      <Link
                        href="/forgot-password"
                        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 h-4 w-4 text-muted-foreground disabled:opacity-50"
                          disabled={form.formState.isSubmitting}
                        >
                          {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 p-6">
              <Button
                disabled={form.formState.isSubmitting}
                type="submit"
                className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-60"
              >
                {form.formState.isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <StoreIcon className="h-4 w-4" />
                    Sign in to Pawnshop
                  </div>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                  Register
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </AuthShell>
  )
}
