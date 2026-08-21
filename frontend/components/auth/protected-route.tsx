"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from '@/hooks/use-auth'
import { UserRole } from '@/lib/auth/auth-service'
import { useAtom } from 'jotai'
import { userAtom } from '@/store/atoms'
import { BrandedLoader } from '@/components/branded-loader'
import apiInstance from "@/lib/axios-v1"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  fallback?: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
  redirectTo
}: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const [user, setUser] = useAtom(userAtom);
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }

    // Always fetch fresh profile to get the latest role from DB
    // (JWT roleName may be stale if role was changed after login)
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const response = await apiInstance.get('/auth/user/profile');
        if (!cancelled) {
          if (response.data.success) {
            setUser(response.data.data);
          } else {
            setUser(null);
            router.push(redirectTo || '/login');
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          router.push(redirectTo || '/login');
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    fetchProfile();

    return () => { cancelled = true; };
  }, [isAuthenticated, user, setUser, redirectTo, router]);

  if (!isAuthenticated || checking) {
    return fallback ?? <BrandedLoader message="Verifying access..." />;
  }

  if (!user) {
    return <BrandedLoader message="Redirecting..." />;
  }

  const normalize = (role: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'admin',
      COMPANY_ADMIN: 'admin',
      PAWNSHOP: 'pawnshop',
      INVESTOR: 'investor',
      BORROWER: 'borrower',
    }
    return map[role] || role.toLowerCase()
  }

  const userRole = normalize(user?.userInfo?.roleId || '')
  const roles = requiredRole?.split(',');

  if (requiredRole && !roles?.includes(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    requiredRole?: UserRole
    redirectTo?: string
  } = {}
) {
  return function AuthenticatedComponent(props: T) {
    return (
      <ProtectedRoute
        requiredRole={options.requiredRole}
        redirectTo={options.redirectTo}
      >
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

export function withRole<T extends object>(
  Component: React.ComponentType<T>,
  requiredRole: UserRole
) {
  return withAuth(Component, { requiredRole })
}
