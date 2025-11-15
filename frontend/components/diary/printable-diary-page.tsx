"use client"

import type React from "react"
import { useRef, useState } from "react"
import { ImageIcon, Upload, X, Printer, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

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
}

// ✅ Helper 함수: timestamp를 Date 객체로 변환
function getDateFromTimestamp(timestamp: Date | string | undefined): Date | null {
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

// ✅ Helper 함수: 이미지 URL 생성 (Base64 또는 URL)
function getImageUrl(slot: PhotoSlot): string {
  if (slot.imageData && slot.mimeType) {
    return `data:${slot.mimeType};base64,${slot.imageData}`
  }
  return slot.photo || "/placeholder.svg"
}

export function PrintableDiaryPage({ photoSlots, diaryText, title, onBack }: PrintableDiaryPageProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fontSize, setFontSize] = useState(18)
  const [textColor, setTextColor] = useState("#1f2937")
  const [fontFamily, setFontFamily] = useState("Caveat")

  const [decorationPhotos, setDecorationPhotos] = useState<
    Array<{ 
      id: string
      src: string
      x: number
      y: number
      width: number
      height: number
    }>
  >([])

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
  
  // ✅ 크기 조절 핸들
  const [resizingPhotoId, setResizingPhotoId] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number; startX: number; startY: number } | null>(null)

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
    setDraggedPhotoSrc(photoSrc)
  }

  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedPhotoSrc || !pageRef.current) return

    const rect = pageRef.current.getBoundingClientRect()

    const defaultWidthPx = 20 * 3.78
    const defaultHeightPx = 20 * 3.78

    const x = e.clientX - rect.left - defaultWidthPx / 2
    const y = e.clientY - rect.top - defaultHeightPx / 2

    setDecorationPhotos([
      ...decorationPhotos,
      {
        id: `photo-${Date.now()}`,
        src: draggedPhotoSrc,
        x,
        y,
        width: 20,
        height: 20,
      },
    ])

    setDraggedPhotoSrc(null)
  }

  const handlePhotoMouseDown = (e: React.MouseEvent, photoId: string) => {
    e.preventDefault()
    e.stopPropagation()

    const photo = decorationPhotos.find((p) => p.id === photoId)
    if (!photo || !pageRef.current) return

    const rect = pageRef.current.getBoundingClientRect()

    setDraggingPhotoId(photoId)
    setSelectedPhotoId(photoId)
    setDragOffset({
      x: e.clientX - rect.left - photo.x,
      y: e.clientY - rect.top - photo.y,
    })
  }

  // ✅ 크기 조절 핸들 마우스다운
  const handleResizeMouseDown = (e: React.MouseEvent, photoId: string, handle: string) => {
    e.preventDefault()
    e.stopPropagation()

    const photo = decorationPhotos.find((p) => p.id === photoId)
    if (!photo || !pageRef.current) return

    const rect = pageRef.current.getBoundingClientRect()

    setResizingPhotoId(photoId)
    setResizeHandle(handle)
    setSelectedPhotoId(photoId)
    setResizeStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: photo.width,
      height: photo.height,
      startX: photo.x,  // ✅ 초기 x 위치 저장
      startY: photo.y,  // ✅ 초기 y 위치 저장
    })
  }

  const handlePageMouseMove = (e: React.MouseEvent) => {
    if (!pageRef.current) return

    const rect = pageRef.current.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    // 크기 조절 중
    if (resizingPhotoId && resizeStart && resizeHandle) {
      const photo = decorationPhotos.find((p) => p.id === resizingPhotoId)
      if (!photo) return

      const deltaX = (currentX - resizeStart.x) / 3.78  // px를 mm로 변환
      const deltaY = (currentY - resizeStart.y) / 3.78

      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      let newX = resizeStart.startX  // ✅ 초기 x 위치 사용
      let newY = resizeStart.startY  // ✅ 초기 y 위치 사용

      // 8개의 핸들 각각에 대한 처리 - 수정된 버전
      switch (resizeHandle) {
        case 'nw': // 북서 (좌상)
          newWidth = Math.max(10, resizeStart.width - deltaX)
          newHeight = Math.max(10, resizeStart.height - deltaY)
          newX = resizeStart.startX + (resizeStart.width - newWidth) * 3.78
          newY = resizeStart.startY + (resizeStart.height - newHeight) * 3.78
          break
        case 'n': // 북 (상)
          newHeight = Math.max(10, resizeStart.height - deltaY)
          newY = resizeStart.startY + (resizeStart.height - newHeight) * 3.78
          break
        case 'ne': // 북동 (우상)
          newWidth = Math.max(10, resizeStart.width + deltaX)
          newHeight = Math.max(10, resizeStart.height - deltaY)
          newY = resizeStart.startY + (resizeStart.height - newHeight) * 3.78
          break
        case 'w': // 서 (좌)
          newWidth = Math.max(10, resizeStart.width - deltaX)
          newX = resizeStart.startX + (resizeStart.width - newWidth) * 3.78
          break
        case 'e': // 동 (우)
          newWidth = Math.max(10, resizeStart.width + deltaX)
          break
        case 'sw': // 남서 (좌하)
          newWidth = Math.max(10, resizeStart.width - deltaX)
          newHeight = Math.max(10, resizeStart.height + deltaY)
          newX = resizeStart.startX + (resizeStart.width - newWidth) * 3.78
          break
        case 's': // 남 (하)
          newHeight = Math.max(10, resizeStart.height + deltaY)
          break
        case 'se': // 남동 (우하)
          newWidth = Math.max(10, resizeStart.width + deltaX)
          newHeight = Math.max(10, resizeStart.height + deltaY)
          break
      }

      setDecorationPhotos(decorationPhotos.map((p) => 
        p.id === resizingPhotoId 
          ? { ...p, width: newWidth, height: newHeight, x: newX, y: newY }
          : p
      ))
      return
    }

    // 이동 중
    if (draggingPhotoId) {
      const x = currentX - dragOffset.x
      const y = currentY - dragOffset.y

      setDecorationPhotos(decorationPhotos.map((photo) => 
        photo.id === draggingPhotoId ? { ...photo, x, y } : photo
      ))
    }
  }

  const handlePageMouseUp = () => {
    setDraggingPhotoId(null)
    setResizingPhotoId(null)
    setResizeHandle(null)
    setResizeStart(null)
  }

  const handlePhotoDoubleClick = (photoId: string) => {
    setDecorationPhotos(decorationPhotos.filter((photo) => photo.id !== photoId))
    if (selectedPhotoId === photoId) {
      setSelectedPhotoId(null)
    }
  }

  const handleRemoveUploadedPhoto = (photoId: string) => {
    setUploadedPhotos(uploadedPhotos.filter((photo) => photo.id !== photoId))
  }

  const handlePrint = () => {
    window.print()
  }

  const paragraphs = diaryText.split("\n\n").filter((p) => p.trim())

  return (
    <div className="w-full print:p-0 print:m-0">
      {/* Top Navigation Bar */}
      <div className="flex items-center gap-3 mb-6 print:hidden px-6 sticky top-0 z-50 py-3 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        {/* Left: Back Button - 고정 위치 */}
        <div className="absolute" style={{ left: '300px' }}>  {/* ← 이 숫자를 조절하세요 (기본 24px) */}
          <Button variant="outline" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
        </div>

        {/* Center: Text Formatting Controls */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm mx-auto">
          {/* Font Family Selector */}
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

          {/* Font Size Selector */}
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

          {/* Text Color Picker */}
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

          {/* Right: Print Button - 고정 위치 */}
            <div className="absolute" style={{ right: '300px' }}>  {/* ← 이 숫자를 조절하세요 (기본 24px) */}
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                인쇄
              </Button>
            </div>
          </div>

      {/* Main content layout - diary page and sidebar */}
      <div className="flex gap-8 items-start justify-center print:block print:m-0 print:p-0 px-6">
        {/* A4 Page Container */}
        <div className="flex-shrink-0 print:m-0">
          <div
            ref={pageRef}
            className="diary-page bg-[#fefdfb] shadow-2xl relative print:shadow-none"
            onMouseUp={handlePageMouseUp}
            onDrop={handlePageDrop}
            onDragOver={(e) => e.preventDefault()}
            onMouseMove={handlePageMouseMove}
            onClick={() => setSelectedPhotoId(null)}
            style={{
              width: "210mm",
              minHeight: "297mm",
              padding: "20mm",
              fontFamily: `'${fontFamily}', cursive`,
            }}
          >
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-gray-800 mb-2" style={{ fontFamily: `'${fontFamily}', cursive` }}>
                {title}
              </h1>
              <div className="flex items-center justify-center gap-2">
                <div className="h-px w-16 bg-gray-400"></div>
                <p className="text-xl text-gray-600">
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <div className="h-px w-16 bg-gray-400"></div>
              </div>
            </div>

            {/* Photos and Text Layout */}
            <div className="space-y-6">
              {photoSlots.map((slot, index) => {
                const isEven = index % 2 === 0
                const paragraph = paragraphs[index] || ""
                const location = slot.exifData?.location?.locationName
                
                const timestampDate = getDateFromTimestamp(slot.exifData?.timestamp)
                const time = timestampDate?.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })

                const imageUrl = getImageUrl(slot)

                return (
                  <div key={slot.id} className={`flex gap-4 items-start ${isEven ? "flex-row" : "flex-row-reverse"}`}>
                    {/* Photo */}
                    <div className="flex-shrink-0 relative">
                      <div
                        className="bg-white p-1.5 shadow-lg transform rotate-[-2deg] hover:rotate-0 transition-transform"
                        style={{
                          width: "60mm",
                          height: "80mm",
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt={`Travel moment ${index + 1}`}
                          className="w-full h-full object-cover"
                          style={{ aspectRatio: "3/4" }}
                        />
                      </div>

                      {/* Photo caption */}
                      <div className="mt-1 text-center">
                        {time && (
                          <p className="text-sm text-gray-700" style={{ fontFamily: `'${fontFamily}', cursive` }}>
                            {time}
                          </p>
                        )}
                        {location && (
                          <p
                            className="text-xs text-gray-600 flex items-center justify-center gap-1"
                            style={{ fontFamily: `'${fontFamily}', cursive` }}
                          >
                            <span>📍</span> {location}
                          </p>
                        )}
                      </div>

                      {/* Decorative doodles */}
                      {index === 0 && <div className="absolute -top-3 -right-3 text-2xl transform rotate-12">✨</div>}
                      {index === 1 && (
                        <div className="absolute -bottom-2 -left-2 text-2xl transform -rotate-12">🌸</div>
                      )}
                    </div>

                    {/* Text content */}
                    <div className="flex-1 pt-2">
                      <div className="space-y-2">
                        {/* Keywords as tags */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {slot.keywords.slice(0, 3).map((keyword, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-yellow-100 text-gray-700 text-sm rounded-full border border-yellow-300"
                              style={{ fontFamily: `'${fontFamily}', cursive` }}
                            >
                              #{keyword}
                            </span>
                          ))}
                        </div>

                        {/* Diary text */}
                        <p
                          className="leading-relaxed select-text cursor-text"
                          style={{
                            fontFamily: `'${fontFamily}', cursive`,
                            fontSize: `${fontSize}px`,
                            lineHeight: "1.7",
                            color: textColor,
                          }}
                        >
                          {paragraph}
                        </p>

                        {/* Decorative underline */}
                        <div className="mt-3">
                          <svg width="80" height="6" viewBox="0 0 100 8" className="opacity-40">
                            <path
                              d="M 0 4 Q 25 0, 50 4 T 100 4"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-gray-600"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer decoration */}
            <div className="mt-12 pt-6 border-t-2 border-dashed border-gray-300 text-center">
              <p className="text-2xl text-gray-600" style={{ fontFamily: `'${fontFamily}', cursive` }}>
                ✈️ 여행의 끝 ✈️
              </p>
            </div>

            {/* ✅ 데코레이션 이모지들 (파워포인트 스타일 크기 조절) */}
            {decorationPhotos.map((photo) => {
              const widthPx = photo.width * 3.78
              const heightPx = photo.height * 3.78
              const isSelected = selectedPhotoId === photo.id

              return (
                <div
                  key={photo.id}
                  className={`absolute cursor-move print:cursor-default transition-all ${
                    isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-blue-400'
                  }`}
                  style={{
                    left: `${photo.x}px`,
                    top: `${photo.y}px`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                  }}
                  onMouseDown={(e) => handlePhotoMouseDown(e, photo.id)}
                  onDoubleClick={() => handlePhotoDoubleClick(photo.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedPhotoId(photo.id)
                  }}
                  title="클릭으로 선택, 드래그로 이동, 더블클릭으로 삭제"
                >
                  <img
                    src={photo.src || "/placeholder.svg"}
                    alt="Decoration"
                    className="w-full h-full object-cover rounded pointer-events-none"
                  />
                  
                  {/* ✅ 크기 조절 핸들 (선택된 이모지에만 표시) */}
                  {isSelected && (
                    <>
                      {/* 모서리 핸들 */}
                      <div
                        className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize print:hidden"
                        onMouseDown={(e) => handleResizeMouseDown(e, photo.id, 'nw')}
                      />
                      <div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize print:hidden"
                        onMouseDown={(e) => handleResizeMouseDown(e, photo.id, 'ne')}
                      />
                      <div
                        className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize print:hidden"
                        onMouseDown={(e) => handleResizeMouseDown(e, photo.id, 'sw')}
                      />
                      <div
                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize print:hidden"
                        onMouseDown={(e) => handleResizeMouseDown(e, photo.id, 'se')}
                      />
                      
                      {/* 변 중앙 핸들 */}
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize print:hidden"
                        onMouseDown={(e) => handleResizeMouseDown(e, photo.id, 'n')}
                      />
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize print:hidden"
                        onMouseDown={(e) => handleResizeMouseDown(e, photo.id, 's')}
                      />
                      <div
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize print:hidden"
                        onMouseDown={(e) => handleResizeMouseDown(e, photo.id, 'w')}
                      />
                      <div
                        className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize print:hidden"
                        onMouseDown={(e) => handleResizeMouseDown(e, photo.id, 'e')}
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar for uploaded photos */}
        <div className="flex-shrink-0 w-40 bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:hidden sticky top-4">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-sm text-gray-800">이모지 추가</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">일기에 드래그하세요</p>

          {/* Upload button */}
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

          {/* Uploaded photos grid */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {uploadedPhotos.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">이모지 없음</p>
              </div>
            ) : (
              uploadedPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div
                    draggable
                    onDragStart={() => handlePhotoDragStart(photo.src)}
                    className="cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-blue-400 transition-all rounded overflow-hidden"
                  >
                    <img src={photo.src || "/placeholder.svg"} alt="Upload" className="w-full h-20 object-cover" />
                  </div>
                  <button
                    onClick={() => handleRemoveUploadedPhoto(photo.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="삭제"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">💡 드래그로 추가</p>
            <p className="text-xs text-gray-500 mt-1">💡 클릭 후 핸들로 크기 조절</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Patrick+Hand&family=Indie+Flower&family=Nanum+Pen+Script&display=swap');
        
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
          
          body {
            margin: 0;
            padding: 0;
          }
          
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
        
        .diary-page {
          background-image: 
            repeating-linear-gradient(
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
