"use client"

import type React from "react"
import { useRef, useState } from "react"
import { ImageIcon, Upload, X, Printer, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import html2canvas from "html2canvas"

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

interface PrintableDiaryPageProps {
  photoSlots: PhotoSlot[]
  diaryText: string
  title: string
  onBack?: () => void
  diaryId?: string
  userId?: string
  onComplete?: () => void
}

// Helper: timestamp → Date
function getDateFromTimestamp(timestamp: Date | string | undefined): Date | null {
  if (!timestamp) return null
  if (timestamp instanceof Date) return timestamp
  try {
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

// Helper: Base64 or URL
function getImageUrl(slot: PhotoSlot): string {
  if (slot.imageData && slot.mimeType) {
    return `data:${slot.mimeType};base64,${slot.imageData}`
  }
  return slot.photo || "/placeholder.svg"
}

// Helper: oklch 색상을 hex로 변환 (html2canvas 호환성)
function replaceOklchWithHex(element: HTMLElement): Map<HTMLElement, string> {
  const originalStyles = new Map<HTMLElement, string>()
  
  function convertOklchToHex(oklchStr: string): string {
    // oklch(L C H) 형식을 감지
    const oklchMatch = oklchStr.match(/oklch\(([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*\/?\s*([\d.%]*)\)/)
    
    if (!oklchMatch) {
      // oklch가 아닌 경우 그대로 반환
      return oklchStr
    }

    // 간단한 oklch to hex 변환 (근사값)
    // 완벽한 변환이 아니라 html2canvas 호환성을 위한 근사값입니다
    try {
      const l = parseFloat(oklchMatch[1])
      const c = parseFloat(oklchMatch[2])
      const h = parseFloat(oklchMatch[3])

      // oklch를 RGB로 근사 변환
      // 이것은 완벽한 변환이 아니지만 html2canvas 호환성을 위한 실용적인 해결책입니다
      const hRad = (h * Math.PI) / 180

      // 간단한 근사 공식
      const r = Math.round(255 * (l / 100 + c * 0.3 * Math.cos(hRad)))
      const g = Math.round(255 * (l / 100 + c * 0.3 * Math.sin(hRad)))
      const b = Math.round(255 * (l / 100 - c * 0.3))

      // 값을 0-255 범위로 클램프
      const clamp = (val: number) => Math.max(0, Math.min(255, val))
      const finalR = clamp(r)
      const finalG = clamp(g)
      const finalB = clamp(b)

      return `rgb(${finalR}, ${finalG}, ${finalB})`
    } catch {
      return oklchStr
    }
  }

  // 재귀적으로 모든 요소 처리
  const walkTree = (el: HTMLElement) => {
    const style = window.getComputedStyle(el)
    
    // 배경색 처리
    const bgColor = style.backgroundColor
    if (bgColor && bgColor.includes("oklch")) {
      originalStyles.set(el, el.style.backgroundColor || "")
      el.style.backgroundColor = convertOklchToHex(bgColor)
    }

    // 텍스트 색 처리
    const color = style.color
    if (color && color.includes("oklch")) {
      originalStyles.set(el, el.style.color || "")
      el.style.color = convertOklchToHex(color)
    }

    // 테두리 색 처리
    const borderColor = style.borderColor
    if (borderColor && borderColor.includes("oklch")) {
      originalStyles.set(el, el.style.borderColor || "")
      el.style.borderColor = convertOklchToHex(borderColor)
    }

    // 자식 요소들에 대해 재귀 처리
    Array.from(el.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        walkTree(child)
      }
    })
  }

  walkTree(element)
  return originalStyles
}

export function PrintableDiaryPage({
  photoSlots,
  diaryText,
  title,
  onBack,
  diaryId,
  userId,
  onComplete,
}: PrintableDiaryPageProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- 너가 수정한 font system 적용 ---
  const [fontSize, setFontSize] = useState(18)
  const [textColor, setTextColor] = useState("#1f2937")
  const [fontFamily, setFontFamily] = useState("Cafe24Shiningstar")

  // --- 너가 수정한 이모지 스티커 구조 적용 (페이지별로 관리) ---
  const [decorationPhotos, setDecorationPhotos] = useState<
    Record<number, Array<{ id: string; src: string; x: number; y: number; width: number; height: number }>>
  >({})

  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ id: string; src: string }>>([
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

  const [draggedPhotoSrc, setDraggedPhotoSrc] = useState<string | null>(null)
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0)

  // --- 너가 만든 크기 조절 state ---
  const [resizingPhotoId, setResizingPhotoId] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState<{
    x: number
    y: number
    width: number
    height: number
    startX: number
    startY: number
  } | null>(null)

  const [isSavingComplete, setIsSavingComplete] = useState(false)
  const [currentPageElement, setCurrentPageElement] = useState<HTMLElement | null>(null)

  // --- 사진 위치 드래그 state ---
  const [photoPositions, setPhotoPositions] = useState<Record<string, { left: number; top: number }>>({})
  const [draggingPhotoSlotId, setDraggingPhotoSlotId] = useState<string | null>(null)
  const [photoDragStart, setPhotoDragStart] = useState<{ x: number; y: number } | null>(null)

  // 파일 업로드
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
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handlePhotoDragStart = (photoSrc: string) => {
    setDraggedPhotoSrc(photoSrc)
  }

  // Drop
  const handlePageDrop = (e: React.DragEvent, pageElement: HTMLDivElement, pageIndex: number) => {
    e.preventDefault()
    if (!draggedPhotoSrc) return

    const rect = pageElement.getBoundingClientRect()
    const defaultW = 20 * 3.78
    const defaultH = 20 * 3.78

    // Calculate position and constrain within page boundaries
    let x = e.clientX - rect.left - defaultW / 2
    let y = e.clientY - rect.top - defaultH / 2

    // Page boundaries (accounting for page dimensions)
    const pageWidth = rect.width
    const pageHeight = rect.height

    // Clamp position so emoji stays within bounds
    x = Math.max(0, Math.min(x, pageWidth - defaultW))
    y = Math.max(0, Math.min(y, pageHeight - defaultH))

    const currentPagePhotos = decorationPhotos[pageIndex] || []

    setDecorationPhotos({
      ...decorationPhotos,
      [pageIndex]: [
        ...currentPagePhotos,
        {
          id: `photo-${Date.now()}`,
          src: draggedPhotoSrc,
          x,
          y,
          width: 20,
          height: 20,
        },
      ],
    })

    setDraggedPhotoSrc(null)
  }

  // MouseDown for move
  const handlePhotoMouseDown = (e: React.MouseEvent, photoId: string, pageElement: HTMLElement, pageIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    const currentPagePhotos = decorationPhotos[pageIndex] || []
    const photo = currentPagePhotos.find((p) => p.id === photoId)
    if (!photo) return

    const rect = pageElement.getBoundingClientRect()
    setCurrentPageElement(pageElement)
    setCurrentPageIndex(pageIndex)
    setDraggingPhotoId(photoId)
    setSelectedPhotoId(photoId)
    setDragOffset({
      x: e.clientX - rect.left - photo.x,
      y: e.clientY - rect.top - photo.y,
    })
  }

  // MouseDown for resize
  const handleResizeMouseDown = (e: React.MouseEvent, photoId: string, handle: string, pageElement: HTMLElement, pageIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    const currentPagePhotos = decorationPhotos[pageIndex] || []
    const photo = currentPagePhotos.find((p) => p.id === photoId)
    if (!photo) return

    const rect = pageElement.getBoundingClientRect()

    setCurrentPageElement(pageElement)
    setCurrentPageIndex(pageIndex)
    setResizingPhotoId(photoId)
    setResizeHandle(handle)
    setSelectedPhotoId(photoId)
    setResizeStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: photo.width,
      height: photo.height,
      startX: photo.x,
      startY: photo.y,
    })
  }

  // MouseMove
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!currentPageElement) return

    const rect = currentPageElement.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Page boundaries
    const pageWidth = rect.width
    const pageHeight = rect.height

    if (draggingPhotoId && !resizingPhotoId) {
      const currentPagePhotos = decorationPhotos[currentPageIndex] || []

      setDecorationPhotos({
        ...decorationPhotos,
        [currentPageIndex]: currentPagePhotos.map((p) => {
          if (p.id !== draggingPhotoId) return p

          const widthPx = p.width * 3.78
          const heightPx = p.height * 3.78

          // Calculate new position
          let newX = mouseX - dragOffset.x
          let newY = mouseY - dragOffset.y

          // Constrain within page boundaries
          newX = Math.max(0, Math.min(newX, pageWidth - widthPx))
          newY = Math.max(0, Math.min(newY, pageHeight - heightPx))

          return { ...p, x: newX, y: newY }
        })
      })
    } else if (resizingPhotoId && resizeHandle && resizeStart) {
      const deltaX = mouseX - resizeStart.x
      const deltaY = mouseY - resizeStart.y

      const currentPagePhotos = decorationPhotos[currentPageIndex] || []

      setDecorationPhotos({
        ...decorationPhotos,
        [currentPageIndex]: currentPagePhotos.map((p) => {
          if (p.id !== resizingPhotoId) return p

          let newWidth = resizeStart.width
          let newHeight = resizeStart.height
          let newX = resizeStart.startX
          let newY = resizeStart.startY

          const minSize = 5

          if (resizeHandle.includes("e")) newWidth = Math.max(minSize, resizeStart.width + deltaX)
          if (resizeHandle.includes("w")) {
            newWidth = Math.max(minSize, resizeStart.width - deltaX)
            newX = resizeStart.startX + (resizeStart.width - newWidth)
          }
          if (resizeHandle.includes("s")) newHeight = Math.max(minSize, resizeStart.height + deltaY)
          if (resizeHandle.includes("n")) {
            newHeight = Math.max(minSize, resizeStart.height - deltaY)
            newY = resizeStart.startY + (resizeStart.height - newHeight)
          }

          // Constrain within page boundaries
          const widthPx = newWidth * 3.78
          const heightPx = newHeight * 3.78

          // Ensure emoji doesn't extend beyond page
          newX = Math.max(0, Math.min(newX, pageWidth - widthPx))
          newY = Math.max(0, Math.min(newY, pageHeight - heightPx))

          return { ...p, width: newWidth, height: newHeight, x: newX, y: newY }
        })
      })
    }
  }

  // MouseUp
  const handleMouseUp = () => {
    setDraggingPhotoId(null)
    setResizingPhotoId(null)
    setResizeHandle(null)
    setResizeStart(null)
    setCurrentPageElement(null)
  }

  const handlePhotoDoubleClick = (photoId: string, pageIndex: number) => {
    const currentPagePhotos = decorationPhotos[pageIndex] || []
    setDecorationPhotos({
      ...decorationPhotos,
      [pageIndex]: currentPagePhotos.filter((p) => p.id !== photoId)
    })
  }

  const handleRemoveUploadedPhoto = (photoId: string) => {
    setUploadedPhotos(uploadedPhotos.filter((photo) => photo.id !== photoId))
  }

  // --- 사진 드래그 핸들러 ---
  const handlePhotoSlotMouseDown = (e: React.MouseEvent, photoSlotId: string, containerElement: HTMLElement) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = containerElement.getBoundingClientRect()
    setDraggingPhotoSlotId(photoSlotId)

    const currentPos = photoPositions[photoSlotId] || { left: 0, top: 0 }
    setPhotoDragStart({
      x: e.clientX - currentPos.left,
      y: e.clientY - currentPos.top
    })
  }

  const handlePhotoSlotMouseMove = (e: React.MouseEvent, containerElement: HTMLElement) => {
    if (!draggingPhotoSlotId || !photoDragStart) return

    const rect = containerElement.getBoundingClientRect()
    const newLeft = e.clientX - rect.left - photoDragStart.x
    const newTop = e.clientY - rect.top - photoDragStart.y

    setPhotoPositions({
      ...photoPositions,
      [draggingPhotoSlotId]: { left: newLeft, top: newTop }
    })
  }

  const handlePhotoSlotMouseUp = () => {
    setDraggingPhotoSlotId(null)
    setPhotoDragStart(null)
  }

  const handleCompleteClick = async () => {
    console.log("🔵 작성 완료 버튼 클릭됨!", {
      diaryId,
      diaryIdType: typeof diaryId,
      diaryIdValue: diaryId,
      userId,
      userIdType: typeof userId,
      userIdValue: userId
    })

    if (!diaryId) {
      console.error("❌ diaryId 없음:", diaryId)
      alert(`diaryId가 없습니다.\ndiaryId: ${diaryId}`)
      return
    }

    if (!userId) {
      console.error("❌ userId 없음:", userId)
      alert(`userId가 없습니다.\nuserId: ${userId}`)
      return
    }

    setIsSavingComplete(true)

    try {
      console.log("📸 다이어리 페이지를 이미지로 변환 중...")

      // 모든 페이지 요소 찾기
      const pages = document.querySelectorAll('.diary-page')
      const imageDataArray: string[] = []

      // 각 페이지를 개별적으로 캡처
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement
        console.log(`📸 페이지 ${i + 1}/${pages.length} 캡처 중...`)

        // oklch 색상 호환성 처리
        const originalStyles = replaceOklchWithHex(page)

        const canvas = await html2canvas(page, {
          backgroundColor: "#ffffff",
          scale: 2,
          logging: false,
          allowTaint: true,
          useCORS: true,
          imageTimeout: 10000,
          width: page.offsetWidth,
          height: page.offsetHeight,
          windowWidth: page.scrollWidth,
          windowHeight: page.scrollHeight,
          ignoreElements: (el) => {
            // 컨트롤 요소만 제외 (resize handles, hover rings 등)
            return (
              el.classList.contains("print:hidden") ||
              el.classList.contains("ring-2") ||
              el.classList.contains("cursor-nwse-resize") ||
              el.classList.contains("cursor-nesw-resize") ||
              el.classList.contains("cursor-ns-resize") ||
              el.classList.contains("cursor-ew-resize")
            )
          },
        })

        // 원래 스타일 복원
        originalStyles.forEach((original, el) => {
          if (original) {
            el.style.cssText = original
          }
        })

        const imageData = canvas.toDataURL("image/png").split(",")[1]
        imageDataArray.push(imageData)
      }

      console.log("📤 완료된 다이어리 저장 중:", {
        diaryId,
        userId,
        pageCount: imageDataArray.length,
      })

      const response = await fetch("http://localhost:3001/api/diaries/save-printable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diaryId,
          userId,
          imageData: imageDataArray, // 배열로 전송
        }),
      })

      const data = await response.json()

      if (data.success) {
        console.log("✅ 다이어리 완료 저장 성공")
        if (onComplete) {
          onComplete()
        }
      } else {
        throw new Error(data.error || "저장 실패")
      }
    } catch (error) {
      console.error("❌ 다이어리 완료 저장 오류:", error)
      alert(error instanceof Error ? error.message : "다이어리 저장에 실패했습니다.")
    } finally {
      setIsSavingComplete(false)
    }
  }

  // Paragraphs
  const paragraphs = diaryText.split("\n\n").filter((p) => p.trim())

  // 사진과 문단을 2개씩 그룹으로 나누기 (페이지 분할)
  const ITEMS_PER_PAGE = 2
  const totalPages = Math.ceil(paragraphs.length / ITEMS_PER_PAGE)
  const pages: Array<{ paragraphs: string[]; slots: PhotoSlot[] }> = []

  for (let i = 0; i < totalPages; i++) {
    const startIdx = i * ITEMS_PER_PAGE
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, paragraphs.length)
    pages.push({
      paragraphs: paragraphs.slice(startIdx, endIdx),
      slots: photoSlots.slice(startIdx, endIdx),
    })
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Controls */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          {/* 왼쪽: 뒤로가기 */}
          <div className="flex items-center gap-3">
            {onBack && (
              <Button onClick={onBack} variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                뒤로가기
              </Button>
            )}
          </div>

          {/* 중앙: 폰트/크기/색상 설정 */}
          <div className="flex items-center gap-4 bg-white border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">폰트:</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded"
              >
                <option value="Cafe24Shiningstar">Cafe24Shiningstar</option>
                <option value="인천교육자람">인천교육자람</option>
                <option value="memomentKkukkkuk">memomentKkukkkuk</option>
                <option value="온글잎 의연체">온글잎 의연체</option>
                <option value="PretendardVariable">PretendardVariable</option>
                <option value="Nanum Pen Script">나눔손글씨</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
              <label className="text-sm text-gray-600">크기:</label>
              <input
                type="number"
                min="12"
                max="32"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-16 px-2 py-1.5 text-sm border rounded"
              />
              <span className="text-sm text-gray-500">px</span>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
              <label className="text-sm text-gray-600">전체 색상:</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-12 h-8 rounded cursor-pointer border"
              />
            </div>
          </div>

          {/* 오른쪽: 작성 완료 */}
          <div className="flex gap-2">
            {diaryId && userId && (
              <Button
                onClick={handleCompleteClick}
                disabled={isSavingComplete}
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                {isSavingComplete ? "저장 중..." : "작성 완료"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-4 max-w-6xl mx-auto p-6">
        {/* Diary Pages (A4) */}
        <div className="flex-1 space-y-8">
          {pages.map((page, pageIdx) => (
            <div
              key={pageIdx}
              className="diary-page bg-white shadow-lg relative mx-auto"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "20mm",
                boxSizing: "border-box",
                position: "relative",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const target = e.currentTarget as HTMLDivElement
                handlePageDrop(e, target, pageIdx)
              }}
              onClick={() => setSelectedPhotoId(null)}
            >
              {/* Title (첫 페이지만) */}
              {pageIdx === 0 && (
                <div className="text-center mb-8">
                  <h2
                    className="text-3xl font-bold text-gray-900"
                    style={{
                      fontFamily: `'${fontFamily}'`,
                      color: textColor,
                      fontSize: (fontFamily === "온글잎 의연체" || fontFamily === "Cafe24Shiningstar")
                        ? `${fontSize + 10}pt`
                        : undefined
                    }}
                  >
                    {title}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="h-px w-16 bg-gray-400"></div>
                    <p className="text-sm text-gray-600" style={{ fontFamily: `'${fontFamily}'` }}>
                      {photoSlots[0]?.exifData?.timestamp
                        ? getDateFromTimestamp(photoSlots[0].exifData.timestamp)?.toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : new Date().toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                    </p>
                    <div className="h-px w-16 bg-gray-400"></div>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="space-y-8">
                {page.paragraphs.map((paragraph, idx) => {
                  const globalIdx = pageIdx * ITEMS_PER_PAGE + idx
                  const even = globalIdx % 2 === 0
                  const photoSlot = page.slots[idx]
                  if (!photoSlot) return null

                  const loc = photoSlot.exifData?.location?.locationName
                  const timeData = getDateFromTimestamp(photoSlot.exifData?.timestamp)
                  const time = timeData?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  const imageUrl = getImageUrl(photoSlot)

                  const position = photoPositions[photoSlot.id] || { left: 0, top: 0 }
                  const pageElement = document.querySelectorAll('.diary-page')[pageIdx] as HTMLElement

                  return (
                    <div
                      key={photoSlot.id}
                      className={`flex gap-4 items-start ${even ? "flex-row" : "flex-row-reverse"}`}
                      style={{
                        position: 'relative',
                        left: `${position.left}px`,
                        top: `${position.top}px`
                      }}
                      onMouseMove={(e) => pageElement && handlePhotoSlotMouseMove(e, pageElement)}
                      onMouseUp={handlePhotoSlotMouseUp}
                      onMouseLeave={handlePhotoSlotMouseUp}
                    >
                      <div className="flex-shrink-0 relative">
                        <div
                          className="bg-white p-1.5 shadow-lg transform rotate-[-2deg]"
                          style={{ width: "60mm", height: "80mm" }}
                        >
                          <img src={imageUrl} className="w-full h-full object-cover pointer-events-none" />
                        </div>

                        <div className="mt-1 text-center">
                          {time && (
                            <p
                              className="text-sm text-gray-700"
                              style={{ fontFamily: `'${fontFamily}'` }}
                            >
                              {time}
                            </p>
                          )}
                          {loc && (
                            <p
                              className="text-xs text-gray-600 flex items-center justify-center gap-1"
                              style={{ fontFamily: `'${fontFamily}'` }}
                            >
                              <span>📍</span> {loc}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 pt-2">
                        <div className="space-y-2">
                          {/* Keywords */}
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {photoSlot.keywords.slice(0, 3).map((k, kIdx) => (
                              <span
                                key={kIdx}
                                className="px-2 py-0.5 rounded-full text-sm inline-block"
                                style={{
                                  fontFamily: `'${fontFamily}'`,
                                  border: '1px solid #000000',
                                  backgroundColor: 'transparent',
                                  color: '#000000',
                                  lineHeight: '1.5',
                                  display: 'inline-block',
                                  verticalAlign: 'middle'
                                }}
                              >
                                #{k}
                              </span>
                            ))}
                          </div>

                          {/* Diary paragraph */}
                          <p
                            className="leading-relaxed select-text"
                            style={{ fontFamily: `'${fontFamily}'`, fontSize: `${fontSize}px`, color: textColor }}
                          >
                            {paragraph}
                          </p>

                          <div className="mt-3">
                            <svg width="80" height="6">
                              <path
                                d="M 0 4 Q 25 0, 50 4 T 100 4"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                className="opacity-40"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer (마지막 페이지만) */}
              {pageIdx === pages.length - 1 && (
                <div className="mt-12 pt-6 border-t-2 border-dashed text-center">
                  <p className="text-2xl text-gray-600">✈️ 여행의 끝 ✈️</p>
                </div>
              )}

              {/* Stickers - 페이지별로 독립적으로 관리 */}
              {(decorationPhotos[pageIdx] || []).map((photo) => {
                const widthPx = photo.width * 3.78
                const heightPx = photo.height * 3.78
                const selected = selectedPhotoId === photo.id
                const pageElement = document.querySelectorAll('.diary-page')[pageIdx] as HTMLElement

                return (
                  <div
                    key={photo.id}
                    className={`absolute cursor-move ${
                      selected ? "ring-2 ring-blue-500" : "hover:ring-2 hover:ring-blue-400"
                    }`}
                    style={{
                      left: `${photo.x}px`,
                      top: `${photo.y}px`,
                      width: `${widthPx}px`,
                      height: `${heightPx}px`,
                    }}
                    onMouseDown={(e) => {
                      if (pageElement) handlePhotoMouseDown(e, photo.id, pageElement, pageIdx)
                    }}
                    onDoubleClick={() => handlePhotoDoubleClick(photo.id, pageIdx)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPhotoId(photo.id)
                    }}
                  >
                    <img src={photo.src} className="w-full h-full object-cover rounded pointer-events-none" />

                    {selected && pageElement && (
                      <>
                        {/* 8 resize handles */}
                        <div
                          className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize"
                          onMouseDown={(e) => handleResizeMouseDown(e, photo.id, "nw", pageElement, pageIdx)}
                        />
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize"
                          onMouseDown={(e) => handleResizeMouseDown(e, photo.id, "ne", pageElement, pageIdx)}
                        />
                        <div
                          className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize"
                          onMouseDown={(e) => handleResizeMouseDown(e, photo.id, "sw", pageElement, pageIdx)}
                        />
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize"
                          onMouseDown={(e) => handleResizeMouseDown(e, photo.id, "se", pageElement, pageIdx)}
                        />

                        <div
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize"
                          onMouseDown={(e) => handleResizeMouseDown(e, photo.id, "n", pageElement, pageIdx)}
                        />
                        <div
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize"
                          onMouseDown={(e) => handleResizeMouseDown(e, photo.id, "s", pageElement, pageIdx)}
                        />
                        <div
                          className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize"
                          onMouseDown={(e) => handleResizeMouseDown(e, photo.id, "w", pageElement, pageIdx)}
                        />
                        <div
                          className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize"
                          onMouseDown={(e) => handleResizeMouseDown(e, photo.id, "e", pageElement, pageIdx)}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="flex-shrink-0 w-40 bg-white border rounded-lg p-3 shadow-sm print:hidden sticky top-4 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-sm">이모지 추가</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">드래그해서 사용</p>

          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full mb-3" size="sm">
            <Upload className="w-3 h-3 mr-1" /> 업로드
          </Button>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {uploadedPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div draggable onDragStart={() => handlePhotoDragStart(photo.src)} className="cursor-grab hover:ring-2 hover:ring-blue-400 transition-all">
                  <img src={photo.src} className="w-full h-20 object-cover" />
                </div>
                <button
                  onClick={() => handleRemoveUploadedPhoto(photo.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
            💡 드래그로 추가 가능
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .diary-page,
          .diary-page * {
            visibility: visible;
          }
          .diary-page {
            position: absolute;
            left: 0;
            top: 0;
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }

        .diary-page {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.02) 2px,
            rgba(0, 0, 0, 0.02) 3px
          );
        }
      `}</style>
    </div>
  )
}