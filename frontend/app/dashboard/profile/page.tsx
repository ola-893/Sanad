"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAtom } from "jotai"
import { userAtom } from "@/store/atoms"
import { Loader2 } from "lucide-react"

export default function ProfileRedirectPage() {
  const router = useRouter()
  const [user] = useAtom(userAtom)

  useEffect(() => {
    const role = user?.userInfo?.roleId?.toLowerCase() || ""
    if (role === "borrower") {
      router.replace("/dashboard/borrower/profile")
    } else {
      router.replace("/dashboard/investor/profile")
    }
  }, [user, router])

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#E1BAC2]" />
        <p className="text-sm text-[#4A4A4A]">Redirecting to your profile...</p>
      </div>
    </div>
  )
}
