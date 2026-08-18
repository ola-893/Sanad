"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserProfileDisplay } from "@/components/auth/user-profile-display"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, User } from "lucide-react"
import { toast } from "sonner"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"

export default function ProfilePage() {
  const [user] = useAtom(userAtom)

  const handleRefreshProfile = () => {
    toast.success("Profile refreshed successfully")
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight">User Profile</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Account information
            </p>
          </div>
          <Button onClick={handleRefreshProfile} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Profile
          </Button>
        </div>

        {user ? (
          <UserProfileDisplay showHederaInfo={true} showPersonalInfo={true} />
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading user profile...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
