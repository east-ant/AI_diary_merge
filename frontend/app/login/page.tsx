"use client"

import { AuthForm } from "@/components/auth-form"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // ✅ localStorage에서 userId 확인 (클라이언트에서만)
  useEffect(() => {
    if (!isClient) return

    const userId = localStorage.getItem("userId")
    console.log("🔍 userId 확인:", userId)

    if (userId) {
      console.log("✅ userId 있음, /diary로 이동")
      router.push("/diary")
    }
  }, [isClient, router])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* ... 배경 SVG ... */}

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-3 text-balance">TRAVELY</h1>
            <p className="text-muted-foreground text-base text-pretty leading-relaxed">
              AI와 함께하는 여행 일기
            </p>
          </div>

          <AuthForm />

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 메인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}