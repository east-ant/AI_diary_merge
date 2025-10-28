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
    // ✅ API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: "OpenAI API key가 설정되지 않았습니다. .env.local 파일을 확인하세요." 
        }, 
        { status: 500 }
      )
    }

    const { photoSlots }: { photoSlots: PhotoSlot[] } = await request.json()

    if (!photoSlots || photoSlots.length === 0) {
      return NextResponse.json({ error: "사진 데이터가 제공되지 않았습니다." }, { status: 400 })
    }

    // ✅ 한국어 시간대 매핑
    const timeSlotKorean = {
      morning: "아침",
      midday: "점심",
      afternoon: "오후",
      evening: "저녁"
    }

    // ✅ 사진 설명을 한국어로 생성
    const photoDescriptions = photoSlots
      .map((slot, index) => {
        const timeSlot = timeSlotKorean[slot.timeSlot] || slot.timeSlot
        const keywords = slot.keywords.join(", ")
        return `${timeSlot} (사진 ${index + 1}): ${keywords}`
      })
      .join("\n")

    // ✅ 한국어 프롬프트
    const prompt = `당신은 감성적인 한국어 여행 작가입니다. 아래 사진들과 키워드를 바탕으로 감동적인 여행 일기를 작성해주세요.

사진 타임라인과 키워드:
${photoDescriptions}

다음 조건을 따라 여행 일기를 작성하세요:
- 아침부터 저녁까지 자연스럽게 이어지는 이야기로 작성
- 모든 키워드를 의미있게 포함
- 발견과 경험의 이야기를 담아서 작성
- 감각적인 묘사와 감정을 포함
- 약 300-500자 분량
- 진솔하고 개인적인 느낌으로 작성
- 1인칭 시점으로 작성 (예: "나는", "내가")
- 반드시 한국어로만 작성

여행 일기:`

    console.log("📝 다이어리 생성 시작...")

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.8, // ✅ 더 창의적인 응답을 위해 추가
    })

    console.log("✅ 생성된 다이어리:", result.text)

    return NextResponse.json({
      diary: result.text,
    })
  } catch (error: any) {
    console.error("❌ 다이어리 생성 오류:", error)
    return NextResponse.json(
      { 
        error: "다이어리 생성에 실패했습니다.",
        details: error.message 
      }, 
      { status: 500 }
    )
  }
}