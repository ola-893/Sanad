"use client"

import type React from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, ShieldIcon, UserIcon, WalletIcon } from "lucide-react"
import { Logo } from "@/components/logo"
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
  const [selectedRole, setSelectedRole] = useState("admin")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { authenticateUser } = useAuth()

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  })

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
    setIsSubmitting(true)

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
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentRole = adminRoles[selectedRole as keyof typeof adminRoles]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center space-y-2 text-center mb-8">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">Admin Access Portal</h1>
          <p className="text-sm text-muted-foreground">Comprehensive platform management & control</p>
        </div>

        <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
          <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5" />
              Admin Panel Access
            </CardTitle>
            <CardDescription className="text-[#4A4A4A]">
              Select your role and enter credentials to access the admin panel
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <Tabs value={selectedRole} onValueChange={setSelectedRole} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="admin" className="text-xs">Super Admin</TabsTrigger>
                <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
                <TabsTrigger value="branch_ops" className="text-xs">Branch Ops</TabsTrigger>
                <TabsTrigger value="support" className="text-xs">Support</TabsTrigger>
                <TabsTrigger value="ceo" className="text-xs">CEO</TabsTrigger>
              </TabsList>

              {Object.entries(adminRoles).map(([key, role]) => (
                <TabsContent key={key} value={key} className="space-y-4">
                  <div className="bg-gradient-to-r from-background to-muted p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-primary flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          {role.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                      <Badge variant="outline" className="bg-accent/10 text-primary border-accent/40">
                        {role.features.length} Features
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {role.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-1 text-primary">
                          <span className="w-2 h-2 bg-accent rounded-full"></span>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4 mt-6">
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm border border-destructive/30">{error}</div>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder={currentRole.email}
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
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link href="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <LockIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            className="pl-10 pr-10"
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 h-4 w-4 text-muted-foreground"
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

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E1BAC2] border-t-transparent"></div>
                      Authenticating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ShieldIcon className="h-4 w-4" />
                      Access {currentRole.title} Panel
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="rounded-b-3xl border-t border-[#171414]/10 bg-white/40">
            <div className="w-full text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                <WalletIcon className="inline h-4 w-4 mr-1" />
                Secure admin access with role-based permissions
              </p>
              <p className="text-xs text-muted-foreground">
                <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                  Back to User Login
                </Link>
                {" | "}
                <Link href="/" className="text-primary underline-offset-4 hover:underline">
                  Return to Homepage
                </Link>
              </p>
            </div>
          </CardFooter>
        </Card>

        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            🔒 All admin actions are logged and audited for security compliance
          </p>
        </div>
      </div>
    </div>
  )
}
