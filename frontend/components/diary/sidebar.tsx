//components/diary/sidebar.tsx

"use client"
import { Plus, Calendar, User, BookOpen, ChevronDown, ChevronRight, Plane, PanelLeft, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { useGoogleAuth } from "@/hooks/use-google-auth"
import { useRouter } from "next/navigation"

interface Diary {
  id: string
  title: string
  date: string
  photoCount: number
}

interface SidebarProps {
  diaries: Diary[]
  currentDiaryId: string | null
  onSelectDiary: (diaryId: string) => void | Promise<void>  // ✅ async 함수 허용
  onNewDiary: () => void
  onDeleteDiary: (diaryId: string) => void | Promise<void>  // ✅ async 함수 허용
  isOpen: boolean
  onToggle: () => void
  onNavigateToDashboard: () => void
}

export function Sidebar({ diaries, currentDiaryId, onSelectDiary, onNewDiary, onDeleteDiary, isOpen, onToggle, onNavigateToDashboard  }: SidebarProps) {
  const [diariesExpanded, setDiariesExpanded] = useState(true)
  const { user, signOut } = useGoogleAuth()
  const router = useRouter()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)  // ✅ 삭제 로딩 상태 추가

  // ✅ localStorage에서 사용자 정보 가져오기
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const userId = localStorage.getItem("userId")
    if (userId) {
      setUserEmail(userId)
      // @ 앞 부분을 사용자 이름으로 설정
      setUserName(userId.split("@")[0])
    }
  }, [])

  // 다이어리 삭제 확인 모달 표시
  const handleDeleteClick = (e: React.MouseEvent, diaryId: string) => {
    e.stopPropagation()
    setDeleteConfirmId(diaryId)
  }

  // ✅ 삭제 확인 후 처리 - async 처리
  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        setIsDeleting(true)
        await onDeleteDiary(deleteConfirmId)
        setDeleteConfirmId(null)
      } catch (error) {
        console.error('Failed to delete diary:', error)
        // 에러 처리 (토스트 메시지 등 추가 가능)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmId(null)
  }

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem("userId")
    localStorage.removeItem("userInfo")
    localStorage.removeItem("googleUser")
    router.push("/")
  }
  
  
  return (
    <>
      {/* 사이드바 메인 컨테이너 - isOpen에 따라 너비 조절 (80 or 16) */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-sidebar border-r border-border z-40
          transition-all duration-300 ease-in-out flex flex-col overflow-hidden
          ${isOpen ? "w-80" : "w-16"}
        `}
      >
        {/* 헤더: 로고 및 토글 버튼 */}
          <div className="p-4 border-b border-border flex-shrink-0">
            {isOpen ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  
                  <div 
                    className="cursor-pointer" 
                    onClick={onNavigateToDashboard}
                  >
                    <h1 className="text-xl font-bold text-foreground">Trable Diary</h1>
                  </div>
                </div>
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="hover:bg-accent transition-all flex-shrink-0"
                >
                  <PanelLeft className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" onClick={onToggle} className="w-full hover:bg-accent transition-all">
                <PanelLeft className="w-5 h-5 rotate-180" />
              </Button>
            )}
          </div>

        {/* 사용자 프로필 섹션 */}
        {isOpen ? (
          <div className="p-4 border-b border-border flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-3 w-full hover:bg-accent/50 p-2 rounded-lg transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer">
                    <Avatar className="h-full w-full">
                      <AvatarImage src={user?.picture || "/placeholder.svg"} alt={userName || "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {userName?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-medium text-foreground text-sm truncate">
                      {userName || 'Travel Explorer'}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {userEmail || "사용자 이메일 없음"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userName || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="p-4 border-b border-border flex-shrink-0 flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={user?.picture || "/placeholder.svg"} alt={userName || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userName?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userName || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* 새 다이어리 생성 버튼 */}
        <div className="p-4 flex-shrink-0">
          {isOpen ? (
            <Button
              onClick={onNewDiary}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-11 cursor-pointer"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Diary
            </Button>
          ) : (
            <Button
              onClick={onNewDiary}
              size="icon"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-10 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* 다이어리 목록 섹션 */}
        {isOpen ? (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <button
              onClick={() => setDiariesExpanded(!diariesExpanded)}
              className="flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors flex-shrink-0"
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Your Diaries</h4>
              </div>
              {diariesExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {diariesExpanded && (
              <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4">
                <div className="space-y-2">
                  {diaries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No diaries yet</p>
                      <p className="text-xs mt-1">Create your first travel diary!</p>
                    </div>
                  ) : (
                    diaries.map((diary) => (
                      <Card
                        key={diary.id}
                        onClick={() => onSelectDiary(diary.id)}
                        className={`
                          p-3 cursor-pointer transition-all hover:shadow-md group relative 
                          ${
                            currentDiaryId === diary.id
                              ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20"
                              : "bg-card hover:bg-accent border-border"
                          }
                        `}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-foreground text-sm mb-1 truncate">{diary.title}</h5>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{diary.date}</span>
                              </div>
                              <span className="font-medium">{diary.photoCount} photos</span>
                            </div>
                          </div>
                        </div>
                        {/* 다이어리 삭제 버튼 (hover 시 표시) */}
                        <button
                          onClick={(e) => handleDeleteClick(e, diary.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                          aria-label="Delete diary"
                        >
                          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center py-4 space-y-4">
            <Button variant="ghost" size="icon" className="w-10 h-10 hover:bg-accent">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        )}

        {/* 푸터: 버전 정보 */}
        {isOpen && (
          <div className="p-4 border-t border-border bg-sidebar-accent flex-shrink-0">
            <p className="text-xs text-muted-foreground text-center font-medium">Travel Diary v1.0</p>
          </div>
        )}

        {!isOpen && (
          <div className="p-4 border-t border-border flex-shrink-0 flex justify-center">
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-accent">
              <User className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        )}
      </aside>

      {/* 삭제 확인 모달 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Diary</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete this diary? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
                disabled={isDeleting}  // ✅ 삭제 중일 때 버튼 비활성화
              >
                No
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={isDeleting}  // ✅ 삭제 중일 때 버튼 비활성화
                className="bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Yes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}