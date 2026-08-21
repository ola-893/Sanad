"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/investor/profile")
  }, [router])

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
        <p className="text-sm text-[#4A4A4A]">Redirecting to your profile...</p>
      </div>
    </div>
  )
}
