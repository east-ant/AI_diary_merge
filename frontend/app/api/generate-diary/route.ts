import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, keywords, photoCount } = body

    console.log("📥 AI 생성 요청:", { title, keywords, photoCount })

    if (!title || !keywords || !photoCount) {
      return NextResponse.json(
        { 
          success: false,
          error: "title, keywords, photoCount are required" 
        },
        { status: 400 }
      )
    }

    // ✅ 프롬프트 작성
    const prompt = `너는 여행 일기 작성 여행자야. 다음 정보를 바탕으로 따뜻하고 감정적인 여행 일기를 작성해줘.

제목: ${title}
사진 개수: ${photoCount}개
키워드/태그: ${keywords}

요구사항:
- 한국어로 작성
- 첫 문단에서 여행의 감정을 표현
- 키워드를 자연스럽게 포함
- 길이: 200-400자 정도
- 따뜻하고 감성적인 톤
- 독자가 여행 경험을 생생하게 느낄 수 있도록 작성
- 여러 문단으로 구성 (${photoCount}개의 사진에 대응)
- 문단은 빈 줄로 구분

다이어리를 바로 시작해주고 추가 설명은 없어도 돼.`

    console.log("🚀 AI 호출 시작...")

    // ✅ AI 호출
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxTokens: 150 * Math.max(photoCount, 1),
    })

    console.log("✅ AI 생성 완료:", result.text.trim())

    // ✅ 프론트에서 받는 필드명과 일치시킴
    return NextResponse.json({
      success: true,
      content: result.text.trim(),
    })
  } catch (error) {
    console.error("❌ AI 생성 오류:", error)
    
    const errorMessage = error instanceof Error ? error.message : "AI 다이어리 생성 실패"
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}