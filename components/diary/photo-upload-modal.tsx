"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { X, Upload, Camera, Loader2, Sparkles, MapPin, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

declare global {
  interface Window {
    EXIF: any
  }
}

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (photo: string, keywords: string[], exifData?: ExifData) => void
  existingPhoto?: string
  existingKeywords?: string[]
  existingExifData?: ExifData
}

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
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(existingKeywords)
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>(fallbackKeywords)
  const [customKeyword, setCustomKeyword] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [exifData, setExifData] = useState<ExifData | undefined>(existingExifData)
  const [isExtractingExif, setIsExtractingExif] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const extractExifData = useCallback((file: File): Promise<ExifData> => {
    return new Promise((resolve) => {
      setIsExtractingExif(true)

      // Load EXIF.js dynamically
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

  const processExif = (file: File, resolve: (data: ExifData) => void) => {
    window.EXIF.getData(file, function () {
      const exifData: ExifData = {}

      // Extract timestamp
      const dateTime = window.EXIF.getTag(this, "DateTime") || window.EXIF.getTag(this, "DateTimeOriginal")
      if (dateTime) {
        // Convert EXIF date format (YYYY:MM:DD HH:MM:SS) to Date
        const [datePart, timePart] = dateTime.split(" ")
        const [year, month, day] = datePart.split(":")
        const [hour, minute, second] = timePart.split(":")
        exifData.timestamp = new Date(year, month - 1, day, hour, minute, second)
      }

      // Extract GPS coordinates
      const lat = window.EXIF.getTag(this, "GPSLatitude")
      const latRef = window.EXIF.getTag(this, "GPSLatitudeRef")
      const lon = window.EXIF.getTag(this, "GPSLongitude")
      const lonRef = window.EXIF.getTag(this, "GPSLongitudeRef")

      if (lat && lon) {
        const latitude = convertDMSToDD(lat, latRef)
        const longitude = convertDMSToDD(lon, lonRef)
        exifData.location = { latitude, longitude }

        // Attempt reverse geocoding for location name
        reverseGeocode(latitude, longitude).then((locationName) => {
          if (locationName) {
            exifData.location!.locationName = locationName
          }
        })
      }

      // Extract camera info
      const make = window.EXIF.getTag(this, "Make")
      const model = window.EXIF.getTag(this, "Model")
      const fNumber = window.EXIF.getTag(this, "FNumber")
      const exposureTime = window.EXIF.getTag(this, "ExposureTime")
      const iso = window.EXIF.getTag(this, "ISOSpeedRatings")

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

  const convertDMSToDD = (dms: number[], ref: string): number => {
    let dd = dms[0] + dms[1] / 60 + dms[2] / 3600
    if (ref === "S" || ref === "W") dd = dd * -1
    return dd
  }

  const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
    try {
      // Using a simple reverse geocoding service (you might want to use a more robust solution)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      )
      const data = await response.json()
      return data.city && data.countryName ? `${data.city}, ${data.countryName}` : null
    } catch (error) {
      console.error("Reverse geocoding failed:", error)
      return null
    }
  }

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData }),
      })

      if (response.ok) {
        const result = await response.json()
        setSuggestedKeywords(result.keywords || fallbackKeywords)
      } else {
        console.error("Failed to analyze image")
        setSuggestedKeywords(fallbackKeywords)
      }
    } catch (error) {
      console.error("Error analyzing image:", error)
      setSuggestedKeywords(fallbackKeywords)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const imageData = e.target?.result as string
          setPhoto(imageData)

          const [extractedExifData] = await Promise.all([extractExifData(file), analyzeImage(imageData)])

          setExifData(extractedExifData)
        }
        reader.readAsDataURL(file)
      }
    },
    [extractExifData],
  )

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

  const handleSave = () => {
    if (photo) {
      onSave(photo, selectedKeywords, exifData)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Add Photo</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Photo Upload Area */}
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
                    <span className="text-foreground">{exifData.timestamp.toLocaleString()}</span>
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

          {/* Keywords Section */}
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                  disabled={isAnalyzing || isExtractingExif}
                >
                  {isAnalyzing || isExtractingExif ? (
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
