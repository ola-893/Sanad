'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfileRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/investor/profile') }, [router])
  return <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8]"><p className="text-sm text-[#4A4A4A]">Redirecting...</p></div>
}
