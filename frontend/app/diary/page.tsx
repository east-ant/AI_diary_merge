"use client"

import { useState, useEffect } from "react"
import { Plus, Sun, Sunset, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PhotoUploadModal } from "@/components/diary/photo-upload-modal"
import { DiaryPreview } from "@/components/diary/diary-preview"
import { Sidebar } from "@/components/diary/sidebar"

interface ExifData {
  timestamp?: Date
  location?: {
    latitude: number
    longitude: number
    locationName?: string
  }
  camera?: {
    make?: string
    model?: string
    settings?: string
  }
}

interface PhotoSlot {
  id: string
  photo?: string
  keywords: string[]
  timeSlot: "morning" | "midday" | "afternoon" | "evening"
  timestamp: number
  exifData?: ExifData
  imageId?: string // ✅ DB에 저장된 이미지 ID
}

interface Diary {
  id: string
  title: string
  date: string
  photoSlots: PhotoSlot[]
  createdAt: number
}

const DIARIES_STORAGE_KEY = "travel-diaries"

export default function TravelDiary() {
  const [user, setUser] = useState<{ username: string; email: string } | null>(null)
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [currentDiaryId, setCurrentDiaryId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showNewDiaryDialog, setShowNewDiaryDialog] = useState(false)
  const [newDiaryTitle, setNewDiaryTitle] = useState("")
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [showPreview, setShowPreview] = useState(false)

  // ✅ 로그인된 사용자 로드
  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) {
      const parsed = JSON.parse(stored)
      setUser({
        username: parsed.email.split("@")[0],
        email: parsed.email,
      })
    }
  }, [])

  // ✅ DB에서 다이어리 목록 불러오기
  useEffect(() => {
    if (!user?.email) return

    const fetchDiaries = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/diaries/list/${user.email}`)
        if (!response.ok) return

        const data = await response.json()
        console.log("✅ DB 다이어리:", data)

        const formatted = data.map((d: any) => ({
          id: d._id,
          title: d.title,
          date: d.date,
          photoSlots: d.photoSlots || [],
          createdAt: new Date(d.createdAt).getTime(),
        }))

        setDiaries(formatted)

        if (formatted.length > 0 && !currentDiaryId) {
          setCurrentDiaryId(formatted[0].id)
          setPhotoSlots(formatted[0].photoSlots)
        }
      } catch (err) {
        console.error("❌ 다이어리 불러오기 실패:", err)
      }
    }

    fetchDiaries()
  }, [user])

  // ✅ localStorage 백업
  useEffect(() => {
    localStorage.setItem(DIARIES_STORAGE_KEY, JSON.stringify(diaries))
  }, [diaries])

  // ✅ 새 다이어리 생성 (photoSlots의 imageId를 서버로 전송)
  const createNewDiary = () => {
    setShowNewDiaryDialog(true)
    setNewDiaryTitle(`여행 일기 ${new Date().toLocaleDateString()}`)
  }

  const confirmCreateDiary = async () => {
    if (!user?.email) {
      alert("로그인이 필요합니다.")
      return
    }

    const title = newDiaryTitle.trim() || `여행 일기 ${new Date().toLocaleDateString()}`

    // ✅ photoSlots에서 imageId만 추출
    const photoSlotIds = photoSlots
      .filter(slot => slot.imageId)
      .map(slot => slot.imageId)

    console.log("📤 전송할 이미지 IDs:", photoSlotIds)

    try {
      const response = await fetch("http://localhost:3001/api/diaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.email,
          title,
          date: new Date().toLocaleDateString(),
          photoSlotIds, // ✅ 이미지 ID 배열 전송
        }),
      })

      if (!response.ok) throw new Error("다이어리 생성 실패")

      const result = await response.json()
      console.log("✅ 다이어리 생성:", result)

      const newDiary: Diary = {
        id: result.diary._id,
        title: result.diary.title,
        date: result.diary.date,
        photoSlots: result.diary.photoSlots || [],
        createdAt: Date.now(),
      }

      setDiaries(prev => [newDiary, ...prev])
      setCurrentDiaryId(newDiary.id)
      setPhotoSlots([])
      setShowNewDiaryDialog(false)

      alert("✅ 다이어리가 생성되었습니다!")
    } catch (error) {
      console.error("❌ 다이어리 생성 오류:", error)
      alert("다이어리 생성에 실패했습니다.")
    }
  }

  const selectDiary = (id: string) => {
    const found = diaries.find(d => d.id === id)
    if (found) {
      setCurrentDiaryId(found.id)
      setPhotoSlots(found.photoSlots)
      setShowPreview(false)
      setCurrentStep(1)
    }
  }

  const deleteDiary = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`http://localhost:3001/api/diaries/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("삭제 실패")

      const updated = diaries.filter(d => d.id !== id)
      setDiaries(updated)

      if (currentDiaryId === id && updated.length > 0) {
        setCurrentDiaryId(updated[0].id)
        setPhotoSlots(updated[0].photoSlots)
      }

      alert("✅ 다이어리가 삭제되었습니다!")
    } catch (error) {
      console.error("❌ 삭제 오류:", error)
      alert("삭제에 실패했습니다.")
    }
  }

  // ✅ 사진 추가
  const addPhotoSlot = () => {
    const newSlot: PhotoSlot = {
      id: Date.now().toString(),
      keywords: [],
      timeSlot: "evening",
      timestamp: Date.now(),
    }
    setPhotoSlots(prev => [...prev, newSlot])
  }

  // ✅ 사진 업로드 완료 시 DB에 저장하고 imageId 받아오기
  const updatePhotoSlot = async (id: string, photo: string, keywords: string[], exifData?: ExifData) => {
    if (!user?.email) return

    try {
      // ✅ 1. base64를 Blob으로 변환
      const base64Response = await fetch(photo)
      const blob = await base64Response.blob()

      // ✅ 2. FormData 생성
      const formData = new FormData()
      formData.append("image", blob, `photo-${Date.now()}.jpg`)
      formData.append("userId", user.email)
      formData.append("keywords", JSON.stringify(keywords))
      formData.append("tempSlotId", id)

      // ✅ 3. 서버로 업로드
      const response = await fetch("http://localhost:3001/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("업로드 실패")

      const result = await response.json()
      console.log("✅ 이미지 업로드 완료:", result)

      // ✅ 4. photoSlots 업데이트 (imageId 포함)
      setPhotoSlots(prev =>
        prev.map(slot =>
          slot.id === id
            ? {
                ...slot,
                photo: `http://localhost:3001${result.imageUrl}`,
                keywords,
                exifData,
                imageId: result.imageId, // ✅ DB에 저장된 이미지 ID
                timestamp: exifData?.timestamp?.getTime() || Date.now(),
              }
            : slot
        )
      )

      alert("✅ 사진이 저장되었습니다!")
    } catch (error) {
      console.error("❌ 사진 업로드 오류:", error)
      alert("사진 업로드에 실패했습니다.")
    }
  }

  const clearPhoto = (id: string) => {
    setPhotoSlots(prev => prev.map(slot => (slot.id === id ? { ...slot, photo: undefined, keywords: [] } : slot)))
  }

  // ✅ 검토 단계
  const canProceedToReview = () => photoSlots.some(slot => slot.photo)
  const handleNextStep = () => {
    if (canProceedToReview()) {
      setCurrentStep(2)
      setShowPreview(true)
    }
  }

  const diaryList = diaries.map(d => ({
    id: d.id,
    title: d.title,
    date: d.date,
    photoCount: d.photoSlots.filter(s => s.photo).length,
  }))

  return (
    <div className="min-h-screen h-screen bg-background flex overflow-hidden">
      <Sidebar
        diaries={diaryList}
        currentDiaryId={currentDiaryId}
        onSelectDiary={selectDiary}
        onNewDiary={createNewDiary}
        onDeleteDiary={deleteDiary}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNavigateToDashboard={() => (window.location.href = "/")}
      />

      <div className={`flex-1 flex flex-col transition-all ${sidebarOpen ? "ml-80" : "ml-16"}`}>
        {/* 상단 헤더 */}
        <div className="border-b border-border bg-card flex-shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-bold mb-4">{diaries.find(d => d.id === currentDiaryId)?.title || "여행 일기"}</h1>
            <div className="flex gap-4 items-center">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex items-center gap-2">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${currentStep >= n ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{n}</div>
                  <span className={`${currentStep >= n ? "text-foreground" : "text-muted-foreground"} text-sm`}>
                    {n === 1 ? "타임라인" : n === 2 ? "검토" : "생성"}
                  </span>
                  {n < 3 && <div className="w-8 h-[2px] bg-border" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">
          {showPreview ? (
            <DiaryPreview
              photoSlots={photoSlots.filter(p => p.photo)}
              diaryTitle={diaries.find(d => d.id === currentDiaryId)?.title || ""}
              onBack={() => {
                setCurrentStep(1)
                setShowPreview(false)
              }}
            />
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-8">
              {photoSlots.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">아직 사진이 없습니다.</p>
                  <Button onClick={addPhotoSlot}>
                    <Plus className="w-4 h-4 mr-2" /> 첫 사진 추가하기
                  </Button>
                </div>
              ) : (
                <>
                  {photoSlots.map(slot => (
                    <Card key={slot.id} className="p-4 mb-4">
                      {slot.photo ? (
                        <div className="relative">
                          <img src={slot.photo} alt="uploaded" className="rounded-lg object-cover w-full" />
                          {slot.imageId && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              ✓ 저장됨
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedSlot(slot.id)}
                          className="w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-2 hover:border-primary/60 transition"
                        >
                          <Plus className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">사진 추가</span>
                        </button>
                      )}
                    </Card>
                  ))}

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={addPhotoSlot}>
                      <Plus className="w-4 h-4 mr-2" /> 사진 더 추가하기
                    </Button>
                    <Button onClick={handleNextStep} disabled={!canProceedToReview()}>
                      검토 및 생성
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 새 다이어리 모달 */}
        {showNewDiaryDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">새 일기 만들기</h3>
              <input
                type="text"
                value={newDiaryTitle}
                onChange={e => setNewDiaryTitle(e.target.value)}
                className="w-full border border-border rounded-md p-2 mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewDiaryDialog(false)}>
                  취소
                </Button>
                <Button onClick={confirmCreateDiary}>만들기</Button>
              </div>
            </div>
          </div>
        )}

        {/* 업로드 모달 */}
        {selectedSlot && (
          <PhotoUploadModal
            isOpen={!!selectedSlot}
            onClose={() => setSelectedSlot(null)}
            onSave={(photo, keywords, exifData) => {
              updatePhotoSlot(selectedSlot, photo, keywords, exifData)
              setSelectedSlot(null)
            }}
          />
        )}
      </div>
    </div>
  )
}