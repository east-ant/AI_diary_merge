import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface PhotoSlot {
  id: string
  photo?: string
  keywords: string[]
  timeSlot: "morning" | "midday" | "afternoon" | "evening"
  timestamp: number
}

export async function POST(request: NextRequest) {
  try {
    const { photoSlots }: { photoSlots: PhotoSlot[] } = await request.json()

    if (!photoSlots || photoSlots.length === 0) {
      return NextResponse.json({ error: "No photo data provided" }, { status: 400 })
    }

    // Create a structured prompt from the photo data
    const photoDescriptions = photoSlots
      .map((slot, index) => {
        const timeSlot = slot.timeSlot.charAt(0).toUpperCase() + slot.timeSlot.slice(1)
        const keywords = slot.keywords.join(", ")
        return `${timeSlot} (Photo ${index + 1}): ${keywords}`
      })
      .join("\n")

    const prompt = `Create a compelling travel diary entry based on these photos and their associated keywords. Write in first person as if the traveler is reflecting on their day. Make it engaging, descriptive, and personal.

Photo timeline and keywords:
${photoDescriptions}

Write a cohesive travel diary that:
- Flows naturally from morning to evening
- Incorporates all the keywords meaningfully
- Tells a story of discovery and experience
- Includes sensory details and emotions
- Is approximately 300-500 words
- Feels authentic and personal

Travel Diary Entry:`

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxTokens: 800,
    })

    return NextResponse.json({
      diary: result.text,
    })
  } catch (error) {
    console.error("Error generating diary:", error)
    return NextResponse.json({ error: "Failed to generate diary" }, { status: 500 })
  }
}
