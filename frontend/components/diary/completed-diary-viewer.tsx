"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, ImageIcon, Printer } from "lucide-react"
import { printDiary, getPrinterStatus } from "@/lib/print-client"
import { getUserId } from "@/lib/api-client"

interface CompletedDiaryViewerProps {
  diaryId: string
  onBack: () => void
}

export function CompletedDiaryViewer({ diaryId, onBack }: CompletedDiaryViewerProps) {
  const [diaryData, setDiaryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [printablePages, setPrintablePages] = useState<Array<{ imageData: string; pageNumber: number }>>([])
  const [isPrinting, setIsPrinting] = useState(false)
  const [printerStatus, setPrinterStatus] = useState<string>("unknown")

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

            if (printData.success && printData.data?.pages) {
              const pages = printData.data.pages.map((page: any) => ({
                imageData: `data:${printData.data.mimeType};base64,${page.imageData}`,
                pageNumber: page.pageNumber
              }))
              setPrintablePages(pages)
              console.log(`✅ 저장된 인쇄 이미지 로드 완료 (${pages.length}페이지)`)
            } else {
              console.log("ℹ️ 저장된 인쇄 이미지 없음")
            }
          } catch (e) {
            console.log("ℹ️ 저장된 인쇄 이미지 로드 실패:", e)
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

  useEffect(() => {
    async function checkPrinter() {
      const status = await getPrinterStatus()
      if (status.success && status.data) {
        setPrinterStatus(status.data.online ? "online" : "offline")
      }
    }
    checkPrinter()
  }, [])

  const handlePrint = async () => {
    const userId = getUserId()
    if (!userId) {
      alert("사용자 정보를 찾을 수 없습니다.")
      return
    }

    if (!diaryData || printablePages.length === 0) {
      alert("인쇄할 다이어리가 없습니다.")
      return
    }

    setIsPrinting(true)

    try {
      console.log("🖨️  인쇄 요청 시작...")

      const result = await printDiary({
        diaryId,
        userId
      })

      if (result.success) {
        alert(`인쇄 요청이 접수되었습니다.\n작업 ID: ${result.jobId}\n총 ${result.totalPages || printablePages.length}페이지`)
        console.log("✅ 인쇄 요청 완료:", result)
      } else {
        alert(`인쇄 요청 실패: ${result.error || "알 수 없는 오류"}`)
        console.error("❌ 인쇄 요청 실패:", result)
      }
    } catch (error) {
      console.error("❌ 인쇄 오류:", error)
      alert("인쇄 중 오류가 발생했습니다.")
    } finally {
      setIsPrinting(false)
    }
  }

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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* 헤더 */}
      <div className="flex-shrink-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
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

            <div className="flex items-center gap-4">
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

              <Button
                onClick={handlePrint}
                disabled={isPrinting || printablePages.length === 0}
                className="gap-2"
                variant="default"
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? "인쇄 중..." : "인쇄하기"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 - 세로 스크롤 가능 */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-secondary/10">
        <div className="w-full py-8">
          <div className="max-w-3xl mx-auto px-6 space-y-8">
            {printablePages.length > 0 ? (
              printablePages.map((page, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-2xl overflow-hidden border border-border">
                  <img
                    src={page.imageData}
                    alt={`${diaryData.title} - 페이지 ${page.pageNumber}`}
                    className="w-full h-auto"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 'auto'
                    }}
                  />
                </div>
              ))
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
    </div>
  )
}