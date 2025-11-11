"use client"

import type React from "react"
import { getKoreanAddress } from "@/lib/diary/utils"
import { useState, useRef, useCallback } from "react"
import { X, Upload, Camera, Loader2, Sparkles, MapPin, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { uploadImage, getUserId } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

// EXIF.js 라이브러리 타입 선언
declare global {
  interface Window {
    EXIF: any
  }
}

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (photo: string, keywords: string[], exifData?: ExifData, imageId?: string) => void
  existingPhoto?: string
  existingKeywords?: string[]
  existingExifData?: ExifData
}

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

// AI 분석 실패 시 대체 키워드
const fallbackKeywords = [
  "Transportation",
  "Cafe",
  "Wildlife",
  "Art",
  "History",
  "Architecture",
  "Food",
  "Nature",
  "Culture",
  "Adventure",
]

export function PhotoUploadModal({
  isOpen,
  onClose,
  onSave,
  existingPhoto,
  existingKeywords = [],
  existingExifData,
}: PhotoUploadModalProps) {
  const [photo, setPhoto] = useState<string | null>(existingPhoto || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(existingKeywords)
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>(
    existingKeywords && existingKeywords.length > 0 ? existingKeywords : fallbackKeywords
  )
  const [customKeyword, setCustomKeyword] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [exifData, setExifData] = useState<ExifData | undefined>(existingExifData)
  const [isExtractingExif, setIsExtractingExif] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // EXIF 메타데이터 추출 (촬영 시간, GPS, 카메라 정보)
  const extractExifData = useCallback((file: File): Promise<ExifData> => {
    return new Promise((resolve) => {
      setIsExtractingExif(true)

      // EXIF.js 라이브러리 동적 로드
      if (!window.EXIF) {
        const script = document.createElement("script")
        script.src = "https://cdn.jsdelivr.net/npm/exif-js@2.3.0/exif.js"
        script.onload = () => processExif(file, resolve)
        document.head.appendChild(script)
      } else {
        processExif(file, resolve)
      }
    })
  }, [])

  const processExif = async (file: File, resolve: (data: ExifData) => void) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        window.EXIF.getData(img, () => {
          const exifData: ExifData = {}

          // 촬영 시간 추출
          const dateTime = window.EXIF.getTag(img, "DateTime") || window.EXIF.getTag(img, "DateTimeOriginal")
          if (dateTime) {
            const [datePart, timePart] = dateTime.split(" ")
            const [year, month, day] = datePart.split(":")
            const [hour, minute, second] = timePart.split(":")
            exifData.timestamp = new Date(year, month - 1, day, hour, minute, second)
          }

          // GPS 좌표 추출
          const lat = window.EXIF.getTag(img, "GPSLatitude")
          const latRef = window.EXIF.getTag(img, "GPSLatitudeRef")
          const lon = window.EXIF.getTag(img, "GPSLongitude")
          const lonRef = window.EXIF.getTag(img, "GPSLongitudeRef")

          if (lat && lon) {
            const latitude = convertDMSToDD(lat, latRef)
            const longitude = convertDMSToDD(lon, lonRef)
            exifData.location = { latitude, longitude }

            reverseGeocode(latitude, longitude)
              .then((locationName) => {
                if (locationName) {
                  exifData.location!.locationName = locationName
                  setExifData({ ...exifData })
                }
              })
              .catch((e) => {
                console.error("Reverse geocoding error:", e)
              })
          }

          // 카메라 정보 추출
          const make = window.EXIF.getTag(img, "Make")
          const model = window.EXIF.getTag(img, "Model")
          const fNumber = window.EXIF.getTag(img, "FNumber")
          const exposureTime = window.EXIF.getTag(img, "ExposureTime")
          const iso = window.EXIF.getTag(img, "ISOSpeedRatings")

          if (make || model || fNumber || exposureTime || iso) {
            exifData.camera = {
              make,
              model,
              settings: [fNumber && `f/${fNumber}`, exposureTime && `${exposureTime}s`, iso && `ISO ${iso}`]
                .filter(Boolean)
                .join(" • "),
            }
          }

          setIsExtractingExif(false)
          resolve(exifData)
        })
      }
    }

    reader.readAsDataURL(file)
  }

  // GPS 좌표 변환 (DMS → DD)
  const convertDMSToDD = (dms: number[], ref: string): number => {
    let dd = dms[0] + dms[1] / 60 + dms[2] / 3600
    if (ref === "S" || ref === "W") dd = dd * -1
    return dd
  }

  // 위도/경도 → 도시/국가 이름 변환
  const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
    console.log("📍 Reverse Geocode Input:", { lat, lon })
    const address = await getKoreanAddress(lat, lon)
    console.log("📍 Kakao API Returned:", address)
    return address || null
  }

  // ✅ AI 이미지 분석으로 키워드 추천 (useCallback 추가)
  const analyzeImage = useCallback(async (imageData: string) => {
    setIsAnalyzing(true)
    try {
      console.log("📤 AI 분석 요청 시작")
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData }),
      })

      console.log("📥 응답 상태:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ API 오류:", errorData)
        setSuggestedKeywords(fallbackKeywords)
        setIsAnalyzing(false)
        return
      }

      const result = await response.json()
      console.log("✅ AI 분석 결과:", result)
      console.log("✅ 키워드 배열:", result.keywords)

      // ✅ 키워드가 있으면 업데이트, 없으면 fallback
      if (result.keywords && Array.isArray(result.keywords) && result.keywords.length > 0) {
        console.log("🎯 AI 키워드 적용됨:", result.keywords)
        setSuggestedKeywords(result.keywords)
        // ✅ 자동 선택 제거 - 사용자가 직접 선택하게 함
      } else {
        console.warn("⚠️ 키워드가 없음, fallback 사용")
        setSuggestedKeywords(fallbackKeywords)
      }
    } catch (error) {
      console.error("❌ Error analyzing image:", error)
      setSuggestedKeywords(fallbackKeywords)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  // ✅ 파일 선택 시 이미지 읽기 + EXIF 추출 + AI 분석 (순차 실행)
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (file && file.type.startsWith("image/")) {
        setSelectedFile(file)
        const reader = new FileReader()
        reader.onload = async (e) => {
          const imageData = e.target?.result as string
          setPhoto(imageData)

          // ✅ 순차적으로 실행 (EXIF 먼저, 그 다음 AI 분석)
          const extractedExifData = await extractExifData(file)
          setExifData(extractedExifData)

          // ✅ AI 분석이 완료될 때까지 대기
          await analyzeImage(imageData)
        }
        reader.readAsDataURL(file)
      }
    },
    [extractExifData, analyzeImage],
  )

  // 드래그 앤 드롭 핸들러
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files[0]) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords((prev) => (prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword]))
  }

  const addCustomKeyword = () => {
    if (customKeyword.trim() && !selectedKeywords.includes(customKeyword.trim())) {
      setSelectedKeywords((prev) => [...prev, customKeyword.trim()])
      setCustomKeyword("")
    }
  }

  const handleSave = async () => {
    if (!photo) return

    // ✅ 새로운 이미지인 경우 백엔드에 업로드
    if (selectedFile) {
      setIsUploading(true)

      const userId = getUserId()
      if (!userId) {
        toast({
          title: "로그인 필요",
          description: "이미지를 업로드하려면 로그인이 필요합니다.",
          variant: "destructive",
        })
        setIsUploading(false)
        return
      }

      try {
        const tempSlotId = Date.now().toString()
        const response = await uploadImage({
          userId,
          image: selectedFile,
          keywords: selectedKeywords,
          tempSlotId,
        })

        if (response.success && response.data) {
          const imageData = response.data.imageData
          const mimeType = response.data.mimeType || "image/jpeg"
          const fullImageUrl = `data:${mimeType};base64,${imageData}`

          onSave(fullImageUrl, selectedKeywords, exifData, response.data.imageId)

          toast({
            title: "업로드 성공",
            description: "이미지가 성공적으로 업로드되었습니다.",
          })
        } else {
          toast({
            title: "업로드 실패",
            description: response.error || "이미지 업로드에 실패했습니다.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Upload error:", error)
        toast({
          title: "업로드 오류",
          description: "이미지 업로드 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    } else {
      // 기존 이미지 수정인 경우
      onSave(photo, selectedKeywords, exifData)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Add Photo</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 사진 업로드 영역 */}
          <div className="mb-6">
            {!photo ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium mb-2">Drop your photo here or click to browse</p>
                <p className="text-sm text-muted-foreground mb-4">Supports JPG, PNG, GIF up to 10MB</p>
                <Button onClick={() => fileInputRef.current?.click()} className="bg-primary hover:bg-primary/90">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={photo || "/placeholder.svg"}
                  alt="Uploaded photo"
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={() => setPhoto(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* EXIF 메타데이터 표시 */}
          {photo && exifData && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center">
                Photo Information
                {isExtractingExif && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground ml-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Extracting metadata...</span>
                  </div>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exifData.timestamp && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {exifData.timestamp.toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {exifData.location && (
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {exifData.location.locationName ||
                        `${exifData.location.latitude.toFixed(4)}°, ${exifData.location.longitude.toFixed(4)}°`}
                    </span>
                  </div>
                )}
                {exifData.camera?.make && exifData.camera?.model && (
                  <div className="flex items-center space-x-2 text-sm col-span-full">
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {exifData.camera.make} {exifData.camera.model}
                      {exifData.camera.settings && ` • ${exifData.camera.settings}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI 추천 키워드 */}
          {photo && (
            <>
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <h3 className="text-sm font-medium text-foreground">Suggested Keywords</h3>
                  {isAnalyzing && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>AI analyzing...</span>
                    </div>
                  )}
                  {!isAnalyzing && suggestedKeywords !== fallbackKeywords && (
                    <div className="flex items-center space-x-1 text-xs text-primary">
                      <Sparkles className="w-3 h-3" />
                      <span>AI suggested</span>
                    </div>
                  )}
                  {!selectedFile && existingKeywords && existingKeywords.length > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-blue-500">
                      <span>Previously used keywords</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedKeywords.map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => toggleKeyword(keyword)}
                      disabled={isAnalyzing}
                      className={`px-3 py-1 rounded-full text-sm transition-colors disabled:opacity-50 ${
                        selectedKeywords.includes(keyword)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      #{keyword}
                    </button>
                  ))}
                </div>
              </div>

              {/* 커스텀 키워드 추가 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-foreground mb-3">Add Custom Keyword</h3>
                <div className="flex space-x-2">
                  <Input
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    placeholder="Enter custom keyword"
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addCustomKeyword()
                      }
                    }}
                  />
                  <Button onClick={addCustomKeyword} variant="outline">
                    Add
                  </Button>
                </div>
              </div>

              {/* 선택된 키워드 목록 */}
              {selectedKeywords.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Selected Keywords ({selectedKeywords.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm flex items-center space-x-1"
                      >
                        <span>#{keyword}</span>
                        <button
                          onClick={() => toggleKeyword(keyword)}
                          className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 저장/취소 버튼 */}
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={onClose} disabled={isUploading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                  disabled={isAnalyzing || isExtractingExif || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : isAnalyzing || isExtractingExif ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isExtractingExif ? "Processing..." : "Analyzing..."}
                    </>
                  ) : (
                    "Save Photo"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}