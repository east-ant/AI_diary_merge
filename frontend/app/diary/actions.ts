"use server"

export async function getKoreanAddressServer(lat: number, lng: number): Promise<string> {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY

  if (!kakaoKey) {
    console.error("KAKAO_REST_API_KEY is not set")
    return "주소 정보 없음"
  }

  try {
    // Kakao Local API: 좌표 → 장소(POI) 검색
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=&x=${lng}&y=${lat}&radius=50`, {
      headers: {
        Authorization: `KakaoAK ${kakaoKey}`,
      },
    })

    const data = await response.json()

    if (data.documents && data.documents.length > 0) {
      // 가장 가까운 장소명 반환
      const place = data.documents[0]
      return place.place_name || "주소 정보 없음"
    }

    // 만약 근처 장소가 없다면 기본 주소 반환
    const fallback = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`, {
      headers: {
        Authorization: `KakaoAK ${kakaoKey}`,
      },
    })

    const fallbackData = await fallback.json()
    if (fallbackData.documents && fallbackData.documents.length > 0) {
      const address = fallbackData.documents[0].address
      return `${address.region_1depth_name} ${address.region_2depth_name} ${address.region_3depth_name || ""} ${address.main_address_no || ""}`.trim()
    }

    return "주소 정보 없음"
  } catch (error) {
    console.error("Kakao 주소 변환 실패:", error)
    return "주소 변환 실패"
  }
}
