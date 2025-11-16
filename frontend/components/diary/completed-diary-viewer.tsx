"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, ImageIcon } from "lucide-react"

interface CompletedDiaryViewerProps {
  diaryId: string
  onBack: () => void
}

export function CompletedDiaryViewer({ diaryId, onBack }: CompletedDiaryViewerProps) {
  const [diaryData, setDiaryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [printableImage, setPrintableImage] = useState<string | null>(null)

  useEffect(() => {
    async function loadCompletedDiary() {
      try {
        console.log("📥 완료된 다이어리 로딩:", diaryId)

        const res = await fetch(`http://localhost:3001/api/diaries/${diaryId}`)
        const data = await res.json()

        if (data.success) {
          console.log("✅ 다이어리 데이터:", data.data)
          setDiaryData(data.data)

          try {
            const printRes = await fetch(`http://localhost:3001/api/diaries/printable/${diaryId}`)
            const printData = await printRes.json()
            
            if (printData.success && printData.data?.imageData) {
              setPrintableImage(`data:${printData.data.mimeType};base64,${printData.data.imageData}`)
              console.log("✅ 저장된 인쇄 이미지 로드 완료")
            } else {
              console.log("ℹ️ 저장된 인쇄 이미지 없음")
            }
          } catch (e) {
            console.log("ℹ️ 저장된 인쇄 이미지 로드 실패")
          }
        }
      } catch (e) {
        console.error("❌ 다이어리 로딩 오류:", e)
      } finally {
        setLoading(false)
      }
    }

    loadCompletedDiary()
  }, [diaryId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">다이어리를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!diaryData) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">다이어리를 찾을 수 없습니다.</p>
          <Button onClick={onBack}>돌아가기</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                돌아가기
              </Button>
              
              <div className="h-6 w-px bg-border"></div>
              
              <h1 className="text-xl font-semibold text-foreground">
                {diaryData.title}
              </h1>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{diaryData.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span>{diaryData.photoSlots?.length || 0}장</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 - 세로 스크롤, 좁은 너비 */}
      <div className="w-full py-8 bg-gradient-to-b from-background to-secondary/10">
        <div className="max-w-3xl mx-auto px-6">
          {printableImage ? (
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-border">
              <img 
                src={printableImage} 
                alt={diaryData.title}
                className="w-full h-auto"
                style={{ 
                  maxWidth: '100%', 
                  display: 'block',
                  margin: '0 auto'
                }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-2xl p-12 border border-border">
              <div className="text-center text-muted-foreground">
                <p className="mb-4 text-lg">아직 저장된 다이어리가 없습니다.</p>
                <p className="text-sm">다이어리 미리보기에서 "작성 완료" 버튼을 눌러주세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}