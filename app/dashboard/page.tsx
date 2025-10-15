// app/dashboard/page.tsx
"use client"

import { useGoogleAuth } from "@/hooks/use-google-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Dashboard() {
  //  Google 인증 훅 (사용자 정보, 로딩 상태, 로그아웃 함수)
  const { user, signOut, loading } = useGoogleAuth()

  //  Next.js 라우터 훅
  const router = useRouter()

  //  로그인되지 않은 사용자는 홈("/")으로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  //  로그아웃 핸들러
  const handleLogout = async () => {
    signOut()
    router.push("/")
  }

  //  로딩 중일 때 로딩 화면 표시
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

  //  유저 정보가 없으면 아무것도 렌더링하지 않음
  if (!user) {
    return null
  }

  //  대시보드 메인 UI
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/*  상단 프로필 및 로그아웃 버튼 */}
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
              <p className="text-muted-foreground">
                Welcome back, {decodeURIComponent(user.name || '')}!
              </p>
              <p className="text-sm text-muted-foreground/80">{user.email}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Sign out
          </Button>
        </div>

        {/*  주요 기능 카드 영역 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 다이어리 가는 버튼 */}
          <Card className="border-border/30 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Upload Photos</CardTitle>
              <CardDescription>사진 업로드로 일기 생성하기</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-11"
                  onClick={() => router.push('/diary')}
                >
                  Upload Photos
                  
              </Button>
            </CardContent>
          </Card>

          {/* 최근 다이어리 보기 */}
          <Card className="border-border/30 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Entries</CardTitle>
              <CardDescription>최근 생성된 AI 일기 보기</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent border-border/50 hover:bg-accent/50">
                View Entries
              </Button>
            </CardContent>
          </Card>

          {/* 설정 */}
          <Card className="border-border/30 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Settings</CardTitle>
              <CardDescription>AI 일기 설정 변경</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent border-border/50 hover:bg-accent/50">
                Open Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/*  사용자 정보 (개발용 디버깅 섹션) */}
        <Card className="mt-8 border-border/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">User Information</CardTitle>
            <CardDescription>Google 계정 정보 (개발용)</CardDescription>
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
