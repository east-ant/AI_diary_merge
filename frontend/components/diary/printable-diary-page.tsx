"use client"

import type React from "react"
import { useRef, useState } from "react"
import { ImageIcon, Upload, X, Printer, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getKoreanAddress } from "@/lib/diary/utils" 

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

interface PrintableDiaryPageProps {
  photoSlots: PhotoSlot[]
  diaryText: string
  title: string
}

export function PrintableDiaryPage({ photoSlots, diaryText, title }: PrintableDiaryPageProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fontSize, setFontSize] = useState(18)
  const [textColor, setTextColor] = useState("#1f2937")
  const [fontFamily, setFontFamily] = useState("Caveat")
  const [hasSelection, setHasSelection] = useState(false)

  const [decorationPhotos, setDecorationPhotos] = useState<
    Array<{ id: string; src: string; x: number; y: number; width: number; height: number }>
  >([])
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ id: string; src: string }>>([
    { id: 'default-1', src: '/emotion/book.png' },
  ])
  const [draggedPhotoSrc, setDraggedPhotoSrc] = useState<string | null>(null)
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

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

    // Reset input
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

    // Calculate position relative to the page, centered under cursor
    // Convert mm to pixels for positioning (assuming 96 DPI: 1mm ≈ 3.78px)
    const defaultWidthPx = 20 * 3.78  // 80mm in pixels
    const defaultHeightPx = 20 * 3.78 // 80mm in pixels

    // Center the photo under the cursor
    const x = e.clientX - rect.left - defaultWidthPx / 2
    const y = e.clientY - rect.top - defaultHeightPx / 2

    setDecorationPhotos([
      ...decorationPhotos,
      {
        id: `photo-${Date.now()}`,
        src: draggedPhotoSrc,
        x,
        y,
        width: 20, // Default width in mm
        height: 20, // Default height in mm
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
    // Calculate offset from cursor to photo's top-left corner
    setDragOffset({
      x: e.clientX - rect.left - photo.x,
      y: e.clientY - rect.top - photo.y,
    })
  }

  const handlePageMouseMove = (e: React.MouseEvent) => {
    if (!draggingPhotoId || !pageRef.current) return

    const rect = pageRef.current.getBoundingClientRect()

    // Calculate new position accounting for the drag offset
    const x = e.clientX - rect.left - dragOffset.x
    const y = e.clientY - rect.top - dragOffset.y

    setDecorationPhotos(decorationPhotos.map((photo) => (photo.id === draggingPhotoId ? { ...photo, x, y } : photo)))
  }

  const handlePageMouseUp = () => {
    setDraggingPhotoId(null)
  }

  const handlePhotoDoubleClick = (photoId: string) => {
    setDecorationPhotos(decorationPhotos.filter((photo) => photo.id !== photoId))
  }

  const handleRemoveUploadedPhoto = (photoId: string) => {
    setUploadedPhotos(uploadedPhotos.filter((photo) => photo.id !== photoId))
  }

  const applyColorToSelection = (color: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (range.collapsed) return // No text selected

    // Create a span with the color
    const span = document.createElement("span")
    span.style.color = color

    try {
      // Wrap the selected content in the span
      const contents = range.extractContents()
      span.appendChild(contents)
      range.insertNode(span)

      // Clear selection
      selection.removeAllRanges()
    } catch (error) {
      console.error("Error applying color:", error)
    }
  }

  const handleSelectionChange = () => {
    const selection = window.getSelection()
    const hasText = selection && selection.toString().length > 0
    setHasSelection(!!hasText)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default

    const element = pageRef.current
    if (!element) return

    const opt: any = {
      margin: 0,
      filename: `travel-diary-${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }

    html2pdf().set(opt).from(element).save()
  }

  // Split diary text into paragraphs
  const paragraphs = diaryText.split("\n\n").filter((p) => p.trim())

  return (
    <div className="w-full print:p-0 print:m-0">
      {/* Action buttons - hidden when printing */}
      <div className="flex justify-between items-center gap-3 mb-6 print:hidden">
        {/* Text Formatting Controls */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          {/* Font Family Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">폰트:</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Caveat">Caveat (손글씨)</option>
              <option value="Patrick Hand">Patrick Hand</option>
              <option value="Indie Flower">Indie Flower</option>
              <option value="Nanum Pen Script">나눔손글씨</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Cafe24Shiningstar">별이빛나는밤</option>
              <option value="인천교육자람">인천교육자람</option>
              <option value="memomentKkukkkuk">메모먼트 꾹꾹체</option>
              <option value="온글잎 의연체">온잎글 의연체</option>
              <option value="PretendardVariable">프리텐다드</option>

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
            <label className="text-sm text-gray-600">{hasSelection ? "선택한 텍스트 색상:" : "전체 색상:"}</label>
            <input
              type="color"
              value={textColor}
              onChange={(e) => {
                const newColor = e.target.value
                setTextColor(newColor)
                if (hasSelection) {
                  applyColorToSelection(newColor)
                }
              }}
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
            />
            {hasSelection && <span className="text-xs text-blue-600 font-medium">텍스트 선택됨</span>}
          </div>
        </div>

        {/* Print and Download Buttons */}
        <div className="flex gap-3">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            인쇄
          </Button>
          <Button onClick={handleDownloadPDF} className="bg-primary hover:bg-primary/90">
            <Download className="w-4 h-4 mr-2" />
            PDF 다운로드
          </Button>
        </div>
      </div>

      {/* Main content layout - diary page and sidebar */}
      <div className="flex gap-8 items-start justify-center print:block print:m-0 print:p-0">
        {/* A4 Page Container */}
        <div className="flex-shrink-0 print:m-0">
          <div
            ref={pageRef}
            className="diary-page bg-[#fefdfb] shadow-2xl relative print:shadow-none"
            onMouseUp={(e) => {
              handleSelectionChange()
              handlePageMouseUp()
            }}
            onDrop={handlePageDrop}
            onDragOver={(e) => e.preventDefault()}
            onMouseMove={handlePageMouseMove}

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
                const time = slot.exifData?.timestamp?.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })

                return (
                  <div key={slot.id} className={`flex gap-4 items-start ${isEven ? "flex-row" : "flex-row-reverse"}`}>
                    {/* Photo */}
                    <div className="flex-shrink-0 relative">
                      <div
                        className="bg-white p-1.5 shadow-lg transform rotate-[-2deg] hover:rotate-0 transition-transform"
                        style={{
                          width: "60mm", // 변경된 사진 가로 크기
                          height: "80mm", // 변경된 사진 세로 크기 (3:4 비율 유지)
                        }}
                      >
                        <img
                          src={slot.photo || "/placeholder.svg"}
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

            {decorationPhotos.map((photo) => {
              // Convert mm to pixels for display (1mm ≈ 3.78px at 96 DPI)
              const widthPx = photo.width * 3.78
              const heightPx = photo.height * 3.78

              return (
                <div
                  key={photo.id}
                  className="absolute cursor-move print:cursor-default hover:ring-2 hover:ring-blue-400 transition-all"
                  style={{
                    left: `${photo.x}px`,
                    top: `${photo.y}px`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                  }}
                  onMouseDown={(e) => handlePhotoMouseDown(e, photo.id)}
                  onDoubleClick={() => handlePhotoDoubleClick(photo.id)}
                  title="드래그로 이동, 더블클릭으로 삭제"
                >
                  <img
                    src={photo.src || "/placeholder.svg"}
                    alt="Decoration"
                    className="w-full h-full object-cover rounded shadow-lg pointer-events-none"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar for uploaded photos */}
        <div className="flex-shrink-0 w-40 bg-white border border-gray-200 rounded-lg p-3 shadow-sm print:hidden sticky top-4">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-sm text-gray-800">사진 추가</h3>
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
                <p className="text-xs">사진 없음</p>
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