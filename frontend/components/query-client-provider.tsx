'use client'

import { useAuth } from '@/hooks/use-auth'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AxiosError } from 'axios'
import router from 'next/router'
import { useState } from 'react'

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {

  const { refreshAuthToken, isAuthenticated, logout } = useAuth()

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes — data persists across page navigations
            gcTime: 30 * 60 * 1000, // 30 minutes — keep cached data alive longer
            refetchOnMount: false, // Never refetch on component mount — use cached data first
            refetchOnWindowFocus: false, // Don't refetch when tab gains focus
            refetchOnReconnect: false, // Don't refetch on network reconnect
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors except for 408, 429
              if (error?.response?.status >= 400 && error?.response?.status < 500) {
                if (error?.response?.status === 408 || error?.response?.status === 429) {
                  return failureCount < 3
                }
                return false
              }


              
              // Retry on network errors and 5xx errors
              return failureCount < 3
            },
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // Don't retry mutations on client errors
              if (error?.response?.status >= 400 && error?.response?.status < 500) {
                return false
              }
              return failureCount < 2
            },
          },
        },
        queryCache: new QueryCache({
          onError: async (error) => {
            if (error instanceof AxiosError) {
              console.log("error");
              if (error.response?.status === 401 && isAuthenticated) {
                console.log("refreshing auth token");
                const result = await refreshAuthToken();
                console.log("result", result);
                if (result) {
                  console.log("invalidating queries");
                  queryClient.invalidateQueries();
                } else {
                  console.log("logging out");
                  logout();
                  router.push('/');
                }
              }
            }

          },
        })
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
