"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Sun, Sunset, Moon, Edit2, Trash2, FileText, Clock, MapPin, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PhotoUploadModal } from "@/components/diary/photo-upload-modal"
import { DiaryPreview } from "@/components/diary/diary-preview"
import { Sidebar } from "@/components/diary/sidebar"
import { CompletedDiaryViewer } from "@/components/diary/completed-diary-viewer"
import { getUserId, getDiaries, createDiary, type Diary as ApiDiary } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface ExifData {
  timestamp?: Date | string
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
  imageData?: string
  mimeType?: string
  keywords: string[]
  timeSlot: "morning" | "midday" | "afternoon" | "evening"
  timestamp: number
  exifData?: ExifData
}

interface Diary {
  id: string
  title: string
  date: string
  photoSlots: PhotoSlot[]
  createdAt: number
  isCompleted?: boolean
}

function getTimestamp(exifTimestamp: Date | string | undefined, fallbackTimestamp: number): number {
  if (!exifTimestamp) {
    return fallbackTimestamp
  }

  if (exifTimestamp instanceof Date) {
    return exifTimestamp.getTime()
  }

  try {
    const date = new Date(exifTimestamp)
    if (isNaN(date.getTime())) {
      return fallbackTimestamp
    }
    return date.getTime()
  } catch {
    return fallbackTimestamp
  }
}

function safeGetDate(timestamp: Date | string | undefined): Date | null {
  if (!timestamp) return null
  
  if (timestamp instanceof Date) {
    return timestamp
  }
  
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}

export default function TravelDiary() {
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [currentDiaryId, setCurrentDiaryId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showNewDiaryDialog, setShowNewDiaryDialog] = useState(false)
  const [newDiaryTitle, setNewDiaryTitle] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [showCompletedViewer, setShowCompletedViewer] = useState(false)

  const { toast } = useToast()
  const router = useRouter()

  const loadDiaries = useCallback(async () => {
    setIsLoading(true)
    const userId = getUserId()
    
    if (!userId) {
      router.push("/login")
      setIsLoading(false)
      return
    }

    try {
      const response = await getDiaries(userId)
      
      if (response.success && response.data) {
        const loadedDiaries: Diary[] = response.data.map((diary: ApiDiary) => ({
          id: diary._id || diary.id || "",
          title: diary.title,
          date: diary.date,
          photoSlots: diary.photoSlots.map((slot: any) => {
            const exifData = slot.exifData ? {
              ...slot.exifData,
              timestamp: slot.exifData.timestamp ? new Date(slot.exifData.timestamp) : undefined,
            } : undefined

            return {
              ...slot,
              imageData: slot.imageData,
              mimeType: slot.mimeType,
              exifData,
            }
          }),
          createdAt: typeof diary.createdAt === 'number' ? diary.createdAt : new Date(diary.createdAt).getTime(),
          isCompleted: diary.isCompleted || false,
        }))

        setDiaries(loadedDiaries)

        if (loadedDiaries.length > 0) {
          const firstDiary = loadedDiaries[0]
          setCurrentDiaryId(firstDiary.id)
          setPhotoSlots(firstDiary.photoSlots)
        } else {
          createNewDiaryLocal()
        }
      } else {
        toast({
          title: "불러오기 실패",
          description: response.error || "다이어리를 불러올 수 없습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "다이어리를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, router])

  useEffect(() => {
    const userId = getUserId()
    if (!userId) {
      router.push("/login")
      return
    }

    loadDiaries()
  }, [router, loadDiaries])

  const createNewDiaryLocal = () => {
    const newDiary: Diary = {
      id: `temp-${Date.now()}`,
      title: `여행 일기 ${new Date().toLocaleDateString()}`,
      date: new Date().toLocaleDateString(),
      photoSlots: [],
      createdAt: Date.now(),
    }

    setDiaries((prev) => [newDiary, ...prev])
    setCurrentDiaryId(newDiary.id)
    setPhotoSlots([])
    setCurrentStep(1)
    setShowPreview(false)
    setShowCompletedViewer(false)
  }

  const createNewDiary = () => {
    setShowNewDiaryDialog(true)
    setNewDiaryTitle(`여행 일기 ${new Date().toLocaleDateString()}`)
  }

  const confirmCreateDiary = () => {
    const title = newDiaryTitle.trim() || `여행 일기 ${new Date().toLocaleDateString()}`

    const newDiary: Diary = {
      id: `temp-${Date.now()}`,
      title: title,
      date: new Date().toLocaleDateString(),
      photoSlots: [],
      createdAt: Date.now(),
    }

    setDiaries((prev) => [newDiary, ...prev])
    setCurrentDiaryId(newDiary.id)
    setPhotoSlots([])
    setCurrentStep(1)
    setShowPreview(false)
    setShowCompletedViewer(false)
    setSidebarOpen(false)

    setShowNewDiaryDialog(false)
    setNewDiaryTitle("")
  }

  const cancelCreateDiary = () => {
    setShowNewDiaryDialog(false)
    setNewDiaryTitle("")
  }

  const selectDiary = async (diaryId: string, forceShowPrintable?: boolean) => {
    try {
      console.log("🔍 selectDiary 호출:", diaryId, "완료 여부:", forceShowPrintable)
      
      if (forceShowPrintable) {
        setCurrentDiaryId(diaryId)
        setShowCompletedViewer(true)
        setShowPreview(false)
        setCurrentStep(1)
        setSidebarOpen(false)
        return
      }

      const response = await fetch(`http://localhost:3001/api/diaries/${diaryId}/detail`)
      const data = await response.json()
      
      console.log("📥 API 응답:", data)
      
      if (data.success && data.data) {
        const photoSlots = data.data.photoSlots.map((slot: any) => ({
          ...slot,
          imageData: slot.imageData,
          mimeType: slot.mimeType,
          exifData: slot.exifData ? {
            ...slot.exifData,
            timestamp: slot.exifData.timestamp ? new Date(slot.exifData.timestamp) : undefined,
          } : undefined,
        }))
        
        console.log("✅ photoSlots 설정:", photoSlots)
        
        setCurrentDiaryId(diaryId)
        setPhotoSlots(photoSlots)
        setCurrentStep(1)
        setShowPreview(false)
        setShowCompletedViewer(false)
        setSidebarOpen(false)
      } else {
        const diary = diaries.find((d) => d.id === diaryId)
        if (diary) {
          console.log("⚠️ API 실패, 로컬 데이터 사용")
          setCurrentDiaryId(diaryId)
          setPhotoSlots(diary.photoSlots)
          setCurrentStep(1)
          setShowPreview(false)
          setShowCompletedViewer(false)
          setSidebarOpen(false)
        }
      }
    } catch (error) {
      console.error("❌ selectDiary 에러:", error)
      
      const diary = diaries.find((d) => d.id === diaryId)
      if (diary) {
        console.log("⚠️ 에러 발생, 로컬 데이터 사용")
        setCurrentDiaryId(diaryId)
        setPhotoSlots(diary.photoSlots)
        setCurrentStep(1)
        setShowPreview(false)
        setShowCompletedViewer(false)
        setSidebarOpen(false)
      }
    }
  }

  const handleBackFromViewer = () => {
    setShowCompletedViewer(false)
    setCurrentStep(1)
  }

  const handleCompleteFromPreview = async () => {
    setShowPreview(false)
    setShowCompletedViewer(true)
    setCurrentStep(3)

    // 다이어리 목록 다시 로드하여 완료 상태 반영
    await loadDiaries()
  }

  const getCurrentDiaryTitle = () => {
    const diary = diaries.find((d) => d.id === currentDiaryId)
    return diary?.title || "Travel Diary"
  }

  const sortPhotosByTime = (slots: PhotoSlot[]): PhotoSlot[] => {
    return [...slots].sort((a, b) => {
      const timeA = getTimestamp(a.exifData?.timestamp, a.timestamp)
      const timeB = getTimestamp(b.exifData?.timestamp, b.timestamp)
      return timeA - timeB
    })
  }

  const addPhotoSlot = () => {
    const newSlot: PhotoSlot = {
      id: `temp-slot-${Date.now()}`,
      keywords: [],
      timeSlot: "evening",
      timestamp: Date.now(),
    }
    setPhotoSlots([...photoSlots, newSlot])
  }

  const updatePhotoSlot = (slotId: string, photo: string, keywords: string[], exifData?: ExifData, imageId?: string) => {
    setPhotoSlots((slots) => {
      const updatedSlots = slots.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              id: imageId || slot.id,
              photo,
              keywords,
              exifData,
              timestamp: getTimestamp(exifData?.timestamp, Date.now()),
            }
          : slot,
      )
      return sortPhotosByTime(updatedSlots)
    })
  }

  const deletePhotoSlot = (slotId: string) => {
    if (photoSlots.length > 1) {
      setPhotoSlots((slots) => slots.filter((slot) => slot.id !== slotId))
    }
  }

  const clearPhoto = (slotId: string) => {
    setPhotoSlots((slots) =>
      slots.map((slot) =>
        slot.id === slotId ? { ...slot, photo: undefined, keywords: [], exifData: undefined } : slot,
      ),
    )
  }

  const formatPhotoTime = (slot: PhotoSlot): string | null => {
    if (!slot.photo && !slot.imageData) {
      return null
    }

    const date = safeGetDate(slot.exifData?.timestamp)
    if (!date) {
      return null
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getLocationDisplay = (slot: PhotoSlot): string | null => {
    if (slot.exifData?.location) {
      return (
        slot.exifData.location.locationName ||
        `${slot.exifData.location.latitude.toFixed(4)}°, ${slot.exifData.location.longitude.toFixed(4)}°`
      )
    }
    return null
  }

  const getCompletedPhotos = () => {
    return photoSlots.filter((slot) => (slot.photo || slot.imageData) && slot.keywords.length > 0)
  }

  const canProceedToReview = () => {
    return getCompletedPhotos().length > 0
  }

  const handleNextStep = async () => {
    if (currentStep !== 1 || !canProceedToReview()) {
      return
    }

    const userId = getUserId()
    
    if (!userId) {
      toast({
        title: "로그인 필요",
        description: "다이어리를 저장하려면 로그인이 필요합니다.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const uploadedSlots = photoSlots.filter(slot => {
        const hasPhoto = !!slot.photo || !!slot.imageData
        const hasValidId = slot.id && !slot.id.startsWith('temp')
        return hasPhoto && hasValidId
      })

      if (uploadedSlots.length === 0) {
        toast({
          title: "저장 실패",
          description: "백엔드에 업로드된 사진이 없습니다. 사진을 다시 업로드해주세요.",
          variant: "destructive",
        })
        setIsSaving(false)
        return
      }

      const photoSlotIds = uploadedSlots.map(slot => slot.id)

      const response = await createDiary({
        userId,
        title: getCurrentDiaryTitle(),
        date: new Date().toLocaleDateString(),
        photoSlotIds,
      })

      if (response.success && response.data) {
        const savedDiary: Diary = {
          id: response.data._id || response.data.id || "",
          title: response.data.title,
          date: response.data.date,
          photoSlots: response.data.photoSlots || [],
          createdAt: typeof response.data.createdAt === 'number' 
            ? response.data.createdAt 
            : new Date(response.data.createdAt).getTime(),
        }

        setDiaries(prev => {
          const filtered = prev.filter(d => d.id !== currentDiaryId)
          return [savedDiary, ...filtered]
        })
        setCurrentDiaryId(savedDiary.id)
        setPhotoSlots(savedDiary.photoSlots)

        toast({
          title: "저장 완료",
          description: "다이어리가 성공적으로 저장되었습니다!",
        })

        setCurrentStep(2)
        setShowPreview(true)
      } else {
        toast({
          title: "저장 실패",
          description: response.error || "다이어리 저장에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "저장 오류",
        description: "다이어리 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleDeleteDiary = async (diaryId: string) => {
    if (diaryId.startsWith('temp-')) {
      setDiaries(prev => prev.filter(d => d.id !== diaryId))
      
      if (currentDiaryId === diaryId) {
        const remaining = diaries.filter(d => d.id !== diaryId)
        if (remaining.length > 0) {
          setCurrentDiaryId(remaining[0].id)
          setPhotoSlots(remaining[0].photoSlots)
        } else {
          createNewDiaryLocal()
        }
      }
      return
    }

    try {
      console.log("🗑️ 삭제 요청 시작:", diaryId)
      
      const response = await fetch(`http://localhost:3001/api/diaries/${diaryId}`, {
        method: 'DELETE',
      })

      console.log("📨 응답 상태:", response.status)
      
      const data = await response.json()

      console.log("📨 응답 데이터:", data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete diary')
      }

      console.log('✅ 삭제 완료:', data.message)
      console.log('🖼️ 삭제된 이미지 개수:', data.deletedImages)
      console.log('🤖 삭제된 AI 다이어리:', data.deletedAIDiaries)

      setDiaries(prev => prev.filter(d => d.id !== diaryId))
      
      if (currentDiaryId === diaryId) {
        const remaining = diaries.filter(d => d.id !== diaryId)
        if (remaining.length > 0) {
          setCurrentDiaryId(remaining[0].id)
          setPhotoSlots(remaining[0].photoSlots)
        } else {
          createNewDiaryLocal()
        }
      }

      toast({
        title: "삭제 완료",
        description: `다이어리와 ${data.deletedImages}개의 이미지가 삭제되었습니다.`,
      })
    } catch (error) {
      console.error('❌ 삭제 오류:', error)
      toast({
        title: "오류",
        description: error instanceof Error 
          ? error.message 
          : "다이어리 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const sortedPhotoSlots = sortPhotosByTime(photoSlots)

  const diaryList = diaries.map((diary) => ({
    id: diary.id,
    title: diary.title,
    date: diary.date,
    photoCount: diary.photoSlots.filter((slot) => slot.photo || slot.imageData).length,
    isCompleted: diary.isCompleted || false,
  }))

  const getTimeEmoji = (slot: PhotoSlot) => {
    if (!slot.photo && !slot.imageData) {
      return null
    }

    const date = safeGetDate(slot.exifData?.timestamp)
    if (!date) {
      return null
    }

    const hour = date.getHours()

    if (hour >= 5 && hour < 12) {
      return Sun
    } else if (hour >= 12 && hour < 17) {
      return Sun
    } else if (hour >= 17 && hour < 20) {
      return Sunset
    } else {
      return Moon
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">다이어리를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen h-screen bg-background flex overflow-hidden">
      <Sidebar
        diaries={diaryList}
        currentDiaryId={currentDiaryId}
        onSelectDiary={selectDiary}
        onNewDiary={createNewDiary}
        onDeleteDiary={handleDeleteDiary}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNavigateToDashboard={() => router.push("/")}
      />

      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          sidebarOpen ? "ml-80" : "ml-16"
        }`}
      >
        {showCompletedViewer && currentDiaryId ? (
          <CompletedDiaryViewer
            diaryId={currentDiaryId}
            onBack={handleBackFromViewer}
          />
        ) : (
          <>
            <div className="border-b border-border bg-card flex-shrink-0">
              <div className="max-w-4xl mx-auto px-6 py-6 lg:px-6">
                <h1 className="text-2xl font-bold text-foreground mb-6 ml-12 lg:ml-12">{getCurrentDiaryTitle()}</h1>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      1
                    </div>
                    <span className={`text-sm ${currentStep >= 1 ? "text-foreground" : "text-muted-foreground"}`}>
                      타임라인
                    </span>
                  </div>

                  <div className="w-12 h-px bg-border"></div>

                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      2
                    </div>
                    <span className={`text-sm ${currentStep >= 2 ? "text-foreground" : "text-muted-foreground"}`}>
                      검토
                    </span>
                  </div>

                  <div className="w-12 h-px bg-border"></div>

                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      3
                    </div>
                    <span className={`text-sm ${currentStep >= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                      생성
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-muted-foreground">
                    {getCompletedPhotos().length} / {photoSlots.length} 사진 완료
                  </div>
                  <div className="flex space-x-3">
                    {currentStep === 2 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentStep(1)
                          setShowPreview(false)
                        }}
                      >
                        타임라인으로 돌아가기
                      </Button>
                    )}
                    {currentStep === 1 && (
                      <Button
                        onClick={handleNextStep}
                        disabled={!canProceedToReview() || isSaving}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {isSaving ? "저장 중..." : "검토 및 생성"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {showPreview ? (
                <DiaryPreview
                  photoSlots={getCompletedPhotos()}
                  diaryTitle={getCurrentDiaryTitle()}
                  onBack={() => {
                    setCurrentStep(1)
                    setShowPreview(false)
                  }}
                  diaryId={currentDiaryId || ""}
                  userId={getUserId() || ""}
                  onComplete={handleCompleteFromPreview}
                />
              ) : (
                <div className="max-w-4xl mx-auto px-6 py-8">
                  <div className="relative">
                    <div className="absolute left-8 top-0 bottom-0 w-px timeline-connector"></div>

                    <div className="space-y-8">
                      {sortedPhotoSlots.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground mb-4">아직 추가된 사진이 없습니다.</p>
                          <Button onClick={addPhotoSlot} className="bg-primary hover:bg-primary/90">
                            <Plus className="w-4 h-4 mr-2" />
                            첫 번째 사진 추가하기
                          </Button>
                        </div>
                      ) : (
                        sortedPhotoSlots.map((slot) => {
                          const TimeIcon = getTimeEmoji(slot)
                          const photoTime = formatPhotoTime(slot)
                          const location = getLocationDisplay(slot)

                          return (
                            <div key={slot.id} className="relative flex items-start space-x-6">
                              <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-secondary border-2 border-border flex items-center justify-center">
                                  {TimeIcon ? <TimeIcon className="w-6 h-6 text-primary" /> : <div className="w-6 h-6" />}
                                </div>
                                {photoTime && (
                                  <span className="text-xs text-muted-foreground mt-2 font-medium text-center">
                                    {photoTime}
                                    {location && (
                                      <div className="flex items-center justify-center mt-1 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        <span className="truncate max-w-20" title={location}>
                                          {location.length > 15 ? `${location.substring(0, 15)}...` : location}
                                        </span>
                                      </div>
                                    )}
                                  </span>
                                )}
                              </div>

                              <Card className="flex-1 p-6 bg-card border-border hover:border-primary/50 transition-colors">
                                {slot.photo || slot.imageData ? (
                                  <div>
                                    <div className="relative group">
                                      <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                                        <img
                                          src={
                                            slot.imageData && slot.mimeType
                                              ? `data:${slot.mimeType};base64,${slot.imageData}`
                                              : slot.photo || "/placeholder.svg"
                                          }
                                          alt="Travel photo"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>

                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                        <Button 
                                          size="sm" 
                                          variant="secondary" 
                                          onClick={() => setSelectedSlot(slot.id)}
                                          aria-label="사진 수정"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="destructive" 
                                          onClick={() => clearPhoto(slot.id)}
                                          aria-label="사진 삭제"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      {slot.exifData && (
                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                          {slot.exifData.timestamp && (
                                            <div className="flex items-center space-x-1">
                                              <Clock className="w-3 h-3" />
                                              <span>{safeGetDate(slot.exifData.timestamp)?.toLocaleString() || ''}</span>
                                            </div>
                                          )}
                                          {slot.exifData.location && (
                                            <div className="flex items-center space-x-1">
                                              <MapPin className="w-3 h-3" />
                                              <span>{location}</span>
                                            </div>
                                          )}
                                          {slot.exifData.camera?.make && slot.exifData.camera?.model && (
                                            <div className="flex items-center space-x-1">
                                              <Camera className="w-3 h-3" />
                                              <span>
                                                {slot.exifData.camera.make} {slot.exifData.camera.model}
                                                {slot.exifData.camera.settings && ` • ${slot.exifData.camera.settings}`}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {slot.keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {slot.keywords.map((keyword, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md"
                                            >
                                              #{keyword}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => setSelectedSlot(slot.id)}
                                      className="flex-1 aspect-video bg-muted rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center space-y-2 group mr-4"
                                      aria-label="사진 추가"
                                    >
                                      <div className="w-12 h-12 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                                        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                      </div>
                                      <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                                        사진 추가
                                      </span>
                                    </button>

                                    {photoSlots.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deletePhotoSlot(slot.id)}
                                        className="text-muted-foreground hover:text-destructive"
                                        aria-label="슬롯 삭제"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </Card>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {photoSlots.length > 0 && (
                      <div className="flex justify-center mt-8">
                        <Button
                          onClick={addPhotoSlot}
                          variant="outline"
                          className="border-dashed border-2 hover:border-primary/50 bg-transparent"
                          aria-label="더 많은 사진 추가"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          사진 더 추가하기
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {showNewDiaryDialog && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            role="presentation"
          >
            <div 
              className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
              role="dialog"
              aria-labelledby="dialog-title"
              aria-modal="true"
            >
              <h3 id="dialog-title" className="text-lg font-semibold text-foreground mb-2">새 일기 만들기</h3>
              <p className="text-sm text-muted-foreground mb-4">일기 제목을 입력하세요</p>
              <input
                type="text"
                value={newDiaryTitle}
                onChange={(e) => setNewDiaryTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    confirmCreateDiary()
                  }
                }}
                placeholder="예: 제주도 여행"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-6"
                autoFocus
                aria-label="일기 제목"
              />
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={cancelCreateDiary}
                  className="text-muted-foreground hover:text-foreground bg-transparent"
                >
                  취소
                </Button>
                <Button 
                  onClick={confirmCreateDiary} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  만들기
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedSlot && (
          <PhotoUploadModal
            isOpen={!!selectedSlot}
            onClose={() => setSelectedSlot(null)}
            onSave={(photo, keywords, exifData, imageId) => {
              updatePhotoSlot(selectedSlot, photo, keywords, exifData, imageId)
              setSelectedSlot(null)
            }}
            existingPhoto={
              photoSlots.find((slot) => slot.id === selectedSlot)?.imageData && 
              photoSlots.find((slot) => slot.id === selectedSlot)?.mimeType
                ? `data:${photoSlots.find((slot) => slot.id === selectedSlot)?.mimeType};base64,${photoSlots.find((slot) => slot.id === selectedSlot)?.imageData}`
                : photoSlots.find((slot) => slot.id === selectedSlot)?.photo
            }
            existingKeywords={photoSlots.find((slot) => slot.id === selectedSlot)?.keywords || []}
            existingExifData={photoSlots.find((slot) => slot.id === selectedSlot)?.exifData}
          />
        )}
      </div>
    </div>
  )
}