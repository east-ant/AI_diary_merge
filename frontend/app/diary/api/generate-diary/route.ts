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

    const numberOfPhotos = photoSlots.length

    // 1. 사진 정보를 하나의 문자열로 만듦
    const photoDescriptions = photoSlots
      .map((slot, index) => {
        const timeSlot = slot.timeSlot.charAt(0).toUpperCase() + slot.timeSlot.slice(1)
        const keywords = slot.keywords.join(", ")
        // 각 사진에 번호를 매겨서 AI가 인식하기 쉽게 함
        return `Photo ${index + 1} (${timeSlot}): ${keywords}`
      })
      .join("\n")

    // 2. (수정) 프롬프트: 문단 분리와 내용 연결을 동시에 지시
    const prompt = `
You are a happy and excited traveler writing in your personal diary.
Based on the following photo timeline, write a single, cohesive diary entry in Korean (한국어로 작성).

Photo Timeline:
${photoDescriptions}

*** CRITICAL INSTRUCTIONS (매우 중요): ***
1.  You MUST write exactly ${numberOfPhotos} paragraphs. (반드시 ${numberOfPhotos}개의 문단으로 작성)
2.  Each paragraph MUST correspond to one photo in order. (첫 번째 문단은 Photo 1, 두 번째 문단은 Photo 2...)
3.  Each paragraph MUST be separated by a double newline ("\\n\\n"). (각 문단은 반드시 줄바꿈 2번(\\n\\n)으로 구분)
4.  The paragraphs MUST flow naturally from one to the next, telling a continuous story of the day. (문단이 뚝 끊기지 않고, 하루의 이야기가 자연스럽게 이어져야 함)
5.  Weave all keywords for each photo into its corresponding paragraph.
6.  The tone must be cheerful, personal, and descriptive (행복하고, 개인적이며, 신나는 말투).
7.  Output ONLY the Korean diary text, nothing else.

Diary Entry (${numberOfPhotos} paragraphs, separated by "\\n\\n"):
`

    // 3. AI를 딱 한 번만 호출
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      // maxTokens를 사진 개수에 비례하여 넉넉하게 설정
      maxTokens: 150 * numberOfPhotos, 
    })

    return NextResponse.json({
      diary: result.text.trim(),
    })
  } catch (error) {
    console.error("Error generating diary:", error)
    return NextResponse.json({ error: "Failed to generate diary" }, { status: 500 })
  }
}