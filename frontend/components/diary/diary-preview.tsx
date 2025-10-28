"use client"

import { useState } from "react"
import { ArrowLeft, Download, Share2, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PrintableDiaryPage } from "@/components/diary/printable-diary-page"

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

interface DiaryPreviewProps {
  photoSlots: PhotoSlot[]
  diaryTitle: string
  onBack: () => void
}

export function DiaryPreview({ photoSlots, diaryTitle, onBack }: DiaryPreviewProps) {
  const [generatedDiary, setGeneratedDiary] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPrintable, setShowPrintable] = useState(false)

  // ✅ 한국어 Mock 다이어리 생성 함수
  const generateMockDiary = () => {
    const photosWithContent = photoSlots.filter((slot) => slot.photo)

    if (photosWithContent.length === 0) {
      return "다이어리를 생성할 사진이 없습니다. 먼저 사진을 추가해주세요!"
    }

    let diary = ""

    photosWithContent.forEach((slot, index) => {
      const timeStr = slot.exifData?.timestamp
        ? new Date(slot.exifData.timestamp).toLocaleString()
        : `${slot.timeSlot === "morning" ? "아침" : slot.timeSlot === "midday" ? "점심" : slot.timeSlot === "afternoon" ? "오후" : "저녁"}`

      const location = slot.exifData?.location?.locationName || "아름다운 장소"
      const keywords = slot.keywords.length > 0 ? slot.keywords.join(", ") : "멋진 풍경"

      let paragraph = `${timeStr}\n`
      paragraph += `${location}에서 이 소중한 순간을 담았다. `
      paragraph += `${keywords}로 가득한 풍경이 마음을 사로잡았다. `
      paragraph += `평생 간직하고 싶은 기억이 되었다.`
      
      diary += paragraph + "\n\n"
    })
    return diary.trim()
  }

  const generateDiary = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-diary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoSlots }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ 다이어리 생성 성공:", result)
        setGeneratedDiary(result.diary || generateMockDiary())
      } else {
        console.log("⚠️ API 실패, Mock 다이어리 사용")
        const mockDiary = generateMockDiary()
        setGeneratedDiary(mockDiary)
      }
    } catch (error) {
      console.log("❌ API 호출 오류, Mock 다이어리 사용:", error)
      const mockDiary = generateMockDiary()
      setGeneratedDiary(mockDiary)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadDiary = () => {
    const element = document.createElement("a")
    const file = new Blob([generatedDiary], { type: "text/plain;charset=utf-8" })
    element.href = URL.createObjectURL(file)
    element.download = `travel-diary-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
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
                  <img
                    src={slot.photo || "/placeholder.svg"}
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