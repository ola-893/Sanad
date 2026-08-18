'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Homepage error:', error)
  }, [error])

  return (
    <div className="flex flex-col min-h-screen bg-softBeige">
      {/* Hero Section */}
      <section className="relative bg-deepGreen py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-ivory">Oops! Something went wrong</h1>
          <p className="text-lg md:text-xl opacity-90 text-ivory">
            We&apos;re having trouble loading the investment opportunities.
          </p>
        </div>
      </section>

      {/* Error Content */}
      <section className="py-16 flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 md:px-6">
          <Card className="max-w-md mx-auto border-destructive/30 bg-destructive/10">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Failed to Load Data</CardTitle>
              <CardDescription className="text-destructive">
                We couldn&apos;t fetch the latest SAG investment opportunities. This might be due to:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-destructive space-y-2">
                <li>• API server is temporarily unavailable</li>
                <li>• Network connectivity issues</li>
                <li>• Server maintenance in progress</li>
              </ul>
              
              <div className="flex flex-col gap-3 mt-6">
                <Button 
                  onClick={reset}
                  className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Reload Page
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-xs text-destructive cursor-pointer">Technical Details</summary>
                  <pre className="text-xs text-red-400 mt-2 p-2 bg-destructive/10 rounded overflow-auto">
                    {error.message}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
