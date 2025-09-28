"use client"

import { useState } from "react"
import { ArrowLeft, Download, Share2, Loader2, FileText, Clock, MapPin, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

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

interface DiaryPreviewProps {
  photoSlots: PhotoSlot[]
  onBack: () => void
}

export function DiaryPreview({ photoSlots, onBack }: DiaryPreviewProps) {
  const [generatedDiary, setGeneratedDiary] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)

  const generateDiary = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-diary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoSlots }),
      })

      if (response.ok) {
        const result = await response.json()
        setGeneratedDiary(result.diary)
      } else {
        console.error("Failed to generate diary")
      }
    } catch (error) {
      console.error("Error generating diary:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadDiary = () => {
    const element = document.createElement("a")
    const file = new Blob([generatedDiary], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `travel-diary-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Timeline
          </Button>
          <h2 className="text-xl font-semibold text-foreground">Review & Generate</h2>
        </div>

        <div className="flex space-x-3">
          {generatedDiary && (
            <>
              <Button variant="outline" onClick={downloadDiary}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Photo Review */}
        <div>
          <h3 className="text-lg font-medium text-foreground mb-4">Your Photos</h3>
          <div className="space-y-4">
            {photoSlots.map((slot, index) => (
              <Card key={slot.id} className="p-4 bg-card border-border">
                <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                  <img
                    src={slot.photo || "/placeholder.svg"}
                    alt={`Travel photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2">
                  {/* EXIF metadata */}
                  {slot.exifData && (
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {slot.exifData.timestamp && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{slot.exifData.timestamp.toLocaleString()}</span>
                        </div>
                      )}
                      {slot.exifData.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {slot.exifData.location.locationName ||
                              `${slot.exifData.location.latitude.toFixed(4)}°, ${slot.exifData.location.longitude.toFixed(4)}°`}
                          </span>
                        </div>
                      )}
                      {slot.exifData.camera?.make && slot.exifData.camera?.model && (
                        <div className="flex items-center space-x-1">
                          <Camera className="w-3 h-3" />
                          <span>
                            {slot.exifData.camera.make} {slot.exifData.camera.model}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1">
                    {slot.keywords.map((keyword, idx) => (
                      <span key={idx} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md">
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Generated Diary */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">Generated Diary</h3>
            {!generatedDiary && (
              <Button onClick={generateDiary} disabled={isGenerating} className="bg-primary hover:bg-primary/90">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Diary
                  </>
                )}
              </Button>
            )}
          </div>

          <Card className="p-4 bg-card border-border">
            {generatedDiary ? (
              <Textarea
                value={generatedDiary}
                onChange={(e) => setGeneratedDiary(e.target.value)}
                className="min-h-[400px] resize-none border-0 p-0 focus-visible:ring-0"
                placeholder="Your generated travel diary will appear here..."
              />
            ) : (
              <div className="min-h-[400px] flex items-center justify-center text-center">
                <div>
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Ready to generate your travel diary?</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Generate Diary" to create a comprehensive story from your photos and keywords.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
