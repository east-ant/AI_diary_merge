"use client"

import { useGoogleAuth } from "@/hooks/use-google-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Dashboard() {
  const { user, signOut, loading } = useGoogleAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    signOut()
    router.push("/")
  }

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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.picture || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">AI Diary Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user.name}!</p>
              <p className="text-sm text-muted-foreground/80">{user.email}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Sign out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/30 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Upload Photos</CardTitle>
              <CardDescription>Add new photos to generate journal entries</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => router.push('/diary')}
                >
                  Upload Photos
              </Button>

            </CardContent>
          </Card>

          <Card className="border-border/30 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Entries</CardTitle>
              <CardDescription>View your latest AI-generated journal entries</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent border-border/50 hover:bg-accent/50">
                View Entries
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/30 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Settings</CardTitle>
              <CardDescription>Customize your AI Diary experience</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent border-border/50 hover:bg-accent/50">
                Open Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 border-border/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">User Information</CardTitle>
            <CardDescription>Your Google account details (for development)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="font-medium text-foreground">Name:</span>
              <span className="ml-2 text-muted-foreground">{user.name}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-foreground">Email:</span>
              <span className="ml-2 text-muted-foreground">{user.email}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-foreground">User ID:</span>
              <span className="ml-2 text-muted-foreground font-mono">{user.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
