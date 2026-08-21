'use client'

import { useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar'
import { Building2, LogOut, FileText, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Logo } from '../logo'
import { ProtectedRoute } from '@/components/auth/protected-route'

interface PawnshopLayoutProps {
  children: React.ReactNode
}

export default function PawnshopLayout({ children }: PawnshopLayoutProps) {
  const router = useRouter()

  const navigation = [
    { name: 'Dashboard', href: '/pawnshop/dashboard', icon: Building2 },
    { name: 'Pledge Requests', href: '/pawnshop/requests', icon: Inbox },
    { name: 'My NFTs', href: '/pawnshop/nfts', icon: FileText },
  ]

  const handleSignOut = () => {
    // Clear sessionStorage
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('userType')
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    sessionStorage.removeItem('expiredAt')

    // Clear localStorage auth state
    localStorage.removeItem('authState')

    toast.success('Signed out successfully')
    router.push('/pawnshop/login')
  }

  return (
    <ProtectedRoute requiredRole="pawnshop">
      <div className="h-full">
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <div className="flex h-16 flex-col items-center justify-center gap-2">
                <Logo />
                <h1 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Pawnshop Portal
                </h1>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigation.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild>
                          <a href={item.href}>
                            <item.icon />
                            <span>{item.name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start">
                      <LogOut />
                      <span>Sign out</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset>
            <main className="flex-1 space-y-4 p-8 pt-6 h-full overflow-auto">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </ProtectedRoute>
  )
}
