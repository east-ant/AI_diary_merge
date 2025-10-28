import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    // ✅ API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: "OpenAI API key가 설정되지 않았습니다. .env.local 파일을 확인하세요." 
        }, 
        { status: 500 }
      )
    }

    const { imageData } = await request.json()
    if (!imageData) {
      return NextResponse.json(
        { success: false, error: "⚠️ No image data provided" }, 
        { status: 400 }
      )
    }

    console.log("📸 이미지 분석 시작...")

    const response = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: `너는 감성적인 한국어 여행 작가야.
항상 아래 JSON 형식으로만 응답해야 해.

{
  "keywords": ["노을", "바다", "여행"],
  "confidence": 0.95,
  "diaryText": "오늘은 친구와 바다를 걸으며 노을을 바라봤다. 파도 소리와 함께 마음이 평온해졌다."
}

⚠️ 설명 문장, 영어, 추가 텍스트 절대 금지.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 여행 사진을 분석해서 아래 JSON 구조로만 반환해줘:
- keywords: 한국어 주요 키워드 (8~12개)
- confidence: 0~1 사이 숫자
- diaryText: 위 키워드를 활용한 감성적인 한국어 일기 한 단락.
JSON 외의 문장은 절대 포함하지 마.`,
            },
            {
              type: "image",
              image: imageData, // ✅ image_url 대신 image 사용
            },
          ],
        },
      ],
    })

    console.log("✅ OpenAI 응답:", response.text)

    let parsed
    try {
      // ✅ JSON 파싱 전 코드 블록 제거
      let jsonText = response.text.trim()
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "")
      }
      
      parsed = JSON.parse(jsonText)
    } catch (parseError) {
      console.error("❌ JSON 파싱 오류:", parseError)
      console.error("원본 텍스트:", response.text)
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid JSON format", 
          raw: response.text 
        }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      keywords: parsed.keywords || [],
      confidence: parsed.confidence || 0.9,
      diaryText: parsed.diaryText || "",
    })
  } catch (error: any) {
    console.error("❌ Error analyzing image:", error)
    
    // ✅ 더 자세한 에러 정보 반환
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "이미지 분석 중 오류가 발생했습니다.",
        details: error.cause || error.stack
      }, 
      { status: 500 }
    )
  }
}