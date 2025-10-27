"use client"

import { useState, useEffect } from "react"
import { Plus, Sun, Sunset, Moon, Edit2, Trash2, FileText, Clock, MapPin, Camera } from "lucide-react"
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
}

interface Diary {
  id: string
  title: string
  date: string
  photoSlots: PhotoSlot[]
  createdAt: number
}

const timeSlots = [
  { id: "morning", label: "Morning", icon: Sun },
  { id: "midday", label: "Midday", icon: Sun },
  { id: "afternoon", label: "Afternoon", icon: Sunset },
  { id: "evening", label: "Evening", icon: Moon },
] as const

const DIARIES_STORAGE_KEY = "travel-diaries"
const CURRENT_DIARY_KEY = "current-diary-id"

export default function TravelDiary() {
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [currentDiaryId, setCurrentDiaryId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showNewDiaryDialog, setShowNewDiaryDialog] = useState(false)
  const [newDiaryTitle, setNewDiaryTitle] = useState("")

  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const savedDiaries = localStorage.getItem(DIARIES_STORAGE_KEY)
    const savedCurrentId = localStorage.getItem(CURRENT_DIARY_KEY)

    if (savedDiaries) {
      try {
        const parsedDiaries = JSON.parse(savedDiaries)
        const processedDiaries = parsedDiaries.map((diary: Diary) => ({
          ...diary,
          photoSlots: diary.photoSlots.map((slot: any) => ({
            ...slot,
            exifData: slot.exifData
              ? {
                  ...slot.exifData,
                  timestamp: slot.exifData.timestamp ? new Date(slot.exifData.timestamp) : undefined,
                }
              : undefined,
          })),
        }))
        setDiaries(processedDiaries)

        if (savedCurrentId && processedDiaries.find((d: Diary) => d.id === savedCurrentId)) {
          setCurrentDiaryId(savedCurrentId)
          const currentDiary = processedDiaries.find((d: Diary) => d.id === savedCurrentId)
          if (currentDiary) {
            setPhotoSlots(currentDiary.photoSlots)
          }
        } else if (processedDiaries.length > 0) {
          setCurrentDiaryId(processedDiaries[0].id)
          setPhotoSlots(processedDiaries[0].photoSlots)
        } else {
          createNewDiary()
        }
      } catch (error) {
        console.error("Failed to load saved diaries:", error)
        createNewDiary()
      }
    } else {
      createNewDiary()
    }
  }, [])

  useEffect(() => {
    if (currentDiaryId) {
      setDiaries((prevDiaries) => {
        const updatedDiaries = prevDiaries.map((diary) =>
          diary.id === currentDiaryId ? { ...diary, photoSlots, date: new Date().toLocaleDateString() } : diary,
        )
        localStorage.setItem(DIARIES_STORAGE_KEY, JSON.stringify(updatedDiaries))
        return updatedDiaries
      })
    }
  }, [photoSlots, currentDiaryId])

  const createNewDiary = () => {
    setShowNewDiaryDialog(true)
    setNewDiaryTitle(`여행 일기 ${new Date().toLocaleDateString()}`)
  }

  const confirmCreateDiary = () => {
    const title = newDiaryTitle.trim() || `여행 일기 ${new Date().toLocaleDateString()}`

    const newDiary: Diary = {
      id: Date.now().toString(),
      title: title,
      date: new Date().toLocaleDateString(),
      photoSlots: [{ id: "1", keywords: [], timeSlot: "morning", timestamp: Date.now() }],
      createdAt: Date.now(),
    }

    setDiaries((prev) => {
      const updated = [...prev, newDiary]
      localStorage.setItem(DIARIES_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
    setCurrentDiaryId(newDiary.id)
    localStorage.setItem(CURRENT_DIARY_KEY, newDiary.id)
    setPhotoSlots(newDiary.photoSlots)
    setCurrentStep(1)
    setShowPreview(false)
    setSidebarOpen(false)

    setShowNewDiaryDialog(false)
    setNewDiaryTitle("")
  }

  const cancelCreateDiary = () => {
    setShowNewDiaryDialog(false)
    setNewDiaryTitle("")
  }

  const selectDiary = (diaryId: string) => {
    const diary = diaries.find((d) => d.id === diaryId)
    if (diary) {
      setCurrentDiaryId(diaryId)
      localStorage.setItem(CURRENT_DIARY_KEY, diaryId)
      setPhotoSlots(diary.photoSlots)
      setCurrentStep(1)
      setShowPreview(false)
      setSidebarOpen(false)
    }
  }

  const getCurrentDiaryTitle = () => {
    const diary = diaries.find((d) => d.id === currentDiaryId)
    return diary?.title || "Travel Diary"
  }

  const sortPhotosByTime = (slots: PhotoSlot[]): PhotoSlot[] => {
    return [...slots].sort((a, b) => {
      const timeA = a.exifData?.timestamp?.getTime() || a.timestamp
      const timeB = b.exifData?.timestamp?.getTime() || b.timestamp
      return timeA - timeB
    })
  }

  const addPhotoSlot = () => {
    const newSlot: PhotoSlot = {
      id: Date.now().toString(),
      keywords: [],
      timeSlot: "evening",
      timestamp: Date.now(),
    }
    setPhotoSlots([...photoSlots, newSlot])
  }

  const updatePhotoSlot = (slotId: string, photo: string, keywords: string[], exifData?: ExifData) => {
    setPhotoSlots((slots) => {
      const updatedSlots = slots.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              photo,
              keywords,
              exifData,
              timestamp: exifData?.timestamp?.getTime() || Date.now(),
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
    if (!slot.photo) {
      return null
    }

    if (slot.exifData?.timestamp) {
      return slot.exifData.timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    }
    return null
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

  const getTimeSlotInfo = (timeSlot: string) => {
    return timeSlots.find((slot) => slot.id === timeSlot) || timeSlots[0]
  }

  const getCompletedPhotos = () => {
    return photoSlots.filter((slot) => slot.photo && slot.keywords.length > 0)
  }

  const canProceedToReview = () => {
    return getCompletedPhotos().length > 0
  }

  const handleNextStep = () => {
    if (currentStep === 1 && canProceedToReview()) {
      setCurrentStep(2)
      setShowPreview(true)
    }
  }

  const deleteDiary = (diaryId: string) => {
    setDiaries((prevDiaries) => {
      const updatedDiaries = prevDiaries.filter((d) => d.id !== diaryId)
      localStorage.setItem(DIARIES_STORAGE_KEY, JSON.stringify(updatedDiaries))

      if (currentDiaryId === diaryId) {
        if (updatedDiaries.length > 0) {
          const newCurrentDiary = updatedDiaries[0]
          setCurrentDiaryId(newCurrentDiary.id)
          localStorage.setItem(CURRENT_DIARY_KEY, newCurrentDiary.id)
          setPhotoSlots(newCurrentDiary.photoSlots)
        } else {
          setTimeout(() => createNewDiary(), 100)
        }
      }

      return updatedDiaries
    })
  }

  const sortedPhotoSlots = sortPhotosByTime(photoSlots)

  const diaryList = diaries.map((diary) => ({
    id: diary.id,
    title: diary.title,
    date: diary.date,
    photoCount: diary.photoSlots.filter((slot) => slot.photo).length,
  }))

  const getTimeEmoji = (slot: PhotoSlot) => {
    if (!slot.photo || !slot.exifData?.timestamp) {
      return null // No emoji for empty slots
    }

    const hour = slot.exifData.timestamp.getHours()

    if (hour >= 5 && hour < 12) {
      return Sun // Morning
    } else if (hour >= 12 && hour < 17) {
      return Sun // Afternoon
    } else if (hour >= 17 && hour < 20) {
      return Sunset // Evening
    } else {
      return Moon // Night
    }
  }

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

      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          sidebarOpen ? "ml-80" : "ml-16"
        }`}
      >
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
                    disabled={!canProceedToReview()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    검토 및 생성
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
            />
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-px timeline-connector"></div>

                <div className="space-y-8">
                  {sortedPhotoSlots.map((slot, index) => {
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
                          {slot.photo ? (
                            <div>
                              <div className="relative group">
                                <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                                  <img
                                    src={slot.photo || "/placeholder.svg"}
                                    alt="Travel photo"
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                  <Button size="sm" variant="secondary" onClick={() => setSelectedSlot(slot.id)}>
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => clearPhoto(slot.id)}>
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
                                        <span>{slot.exifData.timestamp.toLocaleString()}</span>
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
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </Card>
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-center mt-8">
                  <Button
                    onClick={addPhotoSlot}
                    variant="outline"
                    className="border-dashed border-2 hover:border-primary/50 bg-transparent"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    사진 더 추가하기
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {showNewDiaryDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">새 일기 만들기</h3>
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
              />
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={cancelCreateDiary}
                  className="text-muted-foreground hover:text-foreground bg-transparent"
                >
                  취소
                </Button>
                <Button onClick={confirmCreateDiary} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
            onSave={(photo, keywords, exifData) => {
              updatePhotoSlot(selectedSlot, photo, keywords, exifData)
              setSelectedSlot(null)
            }}
            existingPhoto={photoSlots.find((slot) => slot.id === selectedSlot)?.photo}
            existingKeywords={photoSlots.find((slot) => slot.id === selectedSlot)?.keywords || []}
            existingExifData={photoSlots.find((slot) => slot.id === selectedSlot)?.exifData}
          />
        )}
      </div>
    </div>
  )
}
