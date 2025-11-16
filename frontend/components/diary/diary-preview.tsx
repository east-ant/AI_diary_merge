"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Edit2, Check, X, Save, Printer, ImageIcon, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PrintableDiaryPage } from "./printable-diary-page"
import html2canvas from "html2canvas"

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
  onComplete?: () => void
}

export function DiaryPreview({
  photoSlots,
  diaryTitle,
  onBack,
  diaryId,
  userId,
  onComplete,
}: DiaryPreviewProps) {
  const [aiContent, setAiContent] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditingAi, setIsEditingAi] = useState(false)
  const [editedAiContent, setEditedAiContent] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [showPrintablePage, setShowPrintablePage] = useState(false)
  const [isCompleteSaving, setIsCompleteSaving] = useState(false)
  
  // 폰트 설정 상태
  const [fontSize, setFontSize] = useState(18)
  const [textColor, setTextColor] = useState("#1f2937")
  const [fontFamily, setFontFamily] = useState("Caveat")
  
  /* 🔥 추가된 부분 — 드래그 상태 + 장식 이모지 상태 */
  const [draggingEmoji, setDraggingEmoji] = useState<string | null>(null)
  const [decorations, setDecorations] = useState<any[]>([])

  const [uploadedPhotos, setUploadedPhotos] = useState([
    { id: "default-1", src: "/emotion/cw1.png" },
    { id: "default-2", src: "/emotion/cw2.png" },
    { id: "default-3", src: "/emotion/cw3.png" },
    { id: "default-4", src: "/emotion/cw4.png" },
    { id: "default-5", src: "/emotion/cw5.png" },
    { id: "default-6", src: "/emotion/cw6.png" },
    { id: "default-7", src: "/emotion/cw7.png" },
    { id: "default-8", src: "/emotion/cw8.png" },
    { id: "default-9", src: "/emotion/cw9.png" },
    { id: "default-10", src: "/emotion/cw10.png" },
    { id: "default-11", src: "/emotion/ds1.png" },
    { id: "default-12", src: "/emotion/ds2.png" },
    { id: "default-13", src: "/emotion/ds3.png" },
    { id: "default-14", src: "/emotion/ds4.png" },
    { id: "default-15", src: "/emotion/ds5.png" },
    { id: "default-16", src: "/emotion/ds6.png" },
    { id: "default-17", src: "/emotion/ds7.png" },
    { id: "default-18", src: "/emotion/ds8.png" },
    { id: "default-19", src: "/emotion/ds9.png" },
    { id: "default-20", src: "/emotion/ds10.png" },
    { id: "default-21", src: "/emotion/sj1.png" },
    { id: "default-22", src: "/emotion/sj2.png" },
    { id: "default-23", src: "/emotion/sj3.png" },
    { id: "default-24", src: "/emotion/sj4.png" },
    { id: "default-25", src: "/emotion/sj5.png" },
    { id: "default-26", src: "/emotion/sj6.png" },
    { id: "default-27", src: "/emotion/sj7.png" },
    { id: "default-28", src: "/emotion/sj8.png" },
    { id: "default-29", src: "/emotion/sj9.png" },
    { id: "default-30", src: "/emotion/sj10.png" },
    { id: "default-31", src: "/emotion/yj1.png" },
    { id: "default-32", src: "/emotion/yj2.png" },
    { id: "default-33", src: "/emotion/yj3.png" },
    { id: "default-34", src: "/emotion/yj4.png" },
    { id: "default-35", src: "/emotion/yj5.png" },
    { id: "default-36", src: "/emotion/yj6.png" },
    { id: "default-37", src: "/emotion/yj7.png" },
  ])
  
  const printableRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const src = event.target?.result as string
        setUploadedPhotos((prev) => [...prev, { id: `upload-${Date.now()}-${Math.random()}`, src }])
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handlePhotoDragStart = (photoSrc: string) => {
    // 드래그 시작 로직 (필요시 구현)
  }

  const handleRemoveUploadedPhoto = (photoId: string) => {
    setUploadedPhotos(uploadedPhotos.filter((photo) => photo.id !== photoId))
  }

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
      const keywords = photoSlots
        .flatMap((slot) => slot.keywords)
        .filter((kw) => kw)
        .join(", ")

      console.log("📤 AI 생성 요청:", { diaryTitle, keywords, photoCount: photoSlots.length })

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

  const handleSaveComplete = async () => {
    console.log("🚀 작성 완료 버튼 클릭")

    if (!printableRef.current) {
      toast({
        title: "오류",
        description: "인쇄 영역을 찾을 수 없습니다.",
        variant: "destructive",
      })
      return
    }

    setIsCompleteSaving(true)

    try {
      const style = document.createElement("style")
      style.id = "capture-fix"
      style.innerHTML = `
        * {
          color: rgb(0, 0, 0) !important;
          background-color: transparent !important;
          border-color: rgb(200, 200, 200) !important;
        }

        :root {
          --background: 255 255 255 !important;
          --foreground: 0 0 0 !important;
          --card: 255 255 255 !important;
          --card-foreground: 0 0 0 !important;
          --border: 200 200 200 !important;
        }

        .diary-page {
          background-color: #ffffff !important;
        }

        .print\\:hidden {
          display: none !important;
        }
        
        select, button, input {
          display: none !important;
        }
      `
      document.head.appendChild(style)

      await new Promise((r) => setTimeout(r, 100))

      const canvas = await html2canvas(printableRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        ignoreElements: (element) => {
          return (
            element.classList.contains('print:hidden') ||
            element.tagName === 'SELECT' ||
            element.tagName === 'BUTTON' ||
            element.tagName === 'INPUT'
          )
        }
      })

      document.head.removeChild(style)

      const imageData = canvas.toDataURL("image/jpeg", 0.95)

      const printResp = await fetch("http://localhost:3001/api/diaries/save-printable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaryId, userId, imageData }),
      })

      const printResult = await printResp.json()

      if (!printResult.success) throw new Error(printResult.error)

      const completeResp = await fetch("http://localhost:3001/api/diaries/mark-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaryId }),
      })

      const completeResult = await completeResp.json()

      if (!completeResult.success) {
        console.warn("⚠️ 완료 상태 저장 실패:", completeResult.error)
      }

      toast({
        title: "저장 완료",
        description: "다이어리가 성공적으로 저장되었습니다!",
      })

      setTimeout(() => {
        onComplete?.()
      }, 500)

    } catch (err: any) {
      toast({
        title: "저장 오류",
        description: err.message || "저장 중 문제가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsCompleteSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const startEditing = () => {
    setEditedAiContent(aiContent)
    setIsEditingAi(true)
  }

  const cancelEditing = () => {
    setIsEditingAi(false)
    setEditedAiContent("")
  }

  if (showPrintablePage) {
    return (
      <div className="w-full print:p-0 print:m-0">
        {/* 상단 네비게이션 바 */}
        <div className="flex items-center gap-3 mb-6 print:hidden px-6 sticky top-0 z-50 py-3 bg-white/90 backdrop-blur-sm border-b border-gray-200">
          {/* 왼쪽: 돌아가기 버튼 */}
          <div className="absolute left-6">
            <Button variant="outline" onClick={() => setShowPrintablePage(false)} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
          </div>

          {/* 중앙: 폰트/크기/색상 설정 */}
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm mx-auto">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">폰트:</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Caveat">Caveat</option>
                <option value="Patrick Hand">Patrick Hand</option>
                <option value="Indie Flower">Indie Flower</option>
                <option value="Nanum Pen Script">나눔손글씨</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
              <label className="text-sm text-gray-600">크기:</label>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                min="12"
                max="36"
                className="border border-gray-300 rounded px-2 py-1 w-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">px</span>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
              <label className="text-sm text-gray-600">전체 색상:</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* 오른쪽: 작성 완료 + 인쇄 버튼 */}
          <div className="absolute right-6 flex gap-3">
            <Button
              onClick={handleSaveComplete}
              disabled={isCompleteSaving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isCompleteSaving ? "저장 중..." : "작성 완료"}
            </Button>

            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              인쇄
            </Button>
          </div>
        </div>

        {/* 메인 영역: 다이어리 + 이모지 사이드바 */}
        <div className="flex gap-8 items-start justify-center print:block print:m-0 print:p-0 px-6">
          {/* 다이어리 페이지 */}
          <div ref={printableRef} className="flex-shrink-0">
            <PrintableDiaryPage 
              photoSlots={photoSlots} 
              diaryText={aiContent} 
              title={diaryTitle}
              fontSize={fontSize}
              textColor={textColor}
              fontFamily={fontFamily}
            />
          </div>

          {/* 오른쪽 이모지 사이드바 */}
          <div className="flex-shrink-0 w-40 bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:hidden sticky top-24">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-gray-600" />
              <h3 className="font-semibold text-sm text-gray-800">이모지 추가</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">일기에 드래그하세요</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full mb-3" size="sm">
              <Upload className="w-3 h-3 mr-1" />
              업로드
            </Button>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {uploadedPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div
                    draggable
                    onDragStart={() => handlePhotoDragStart(photo.src)}
                    className="cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-blue-400 transition-all rounded overflow-hidden"
                  >
                    <img src={photo.src || "/placeholder.svg"} alt="Emoji" className="w-full h-20 object-cover" />
                  </div>
                  <button
                    onClick={() => handleRemoveUploadedPhoto(photo.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="삭제"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">💡 드래그로 추가</p>
              <p className="text-xs text-gray-500 mt-1">💡 클릭 후 핸들로 크기 조절</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!aiContent) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center space-x-3 mb-8">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">검토 및 생성</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-bold text-foreground">검토 및 생성</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">생성된 다이어리</h3>
          </div>

          {isEditingAi ? (
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