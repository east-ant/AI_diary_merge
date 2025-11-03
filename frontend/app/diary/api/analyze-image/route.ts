import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json()

    if (!imageData) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 })
    }

    // AI가 이미지를 분석해 여행 관련 키워드를 한국어로 생성
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
You are analyzing a travel-related image.  
Your task is to carefully examine the image and generate **8–12 short Korean keywords** that describe what you see.

Focus on the following aspects:
- Activities or actions
- Locations or landmarks
- Objects and items
- Food or drink
- Transportation
- Architecture or structures
- Nature and scenery
- Culture or traditions
- Atmosphere or emotions

### Output format:
Return **only** a valid JSON object in this format:
{
  "keywords": ["키워드1", "키워드2", ...],
  "confidence": 0.95
}

### Requirements:
- All keywords **must be written in Korean** (short nouns or noun phrases, e.g. “비행기”, “파란 하늘”, “바닷가 산책”).
- Do **not** include any explanations, comments, or text outside the JSON.
- Do not translate the prompt itself, only the output keywords.
              `,
            },
            {
              type: "image",
              image: imageData,
            },
          ],
        },
      ],
      maxTokens: 200,
    })

    // JSON 파싱
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
