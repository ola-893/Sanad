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
    // If not authenticated at all, stop checking and let the render handle it
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }

    // If user data already exists, we're good
    if (user) {
      setChecking(false);
      return;
    }

    // Token exists but user atom is empty — fetch profile from API
    const fetchProfile = async () => {
      try {
        const response = await apiInstance.get('/auth/user/profile');
        if (response.data.success) {
          setUser(response.data.data);
        } else {
          // Profile fetch failed — token might be expired
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setChecking(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, user, setUser]);

  // Still loading auth state or fetching profile
  if (!isAuthenticated || checking) {
    return fallback ?? <BrandedLoader message="Verifying access..." />;
  }

  // Not authenticated — redirect to login
  if (!user) {
    router.push(redirectTo || '/login');
    return <BrandedLoader message="Redirecting..." />;
  }

  /**
   * Normalize a backend role name to the short lowercase identifier
   * the frontend uses ("admin", "pawnshop", "investor").
   */
  const normalize = (role: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'admin',
      COMPANY_ADMIN: 'admin',
      PAWNSHOP: 'pawnshop',
      INVESTOR: 'investor',
      BORROWER: 'investor',
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

/**
 * HOC for protecting pages
 */
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

/**
 * HOC for role-based protection
 */
export function withRole<T extends object>(
  Component: React.ComponentType<T>,
  requiredRole: UserRole
) {
  return withAuth(Component, { requiredRole })
}
