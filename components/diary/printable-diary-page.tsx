"use client"

import { useRef, useState } from "react"
import { Printer, Download } from "lucide-react"
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

  const [fontSize, setFontSize] = useState(18)
  const [defaultTextColor, setDefaultTextColor] = useState("#1f2937")
  const [fontFamily, setFontFamily] = useState("Caveat")

  // 2. 간단한 window.print() 함수를 생성합니다. (일반 인쇄용)
  const handlePrint = () => {
    window.print();
  }

  // 3. pageRef 영역만 PDF로 저장하는 함수를 생성합니다.
 

  const paragraphs = diaryText.split("\n\n").filter((p) => p.trim())

  return (
    <div className="w-full">
      <div className="flex justify-between items-center gap-3 mb-6 print:hidden">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
          {/* 폰트 선택 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">폰트:</label>
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
            </select>
          </div>

          {/* 폰트 크기 */}
          <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
            <label className="text-sm text-gray-600 whitespace-nowrap">크기:</label>
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

          {/* 전체 텍스트 색상 */}
          <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
            <label className="text-sm text-gray-600 whitespace-nowrap">전체:</label>
            <input
              type="color"
              value={defaultTextColor}
              onChange={(e) => setDefaultTextColor(e.target.value)}
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer flex-shrink-0"
            />
          </div>
        </div>

        {/* 4. '인쇄'와 'PDF 다운로드' 버튼 2개로 분리했습니다. */}
        <div className="flex gap-3">
           <Button onClick={handlePrint} variant="outline">
             <Printer className="w-4 h-4 mr-2" />
             인쇄
           </Button>
        </div>
      </div>

      {/* A4 Page Container */}
      <div
        ref={pageRef}
        id="diary-page-to-print" // ID 추가
        className="diary-page mx-auto bg-[#fefdfb] shadow-2xl"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm",
          fontFamily: `'${fontFamily}', cursive`,
        }}
      >
        {/* ... (이하 내용은 수정할 필요 없습니다) ... */}
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2" style={{ fontFamily: `'${fontFamily}', cursive` }}>
            {title}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-16 bg-gray-400"></div>
            <p className="text-xl text-gray-600">
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <div className="h-px w-16 bg-gray-400"></div>
          </div>
        </div>

        {/* 일기 콘텐츠 영역 */}
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
                      width: "60mm",
                      height: "80mm",
                    }}
                  >
                    <img
                      src={slot.photo || "/placeholder.svg"}
                      alt={`Travel moment ${index + 1}`}
                      className="w-full h-full object-cover"
                      style={{ aspectRatio: "3/4" }}
                    />
                  </div>

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

                  {index === 0 && <div className="absolute -top-3 -right-3 text-2xl transform rotate-12">✨</div>}
                  {index === 1 && <div className="absolute -bottom-2 -left-2 text-2xl transform -rotate-12">🌸</div>}
                </div>

                {/* Text content */}
                <div className="flex-1 pt-2">
                  <div className="space-y-2">
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

                    <div
                      contentEditable
                      suppressContentEditableWarning
                      className="leading-relaxed outline-none focus:ring-2 focus:ring-blue-200 rounded p-2"
                      style={{
                        fontFamily: `'${fontFamily}', cursive`,
                        fontSize: `${fontSize}px`,
                        lineHeight: "1.7",
                        color: defaultTextColor,
                      }}
                      dangerouslySetInnerHTML={{ __html: paragraph }}
                    />

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

        <div className="mt-12 pt-6 border-t-2 border-dashed border-gray-300 text-center">
          <p className="text-2xl text-gray-600" style={{ fontFamily: `'${fontFamily}', cursive` }}>
            ✈️ 여행의 끝 ✈️
          </p>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Patrick+Hand&family=Indie+Flower&family=Nanum+Pen+Script&display=swap');
        
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

        // 5. window.print() 시 A4 영역만 인쇄되도록 CSS를 추가합니다.
        @media print {
          body * {
            visibility: hidden;
          }
          #diary-page-to-print, #diary-page-to-print * {
            visibility: visible;
          }
          #diary-page-to-print {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 20mm; /* 패딩 유지 */
            width: 210mm;
            min-height: 297mm;
            box-shadow: none !important;
          }
          .print\:hidden {
            display: none;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  )
}