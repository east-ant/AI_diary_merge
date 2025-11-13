// Google Identity Services configuration and utilities
"use client"

export interface GoogleUser {
  id: string
  name: string
  email: string
  picture: string
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
          prompt: () => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

// Initialize Google Identity Services
export const initializeGoogleAuth = (clientId: string) => {
  if (typeof window === "undefined" || !window.google) return

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
  })
}

const base64UrlDecode = (str: string): string => {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/")

  // Add padding if needed
  const padding = base64.length % 4
  if (padding) {
    base64 += "=".repeat(4 - padding)
  }

  // Decode base64 and handle UTF-8 characters properly
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  // Use TextDecoder for proper UTF-8 decoding
  const decoder = new TextDecoder('utf-8')
  return decoder.decode(bytes)
}

// Handle the credential response from Google
const handleCredentialResponse = (response: any) => {
  try {
    const payload = JSON.parse(base64UrlDecode(response.credential.split(".")[1]))

    const user: GoogleUser = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    }

    // Log user info to console as requested
    console.log("[v0] Google Sign-In successful:", {
      name: user.name,
      email: user.email,
      profilePicture: user.picture,
    })

    // Dispatch custom event with user data
    window.dispatchEvent(new CustomEvent("googleSignIn", { detail: user }))
  } catch (error) {
    console.error("[v0] Error parsing Google credential:", error)
    window.dispatchEvent(new CustomEvent("googleSignInError", { detail: "Failed to parse user data" }))
  }
}

// Render Google Sign-In button
export const renderGoogleButton = (element: HTMLElement, clientId: string) => {
  if (typeof window === "undefined" || !window.google || !element) return

  window.google.accounts.id.renderButton(element, {
    theme: "outline",
    size: "large",
    width: element.offsetWidth,
    text: "signin_with",
    shape: "rectangular",
  })
}

// Load Google Identity Services script
export const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not defined"))
      return
    }

    if (window.google) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"))

    document.head.appendChild(script)
  })
}
