// Custom hook for Google Identity Services authentication
"use client"

import { useState, useEffect, useCallback } from "react"
import { loadGoogleScript, initializeGoogleAuth, type GoogleUser } from "@/lib/google-auth"

// ✅ 백엔드 URL (환경변수로 관리)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

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
      console.log("✅ Google Sign-In 이벤트 받음:", userData)

      try {
        // ✅ 백엔드로 Google 로그인 정보 전송
        console.log("📤 백엔드로 요청 전송:", {
          url: `${BACKEND_URL}/api/google-login`,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        })

        const response = await fetch(`${BACKEND_URL}/api/google-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userData.email,
            name: userData.name || "",
            picture: userData.picture || "",
          }),
        })

        console.log("📊 백엔드 응답 상태:", response.status, response.statusText)
        console.log("📊 Content-Type:", response.headers.get("content-type"))

        // ✅ 응답을 먼저 텍스트로 읽기
        const responseText = await response.text()
        console.log("📝 원본 응답:", responseText.substring(0, 500))

        // ✅ JSON 파싱 시도
        let backendResponse
        try {
          backendResponse = JSON.parse(responseText)
        } catch (parseError) {
          console.error("❌ JSON 파싱 실패:", parseError)
          console.error("❌ 받은 텍스트:", responseText)
          throw new Error("백엔드에서 유효한 JSON을 반환하지 않았습니다")
        }

        console.log("📝 백엔드 응답 파싱됨:", backendResponse)

        if (!response.ok) {
          throw new Error(backendResponse.msg || `HTTP Error: ${response.status}`)
        }

        if (backendResponse.success) {
          // ✅ 백엔드에서 받은 사용자 정보로 상태 업데이트
          const userWithBackendData = {
            ...backendResponse.user,
            email: backendResponse.user.email,
            username: backendResponse.user.username,
            picture: backendResponse.user.picture || userData.picture,
          }

          console.log("✅ 로그인 성공, 사용자 정보:", userWithBackendData)
          setUser(userWithBackendData)

          // ✅ localStorage에 저장
          localStorage.setItem("googleUser", JSON.stringify(userWithBackendData))
          localStorage.setItem("userEmail", userWithBackendData.email)
          localStorage.setItem("userId", userWithBackendData.email)
        } else {
          throw new Error(backendResponse.msg || "로그인 실패")
        }
      } catch (error) {
        console.error("❌ Google 로그인 처리 오류:", error)
        console.error("❌ 에러 상세:", (error as Error).message)
        setUser(null)
        localStorage.removeItem("googleUser")
      }
    }

    const handleGoogleSignInError = (event: CustomEvent<string>) => {
      console.error("[v0] Google Sign-In error:", event.detail)
      setUser(null)
      localStorage.removeItem("googleUser")
    }

    // ✅ localStorage에서 저장된 사용자 정보 확인
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("googleUser")
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          console.log("✅ 저장된 사용자 로드:", parsedUser)
          setUser(parsedUser)
        } catch (error) {
          console.error("[v0] Error parsing stored user:", error)
          localStorage.removeItem("googleUser")
        }
      }
    }

    window.addEventListener("googleSignIn", handleGoogleSignIn as any)
    window.addEventListener("googleSignInError", handleGoogleSignInError as any)

    return () => {
      window.removeEventListener("googleSignIn", handleGoogleSignIn as any)
      window.removeEventListener("googleSignInError", handleGoogleSignInError as any)
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem("googleUser")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userId")

    if (typeof window !== "undefined" && window.google) {
      window.google.accounts.id.disableAutoSelect()
    }
  }, [])

  return {
    user,
    loading,
    isGoogleLoaded,
    signOut,
  }
}