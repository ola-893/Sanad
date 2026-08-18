"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, ShieldIcon, UserIcon } from "lucide-react"
import { Logo } from "@/components/logo"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { authenticateUser } from "@/lib/auth/auth-actions"

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(2, 'Password must be at least 2 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const { authenticateUser } = useAuth()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Redirect if already authenticated
  // useEffect(() => {
  //   if (!isLoading && isAuthenticated && role) {
  //     console.log('🔐 Already authenticated, redirecting...', { role })
  //     router.replace('/dashboard')
  //   }
  // }, [router])

  const onSubmit = async (data: LoginFormData) => {
    // try {
      

    //   // sessionStorage.setItem('loginType', 'investor')
      
    //   toast.success('Login Successful!')
    //   // setTimeout(() => {
    //   //   router.push('/dashboard')
    //   // }, 1000)
    // } catch (err: any) {
    //   console.error('Login error:', err)
      
    //   if (err.message?.includes('401') || err.message?.includes('Invalid')) {
    //     form.setError('password', {
    //       type: 'manual',
    //       message: 'Invalid email or password. Please try again.',
    //     })
    //     toast.error('Invalid email or password. Please try again.')
    //   } else {
    //     toast.error('Error signing in. Please try again later.')
    //   }
    // }

    const response = authenticateUser(
        {
          email: data.email,
          password: data.password,
        }
      )
    

    toast.promise(response, {
      loading: 'Signing in...',
      success: (response: any) => {

        console.log("data", response);

        if (!response.success) {
          console.log("response failed??", response);
          // router.push('/dashboard');
          throw new Error('Invalid email or password. Please try again.')
          // toast.error();
        }

        router.push('/dashboard');
        return 'Login Successful!';
      },
      error: 'Invalid email or password. Please try again.',
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="flex flex-col items-center space-y-2 text-center mb-8">
            <div className="mx-auto mb-4">
              <Logo />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#171414]">Investor Login</h1>
            <p className="text-sm text-muted-foreground">Sign in to your investor account to continue</p>
          </div>

          <Card className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader className="rounded-t-3xl border-b border-[#171414]/10">
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    Investor Login
                  </CardTitle>
                  <CardDescription className="text-[#4A4A4A]">Enter your credentials to access your investor account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
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
                              placeholder="name@example.com"
                              className="pl-10"
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
                              placeholder="Enter your password"
                              className="pl-10 pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 h-4 w-4 text-muted-foreground"
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
                    className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black" 
                    // disabled={isLoading || form.formState.isSubmitting}
                    >
                    {/* {isLoading || form.formState.isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Signing in...
                      </div>
                    ) : ( */}
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        Sign In
                      </div>
                    {/* )} */}
                  </Button>

              <div className="flex items-center gap-2 w-full">
                <hr className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">OR</span>
                <hr className="flex-1 border-t border-border" />
              </div>

              <Button type="button" variant="outline" className="w-full border-[#171414]/15 text-[#171414] hover:bg-white/60" onClick={() => router.push("/admin/login")}>
                <ShieldIcon className="mr-2 h-4 w-4" />
                Admin Login
              </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="text-primary underline-offset-4 hover:underline font-medium">
                      Register
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </Form>
          </Card>

          <div className="text-center mt-6">
            <p className="text-xs text-muted-foreground">
              🔒 Secure customer access with encrypted authentication
            </p>
            <div className="mt-2 space-x-2">
              <Link href="/admin/login" className="text-xs text-primary underline-offset-4 hover:underline">
                Admin / Ar Rahnu Login
              </Link>
              <span className="text-xs text-muted-foreground">|</span>
              <Link href="/" className="text-xs text-primary underline-offset-4 hover:underline">
                Return to Homepage
              </Link>
            </div>
          </div>
      </div>
    </main> 
    </div>
  )
}
