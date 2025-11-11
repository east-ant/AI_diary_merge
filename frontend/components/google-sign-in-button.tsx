// Google Sign-In button component using Google Identity Services
"use client"

import { useEffect, useRef } from "react"
import { renderGoogleButton } from "@/lib/google-auth"
import { Button } from "@/components/ui/button"

interface GoogleSignInButtonProps {
  disabled?: boolean
  onError?: (error: string) => void
}

export function GoogleSignInButton({ disabled, onError }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const fallbackRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    console.log("🔍 Google Client ID:", clientId)

    if (!clientId || clientId === "demo-client-id") {
      console.error("❌ Google Client ID가 설정되지 않았습니다!")
      return
    }

    if (!buttonRef.current) {
      console.error("❌ Button ref가 없습니다!")
      return
    }

    // ✅ window.google이 준비될 때까지 대기
    const checkAndRender = () => {
      if (typeof window !== "undefined" && window.google) {
        console.log("✅ Google 로드됨, 버튼 렌더링...")
        try {
          renderGoogleButton(buttonRef.current!, clientId)
          console.log("✅ 구글 버튼 렌더링 완료")
        } catch (error) {
          console.error("❌ Google 버튼 렌더링 오류:", error)
          onError?.("Failed to load Google Sign-In")
        }
      } else {
        console.log("⏳ Google 로드 대기 중...")
        setTimeout(checkAndRender, 100)
      }
    }

    checkAndRender()
  }, [onError])

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  // Show setup message if client ID is not configured
  if (!clientId || clientId === "demo-client-id") {
    console.warn("⚠️ Google Client ID가 설정되지 않았습니다. 구글 로그인을 사용할 수 없습니다.")
    return (
      <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ Google Client ID가 설정되지 않았습니다.
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          .env.local 파일에 NEXT_PUBLIC_GOOGLE_CLIENT_ID를 설정해주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Google's rendered button will appear here */}
      <div 
        ref={buttonRef} 
        className="w-full flex justify-center"
        style={{ minHeight: "48px" }}
      />

      {/* Fallback button (hidden when Google button loads) */}
      <Button
        ref={fallbackRef}
        type="button"
        variant="outline"
        disabled={disabled}
        className="w-full h-12 border-border/50 hover:bg-accent/50 transition-all duration-200 rounded-lg bg-transparent"
        style={{ display: "none" }}
      >
        <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {disabled ? "Loading..." : "Sign in with Google"}
      </Button>
    </div>
  )
}