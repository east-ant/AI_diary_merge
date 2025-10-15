// /lib/diary/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ✅ 좌표 → 한글 주소 (Kakao Local API 사용)
export async function getKoreanAddress(lat: number, lng: number): Promise<string> {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY || "b5e3dc69971ba731fd9afa52f35d1e45"

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      {
        headers: {
          Authorization: `KakaoAK ${kakaoKey}`,
        },
      }
    )

    const data = await response.json()

    if (data.documents && data.documents.length > 0) {
      const address = data.documents[0].address
      return `${address.region_1depth_name} ${address.region_2depth_name} ${address.region_3depth_name || ""} ${address.main_address_no || ""}`.trim()
    }

    return "주소 정보 없음"
  } catch (error) {
    console.error(" Kakao 주소 변환 실패:", error)
    return "주소 변환 실패"
  }
}
