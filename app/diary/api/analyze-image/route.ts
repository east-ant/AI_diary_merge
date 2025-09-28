import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

const keywordSchema = z.object({
  keywords: z.array(z.string()).describe("Array of relevant keywords for the travel photo"),
  confidence: z.number().min(0).max(1).describe("Confidence score for the analysis"),
})

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json()

    if (!imageData) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 })
    }

    // Use AI to analyze the image and generate keywords
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this travel photo and suggest 8-12 relevant keywords that describe what you see. Focus on: activities, locations, objects, food, transportation, architecture, nature, culture, and experiences. Return keywords that would be useful for organizing a travel diary.",
            },
            {
              type: "image",
              image: imageData,
            },
          ],
        },
      ],
      schema: keywordSchema,
    })

    return NextResponse.json({
      keywords: result.object.keywords,
      confidence: result.object.confidence,
    })
  } catch (error) {
    console.error("Error analyzing image:", error)
    return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 })
  }
}
