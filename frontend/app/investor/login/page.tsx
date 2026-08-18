"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EyeIcon, EyeOffIcon, Loader2, LockIcon, MailIcon, UserIcon } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

const loginSchema = z.object({
  username: z.string().email('Please enter a valid email address'),
  password: z.string().min(2, 'Password must be at least 2 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const { authenticateUser } = useAuth()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const isSubmitting = form.formState.isSubmitting

  async function onSubmit(data: LoginFormData) {
    const result = await authenticateUser({ email: data.username, password: data.password })
    if (result.success) {
      toast.success('Login Successful!')
      router.push('/investor/dashboard')
    } else {
      const message = result.error || 'Invalid email or password. Please try again.'
      form.setError('password', { type: 'manual', message })
      toast.error(message)
    }
  }

  return (
    <AuthShell
      kicker="Investor Portal"
      title="Investor Login"
      subtitle="Sign in to your investor account to continue"
      auditNote="Secure access with encrypted authentication"
      footerLinks={[
        { href: "/admin/login", label: "Admin / Ar Rahnu Login" },
        { href: "/", label: "Return to Homepage" },
      ]}
    >
      <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Investor Login
              </CardTitle>
              <CardDescription className="text-[#4A4A4A]">Enter your credentials to access your account</CardDescription>
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
                          disabled={isSubmitting}
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
                      <Link href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
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
                          disabled={isSubmitting}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 h-4 w-4 text-muted-foreground disabled:opacity-50"
                          disabled={isSubmitting}
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
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Sign In
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
