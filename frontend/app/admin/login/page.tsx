"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { EyeIcon, EyeOffIcon, Loader2, LockIcon, MailIcon, ShieldCheckIcon } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(3, "Password must be at least 6 characters"),
})

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const { authenticateUser } = useAuth()

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  })

  const isSubmitting = form.formState.isSubmitting
  const adminRoles = {
    admin: {
      title: "Super Admin",
      description: "Full platform control & access",
      email: "admin@sanad.finance",
      password: "admin123",
      features: [
        "🔐 Full Access & Security Control",
        "🏛️ Complete SAG Management",
        "🧮 Repayment & Extension Control",
        "🧾 Investor Management",
        "🏦 Wallet & Creditcoin Integration",
        "🧑‍💼 Ar Rahnu Partner Management",
        "⚠️ Compliance & Risk Management",
        "📈 Reporting & Analytics",
        "🔧 Platform Configuration",
        "📣 Notification & Communication",
        "💬 Support & Helpdesk Tools",
        "🧪 Developer/Testing Tools",
      ],
    },
    compliance: {
      title: "Compliance Officer",
      description: "KYC, AML & Risk Management",
      email: "compliance@sanad.finance",
      password: "compliance123",
      features: [
        "⚠️ Full Compliance & Risk Access",
        "🧾 Investor KYC Management",
        "🏛️ SAG Approval Workflow",
        "📈 Risk Analytics & Reporting",
        "💬 Compliance Support Tools",
      ],
    },
    branch_ops: {
      title: "Branch Operations",
      description: "Ar Rahnu branch management",
      email: "branchops@sanad.finance",
      password: "branch123",
      features: [
        "🧑‍💼 Ar Rahnu Partner Management",
        "🏛️ SAG Listing Management",
        "🧮 Repayment Monitoring",
        "📈 Branch Performance Analytics",
      ],
    },
    support: {
      title: "Customer Support",
      description: "User support & helpdesk",
      email: "support@sanad.finance",
      password: "support123",
      features: [
        "💬 Full Support & Helpdesk Tools",
        "🧾 Investor Account Management",
        "📣 Communication Tools",
        "🏛️ Basic SAG Information Access",
      ],
    },
    ceo: {
      title: "CEO Dashboard",
      description: "Executive overview & reports",
      email: "ceo@sanad.finance",
      password: "ceo123",
      features: [
        "📈 Executive Reporting & Analytics",
        "🏛️ Platform Overview",
        "🧑‍💼 Partner Performance",
        "⚠️ Risk Overview",
        "🔧 Strategic Configuration",
      ],
    },
  }

  const handleLogin = async (values: z.infer<typeof loginFormSchema>) => {
    setError("")

    try {
      const result = await authenticateUser({
        email: values.email,
        password: values.password,
        isAdmin: true,
      })

      if (result.success) {
        toast.success("Login Successful!")
        router.replace("/admin/dashboard")
      } else {
        const message = result.error || "Invalid email or password. Please try again."
        setError(message)
        toast.error(message)
      }
    } catch (err: any) {
      console.error("Admin login error:", err)
      const message = err.message || "Login failed. Please try again."
      setError(message)
      toast.error(message)
    }
  }

  return (
    <AuthShell
      kicker="Administration"
      title="Admin Access"
      subtitle="Sign in to the Sanad management console"
      auditNote="Role-based access · Sessions logged and audited"
      footerLinks={[
        { href: "/login", label: "User Login" },
        { href: "/", label: "Return to Homepage" },
      ]}
    >
      <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleLogin)}>
            <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5" />
                Sign in
              </CardTitle>
              <CardDescription className="text-[#4A4A4A]">
                Your role and permissions are assigned by the platform administrator
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-6">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          autoComplete="email"
                          placeholder="name@example.com"
                          className="pl-10"
                          disabled={isSubmitting}
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
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          disabled={isSubmitting}
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

            <CardFooter className="p-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4" />
                    Sign In
                  </div>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </AuthShell>
  )
}
