// Custom hook for Google Identity Services authentication
"use client"

import { useState, useEffect, useCallback } from "react"
import { loadGoogleScript, initializeGoogleAuth, type GoogleUser } from "@/lib/google-auth"
import { googleLogin, clearUserData } from "@/lib/api-client"

export function useGoogleAuth() {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)

  // Load Google Identity Services script
  useEffect(() => {
    const loadGoogle = async () => {
      try {
        await loadGoogleScript()
        setIsGoogleLoaded(true)

        // Initialize with a demo client ID (user needs to replace this)
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "demo-client-id"
        initializeGoogleAuth(clientId)
      } catch (error) {
        console.error("[v0] Failed to load Google Identity Services:", error)
      } finally {
        setLoading(false)
      }
    }

    loadGoogle()
  }, [])

  // Listen for Google sign-in events
  useEffect(() => {
    const handleGoogleSignIn = async (event: CustomEvent<GoogleUser>) => {
      const userData = event.detail
      // 👇 한글 이름 UTF-8 인코딩 확인
      const fixedUser = {
        ...userData,
        name: userData.name || '',
        email: userData.email || ''
      }
      
      // ✅ 백엔드에 Google 로그인 정보 전송
      try {
        const response = await googleLogin({
          email: fixedUser.email,
          name: fixedUser.name,
          picture: fixedUser.picture,
        })
        
        if (response.success) {
          console.log("✅ 백엔드에 사용자 정보 저장 완료")
        } else {
          console.error("❌ 백엔드 저장 실패:", response.error)
        }
      } catch (error) {
        console.error("❌ 백엔드 연동 오류:", error)
      }
      
      setUser(fixedUser)
      // Store user in localStorage for persistence
      localStorage.setItem("googleUser", JSON.stringify(fixedUser))
      localStorage.setItem("userId", fixedUser.email)
      window.location.href = "/diary"
    }

    const handleGoogleSignInError = (event: CustomEvent<string>) => {
      console.error("[v0] Google Sign-In error:", event.detail)
      setUser(null)
      localStorage.removeItem("googleUser")
      clearUserData()
    }

    // 👇 먼저 localStorage에서 확인
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("googleUser")
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          console.log("Stored user:", parsedUser) // 👈 디버깅용
          setUser(parsedUser)
        } catch (error) {
          console.error("[v0] Error parsing stored user:", error)
          localStorage.removeItem("googleUser")
          clearUserData()
        }
      }
    }

    window.addEventListener("googleSignIn", handleGoogleSignIn as EventListener)
    window.addEventListener("googleSignInError", handleGoogleSignInError as EventListener)

    return () => {
      window.removeEventListener("googleSignIn", handleGoogleSignIn as EventListener)
      window.removeEventListener("googleSignInError", handleGoogleSignInError as EventListener)
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem("googleUser")
    clearUserData()

    // Disable auto-select for next sign-in
    if (typeof window !== "undefined" && window.google) {
      window.google.accounts.id.disableAutoSelect()
    }
  }, [])

  // Dummy functions for email/password (UI only as requested)
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    console.log("[v0] Email sign-in (dummy):", { email, password })
    return { user: null, error: "Email sign-in is not implemented yet" }
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    console.log("[v0] Email sign-up (dummy):", { email, password })
    return { user: null, error: "Email sign-up is not implemented yet" }
  }, [])

  return {
    user,
    loading,
    isGoogleLoaded,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }
}