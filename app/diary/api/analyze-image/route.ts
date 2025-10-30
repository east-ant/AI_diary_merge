import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json()

    if (!imageData) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 })
    }

    // Use AI to analyze the image and generate keywords
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this travel photo and suggest 8-12 relevant keywords that describe what you see. Focus on: activities, locations, objects, food, transportation, architecture, nature, culture, and experiences. Return keywords that would be useful for organizing a travel diary.

Return your response as a JSON object with this exact structure:
{
  "keywords": ["keyword1", "keyword2", ...],
  "confidence": 0.95
}

Only return the JSON object, no additional text.`,
            },
            {
              type: "image",
              image: imageData,
            },
          ],
        },
      ],
      maxTokens: 500,
    })

    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from response")
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      keywords: parsed.keywords || [],
      confidence: parsed.confidence || 0.8,
    })
  } catch (error) {
    console.error("Error analyzing image:", error)
    return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 })
  }
}
