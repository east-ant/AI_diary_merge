// Custom hook for Google Identity Services authentication
"use client"

import { useState, useEffect, useCallback } from "react"
import { loadGoogleScript, initializeGoogleAuth, type GoogleUser } from "@/lib/google-auth"

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
    const handleGoogleSignIn = (event: CustomEvent<GoogleUser>) => {
      setUser(event.detail)
      // Store user in localStorage for persistence
      localStorage.setItem("googleUser", JSON.stringify(event.detail))
    }

    const handleGoogleSignInError = (event: CustomEvent<string>) => {
      console.error("[v0] Google Sign-In error:", event.detail)
      setUser(null)
      localStorage.removeItem("googleUser")
    }

    window.addEventListener("googleSignIn", handleGoogleSignIn as EventListener)
    window.addEventListener("googleSignInError", handleGoogleSignInError as EventListener)

    // Check for existing user in localStorage
    const storedUser = localStorage.getItem("googleUser")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error("[v0] Error parsing stored user:", error)
        localStorage.removeItem("googleUser")
      }
    }

    return () => {
      window.removeEventListener("googleSignIn", handleGoogleSignIn as EventListener)
      window.removeEventListener("googleSignInError", handleGoogleSignInError as EventListener)
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem("googleUser")

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
