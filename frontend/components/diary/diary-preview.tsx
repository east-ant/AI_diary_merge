"use client"

//diary-preview.tsx

import { useState } from "react"
import { ArrowLeft, Download, Share2, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PrintableDiaryPage } from "@/components/diary/printable-diary-page"

// ✅ timestamp를 Date | string으로 수정
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
  imageData?: string  // ✅ Base64 데이터
  mimeType?: string   // ✅ 이미지 타입
  keywords: string[]
  timeSlot: "morning" | "midday" | "afternoon" | "evening"
  timestamp: number
  exifData?: ExifData
}

interface DiaryPreviewProps {
  photoSlots: PhotoSlot[]
  diaryTitle: string
  onBack: () => void
}

export function DiaryPreview({ photoSlots, diaryTitle, onBack }: DiaryPreviewProps) {
  const [generatedDiary, setGeneratedDiary] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPrintable, setShowPrintable] = useState(false)

  const generateMockDiary = () => {
    const photosWithContent = photoSlots.filter((slot) => slot.photo || slot.imageData)

    if (photosWithContent.length === 0) {
      return "No photos to create a diary from. Please add some photos first!"
    }

    let diary = ""

    photosWithContent.forEach((slot, index) => {
      // ✅ timestamp 안전하게 처리
      let timeStr = ""
      if (slot.exifData?.timestamp) {
        const date = slot.exifData.timestamp instanceof Date 
          ? slot.exifData.timestamp 
          : new Date(slot.exifData.timestamp)
        timeStr = date.toLocaleString()
      } else {
        timeStr = `${slot.timeSlot.charAt(0).toUpperCase() + slot.timeSlot.slice(1)}`
      }

      const location = slot.exifData?.location?.locationName || "예쁜 장소"
      const keywords = slot.keywords.length > 0 ? slot.keywords.join(", ") : "아름다운 풍경"

      let paragraph = `${timeStr}\n`
      paragraph += `At ${location}, I captured this wonderful moment. `
      paragraph += `The scene was filled with ${keywords}. `
      paragraph += `It was truly a memorable experience that I'll cherish forever.`

      diary += paragraph + "\n\n"
    })
    return diary.trim()
  }

  const generateDiary = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/diary/api/generate-diary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoSlots }),
      })

      if (response.ok) {
        const result = await response.json()
        setGeneratedDiary(result.diary)
      } else {
        console.log("[v0] API failed, using mock diary generation")
        const mockDiary = generateMockDiary()
        setGeneratedDiary(mockDiary)
      }
    } catch (error) {
      console.log("[v0] Error calling API, using mock diary generation:", error)
      const mockDiary = generateMockDiary()
      setGeneratedDiary(mockDiary)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadDiary = () => {
    const element = document.createElement("a")
    const file = new Blob([generatedDiary], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `travel-diary-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // ✅ 이미지 URL 생성 함수
  const getImageUrl = (slot: PhotoSlot): string => {
    if (slot.imageData && slot.mimeType) {
      return `data:${slot.mimeType};base64,${slot.imageData}`
    }
    return slot.photo || "/placeholder.svg"
  }

  if (showPrintable && generatedDiary) {
    return (
      <div className="max-w-[210mm] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => setShowPrintable(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            다이어리 텍스트 편집
          </Button>
        </div>

        <PrintableDiaryPage photoSlots={photoSlots} diaryText={generatedDiary} title={diaryTitle} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            타임라인으로 돌아가기
          </Button>
          <h2 className="text-xl font-semibold text-foreground">검토 및 생성</h2>
        </div>

        <div className="flex space-x-3">
          {generatedDiary && (
            <>
              <Button variant="outline" onClick={downloadDiary}>
                <Download className="w-4 h-4 mr-2" />
                다운로드
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                공유
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-medium text-foreground mb-4">사진</h3>
          <div className="space-y-4">
            {photoSlots.map((slot, index) => (
              <Card key={slot.id} className="p-4 bg-card border-border">
                <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                  {/* ✅ Base64 이미지 표시 */}
                  <img
                    src={getImageUrl(slot)}
                    alt={`Travel photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2">
                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1">
                    {slot.keywords.map((keyword, idx) => (
                      <span key={idx} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md">
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">생성된 다이어리</h3>
            {!generatedDiary ? (
              <Button onClick={generateDiary} disabled={isGenerating} className="bg-primary hover:bg-primary/90">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    다이어리 생성
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => setShowPrintable(true)} className="bg-primary hover:bg-primary/90">
                <FileText className="w-4 h-4 mr-2" />
                인쇄 가능한 페이지 보기
              </Button>
            )}
          </div>

          <Card className="p-4 bg-card border-border">
            {!generatedDiary ? (
              <div className="min-h-[400px] flex items-center justify-center text-center">
                <div>
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">여행 다이어리를 생성할 준비가 되셨나요?</p>
                  <p className="text-sm text-muted-foreground">
                    "다이어리 생성" 버튼을 클릭하여 사진과 키워드로 이야기를 만드세요.
                  </p>
                </div>
              </div>
            ) : (
              <div className="min-h-[400px] p-4">
                <textarea
                  value={generatedDiary}
                  onChange={(e) => setGeneratedDiary(e.target.value)}
                  className="w-full h-full min-h-[400px] bg-transparent border-0 focus:ring-0 resize-none text-sm text-foreground whitespace-pre-wrap"
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}