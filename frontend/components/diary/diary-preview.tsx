"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Edit2, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PrintableDiaryPage } from "./printable-diary-page"

interface PhotoSlot {
  id: string
  photo?: string
  imageData?: string
  mimeType?: string
  keywords: string[]
  timeSlot: "morning" | "midday" | "afternoon" | "evening"
  timestamp: number
  exifData?: {
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
}

interface DiaryPreviewProps {
  photoSlots: PhotoSlot[]
  diaryTitle: string
  onBack: () => void
  diaryId: string
  userId: string
}

export function DiaryPreview({
  photoSlots,
  diaryTitle,
  onBack,
  diaryId,
  userId,
}: DiaryPreviewProps) {
  const [aiContent, setAiContent] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditingAi, setIsEditingAi] = useState(false)
  const [editedAiContent, setEditedAiContent] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [showPrintablePage, setShowPrintablePage] = useState(false)
  const { toast } = useToast()

  // ✅ AI 다이어리 생성
  const generateAiDiary = async () => {
    if (photoSlots.length === 0) {
      toast({
        title: "오류",
        description: "사진이 없습니다.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // 키워드 추출
      const keywords = photoSlots
        .flatMap((slot) => slot.keywords)
        .filter((kw) => kw)
        .join(", ")

      console.log("📤 AI 생성 요청:", { diaryTitle, keywords, photoCount: photoSlots.length })

      // AI 다이어리 생성 요청
      const response = await fetch("/api/generate-diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: diaryTitle,
          keywords,
          photoCount: photoSlots.length,
        }),
      })

      const data = await response.json()

      console.log("📥 API 응답:", data)

      if (data.success) {
        setAiContent(data.content || "")
        setEditedAiContent(data.content || "")
        toast({
          title: "생성 완료",
          description: "AI 다이어리가 생성되었습니다!",
        })
      } else {
        throw new Error(data.error || "생성 실패")
      }
    } catch (error) {
      console.error("AI 생성 오류:", error)
      toast({
        title: "생성 오류",
        description: error instanceof Error ? error.message : "AI 다이어리 생성에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // ✅ AI 다이어리 저장 (백엔드에 저장)
  const saveAiDiary = async () => {
    setIsSaving(true)

    try {
      const response = await fetch("http://localhost:3001/api/save-ai-diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diaryId,
          userId,
          content: editedAiContent,
          // ✅ photoSlots 제외 (용량 문제 해결)
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAiContent(editedAiContent)
        setIsEditingAi(false)
        
        toast({
          title: "저장 완료",
          description: "수정사항이 저장되었습니다!",
        })

        // ✅ 읽기 모드로 돌아감 (수정 모드 해제만)
      } else {
        throw new Error(data.error || "저장 실패")
      }
    } catch (error) {
      console.error("저장 오류:", error)
      toast({
        title: "저장 오류",
        description: error instanceof Error ? error.message : "저장에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ✅ 편집 시작
  const startEditing = () => {
    setEditedAiContent(aiContent)
    setIsEditingAi(true)
  }

  // ✅ 편집 취소
  const cancelEditing = () => {
    setIsEditingAi(false)
    setEditedAiContent("")
  }

  // ✅ Step 3: PrintableDiaryPage 표시 (돌아가기 버튼은 PrintableDiaryPage에만)
  if (showPrintablePage) {
    return (
      <div className="w-full">
        <PrintableDiaryPage 
          photoSlots={photoSlots} 
          diaryText={aiContent} 
          title={diaryTitle}
          onBack={() => setShowPrintablePage(false)}
        />
      </div>
    )
  }

  // ✅ Step 2: AI 다이어리 생성 및 편집
  if (!aiContent) {
    // ✅ Step 2-1: AI 생성 단계
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center space-x-3 mb-8">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">검토 및 생성</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: 사진들 - 세로 스크롤 */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">사진</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {photoSlots.map((slot, idx) => (
                <Card key={slot.id} className="overflow-hidden border-border">
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img
                      src={
                        slot.imageData && slot.mimeType
                          ? `data:${slot.mimeType};base64,${slot.imageData}`
                          : slot.photo || "/placeholder.svg"
                      }
                      alt={`photo-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 bg-card">
                    <div className="flex flex-wrap gap-2">
                      {slot.keywords.map((keyword, kidx) => (
                        <span
                          key={kidx}
                          className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full font-medium"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 오른쪽: 생성 요청 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">생성된 다이어리</h3>
            </div>

            <Card className="p-8 text-center space-y-6 border-dashed bg-secondary/30 h-full flex flex-col justify-center items-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  여행 다이어리를 생성하시겠습니까?
                </h3>
                <p className="text-sm text-muted-foreground">
                  "{diaryTitle}" 버튼을 클릭하여 사진과<br />
                  키워드로 이야기를 만드세요.
                </p>
              </div>

              <div className="flex flex-col w-full space-y-2">
                <Button
                  onClick={generateAiDiary}
                  disabled={isGenerating}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isGenerating ? "생성 중..." : "다이어리 생성"}
                </Button>
                <Button variant="outline" onClick={onBack} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  돌아가기
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Step 2-2: AI 생성 완료, 편집 단계
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-bold text-foreground">검토 및 생성</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 왼쪽: 사진들 - 세로 스크롤 */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">사진</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {photoSlots.map((slot, idx) => (
              <Card key={slot.id} className="overflow-hidden border-border">
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={
                      slot.imageData && slot.mimeType
                        ? `data:${slot.mimeType};base64,${slot.imageData}`
                        : slot.photo || "/placeholder.svg"
                    }
                    alt={`photo-${idx}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 bg-card">
                  <div className="flex flex-wrap gap-2">
                    {slot.keywords.map((keyword, kidx) => (
                      <span
                        key={kidx}
                        className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full font-medium"
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 오른쪽: 생성된 다이어리 + 편집 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">생성된 다이어리</h3>
          </div>

          {isEditingAi ? (
            // ✅ 편집 모드
            <div className="space-y-3">
              <textarea
                value={editedAiContent}
                onChange={(e) => setEditedAiContent(e.target.value)}
                className="w-full h-80 px-4 py-3 bg-background border border-primary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm leading-relaxed"
                placeholder="다이어리 내용을 자유롭게 수정하세요..."
              />

              <div className="flex justify-end space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEditing}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={saveAiDiary}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {isSaving ? "저장 중..." : "저장하기"}
                </Button>
              </div>
            </div>
          ) : (
            // ✅ 읽기 모드
            <div className="space-y-3">
              <Card className="p-6 bg-card border-border min-h-80 max-h-80 overflow-y-auto">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                  {aiContent}
                </p>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={startEditing}
                  className="text-foreground hover:bg-secondary"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  수정하기
                </Button>
                <Button
                  onClick={() => setShowPrintablePage(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  확인 및 진행
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}