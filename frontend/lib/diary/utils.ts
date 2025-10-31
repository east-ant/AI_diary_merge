// /lib/diary/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getKoreanAddressServer } from "@/app/diary/actions"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 좌표 → 한글 주소 (Kakao Local API 사용)
export async function getKoreanAddress(lat: number, lng: number): Promise<string> {
  return getKoreanAddressServer(lat, lng)
}
