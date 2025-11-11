"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { useGoogleAuth } from "@/hooks/use-google-auth"
import { useToast } from "@/hooks/use-toast"

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { signInWithEmail, signUpWithEmail, isGoogleLoaded } = useGoogleAuth()
  const { toast } = useToast()

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  // Show setup guide if Google Client ID is not configured
  if (!clientId || clientId === "demo-client-id") {
    return (
      <Card className="border-border/30 shadow-xl backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-2 text-center pb-6">
          <CardTitle className="text-2xl font-semibold text-balance text-destructive">Google Setup Required</CardTitle>
          <CardDescription className="text-muted-foreground text-pretty leading-relaxed">
            Please configure Google Identity Services to enable authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
            <h3 className="font-medium text-foreground mb-2">Required Environment Variable:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 font-mono">
              <li>• NEXT_PUBLIC_GOOGLE_CLIENT_ID</li>
            </ul>
          </div>
          <div className="bg-accent/50 p-4 rounded-lg border border-border/50">
            <p className="text-sm text-foreground">
              <strong>How to set up:</strong>
            </p>
            <ol className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>1. Go to Google Cloud Console</li>
              <li>2. Create a new project or select existing</li>
              <li>3. Enable Google Identity Services API</li>
              <li>4. Create OAuth 2.0 credentials</li>
              <li>5. Add your domain to authorized origins</li>
              <li>6. Copy the Client ID</li>
              <li>7. Click gear icon (⚙️) in top right of v0</li>
              <li>8. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID variable</li>
              <li>9. Refresh the page</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isLogin) {
        // ✅ 로그인 시도
        console.log("📥 로그인 시도:", email)
        const { user, error } = await signInWithEmail(email, password)
        
        if (error) {
          console.error("❌ 로그인 실패:", error)
          toast({
            title: "Sign in failed",
            description: error,
            variant: "destructive",
          })
          setIsLoading(false)
        } else {
          console.log("✅ 로그인 성공", user)
          toast({
            title: "Welcome back!",
            description: "You've successfully signed in to AI Diary.",
          })
          
          // ✅ 로그인 성공 후 /diary로 이동
          console.log("🚀 /diary로 이동 중...")
          setTimeout(() => {
            router.push("/diary")
          }, 500)
        }
      } else {
        // ✅ 회원가입 시도
        if (password !== confirmPassword) {
          toast({
            title: "Password mismatch",
            description: "Please make sure your passwords match.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        console.log("📥 회원가입 시도:", email)
        const { user, error } = await signUpWithEmail(email, password)
        
        if (error) {
          console.error("❌ 회원가입 실패:", error)
          toast({
            title: "Sign up failed",
            description: error,
            variant: "destructive",
          })
          setIsLoading(false)
        } else {
          console.log("✅ 회원가입 성공", user)
          toast({
            title: "Account created!",
            description: "Welcome to AI Diary. Start capturing your memories!",
          })
          
          // ✅ 회원가입 성공 후 로그인 폼으로 전환
          setIsLogin(true)
          setPassword("")
          setConfirmPassword("")
          setEmail(email)
          setIsLoading(false)
          
          toast({
            title: "이제 로그인하세요",
            description: "방금 생성한 계정으로 로그인해주세요.",
          })
        }
      }
    } catch (error) {
      console.error("❌ 에러:", error)
      toast({
        title: "Authentication error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleGoogleError = (error: string) => {
    toast({
      title: "Google sign in failed",
      description: error,
      variant: "destructive",
    })
  }

  return (
    <Card className="border-border/30 shadow-xl backdrop-blur-sm bg-card/95">
      <CardHeader className="space-y-2 text-center pb-6">
        <CardTitle className="text-2xl font-semibold text-balance">
          {isLogin ? "Welcome back" : "Create your account"}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-pretty leading-relaxed">
          {isLogin
            ? "Sign in to continue your journaling journey"
            : "Start capturing your memories with AI-powered insights"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 bg-input/50 border-border/50 focus:border-primary/50 transition-all duration-200 rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 bg-input/50 border-border/50 focus:border-primary/50 transition-all duration-200 rounded-lg"
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 bg-input/50 border-border/50 focus:border-primary/50 transition-all duration-200 rounded-lg"
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 rounded-lg shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? (isLogin ? "Signing in..." : "Creating account...") : isLogin ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground font-medium">Or continue with</span>
          </div>
        </div>

        <GoogleSignInButton disabled={isLoading || !isGoogleLoaded} onError={handleGoogleError} />

        <div className="text-center pt-2">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setEmail("")
                setPassword("")
                setConfirmPassword("")
              }}
              className="text-primary hover:text-primary/80 font-medium transition-colors underline-offset-4 hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}