"use client"

import { AuthForm } from "@/components/auth-form"
import { useGoogleAuth } from "@/hooks/use-google-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoginPage() {
  const { user, loading } = useGoogleAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Notebook lines */}
          <defs>
            <pattern id="lines" x="0" y="0" width="400" height="30" patternUnits="userSpaceOnUse">
              <line x1="0" y1="30" x2="400" y2="30" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="400" height="400" fill="url(#lines)" />

          {/* Notebook margin */}
          <line x1="60" y1="0" x2="60" y2="400" stroke="currentColor" strokeWidth="1" opacity="0.3" />

          {/* Spiral binding holes */}
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx="30" cy={50 + i * 40} r="3" fill="currentColor" opacity="0.2" />
          ))}

          {/* Decorative journal elements */}
          <rect x="80" y="80" width="240" height="2" fill="currentColor" opacity="0.1" />
          <rect x="80" y="120" width="180" height="2" fill="currentColor" opacity="0.1" />
          <rect x="80" y="160" width="200" height="2" fill="currentColor" opacity="0.1" />

          {/* Corner bookmark */}
          <polygon points="350,0 400,0 400,50" fill="currentColor" opacity="0.1" />
        </svg>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-3 text-balance">AI Diary</h1>
            <p className="text-muted-foreground text-base text-pretty leading-relaxed">
              Transform your photos into meaningful journal entries with AI
            </p>
          </div>

          <AuthForm />
        </div>
      </div>
    </div>
  )
}
