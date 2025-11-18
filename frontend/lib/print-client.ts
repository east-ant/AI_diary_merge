// Print API client for Raspberry Pi communication
"use client"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
const RASPBERRY_PI_URL = process.env.NEXT_PUBLIC_RASPBERRY_PI_URL || "http://192.168.1.158:3001"

export interface PrintRequest {
  diaryId: string
  userId: string
  pageNumbers?: number[] // 특정 페이지만 인쇄 (선택사항)
}

export interface PrintResponse {
  success: boolean
  message?: string
  error?: string
  jobId?: string
  totalPages?: number
  status?: string
}

export interface PrinterStatusResponse {
  success: boolean
  data?: {
    online: boolean
    printers?: Array<{
      name: string
      info: string
      state: number
      location: string
    }>
  }
}

/**
 * 다이어리 인쇄 요청
 */
export async function printDiary(params: PrintRequest): Promise<PrintResponse> {
  try {
    console.log("🖨️  라즈베리파이로 인쇄 요청:", params)

    // 먼저 백엔드에서 다이어리 이미지 데이터 가져오기
    const printableRes = await fetch(`${BACKEND_URL}/api/diaries/printable/${params.diaryId}`)
    const printableData = await printableRes.json()

    if (!printableData.success || !printableData.data?.pages) {
      return {
        success: false,
        error: "인쇄 가능한 이미지를 찾을 수 없습니다."
      }
    }

    const pages = printableData.data.pages
    console.log(`📄 ${pages.length}페이지 인쇄 준비 완료`)

    // 라즈베리파이로 각 페이지 전송
    const results = []
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      console.log(`📤 페이지 ${page.pageNumber} 전송 중...`)

      const response = await fetch(`${RASPBERRY_PI_URL}/api/print/image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_data: page.imageData,
          extension: printableData.data.mimeType?.includes("png") ? "png" : "jpg"
        })
      })

      const result = await response.json()
      results.push(result)

      if (!result.success) {
        console.error(`❌ 페이지 ${page.pageNumber} 인쇄 실패:`, result.message)
        return {
          success: false,
          error: `페이지 ${page.pageNumber} 인쇄 실패: ${result.message}`
        }
      }

      console.log(`✅ 페이지 ${page.pageNumber} 인쇄 요청 완료 (작업 ID: ${result.job_id})`)
    }

    return {
      success: true,
      jobId: results[0]?.job_id?.toString() || "unknown",
      totalPages: pages.length,
      message: `${pages.length}페이지 인쇄 요청 완료`
    }

  } catch (error) {
    console.error("❌ 인쇄 요청 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류"
    }
  }
}

/**
 * 프린터 상태 확인
 */
export async function getPrinterStatus(): Promise<PrinterStatusResponse> {
  try {
    const response = await fetch(`${RASPBERRY_PI_URL}/api/printers`)
    const data = await response.json()

    if (data.success && data.printers && data.printers.length > 0) {
      return {
        success: true,
        data: {
          online: true,
          printers: data.printers
        }
      }
    }

    return {
      success: true,
      data: {
        online: false
      }
    }
  } catch (error) {
    console.error("❌ 프린터 상태 확인 오류:", error)
    return {
      success: false,
      data: {
        online: false
      }
    }
  }
}

/**
 * 인쇄 작업 상태 확인 (선택사항)
 */
export async function getPrintStatus(_jobId: string): Promise<PrintResponse> {
  try {
    // CUPS 작업 상태는 라즈베리파이에서만 확인 가능
    // 필요시 백엔드에 엔드포인트 추가
    return { success: true, status: "pending" }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get job status"
    }
  }
}
