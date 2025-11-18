// API client for backend communication
"use client"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ==================== 인증 API ====================

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface GoogleLoginRequest {
  email: string
  name: string
  picture: string
}

export interface UserResponse {
  email: string
  username: string
  picture?: string
  createdAt: string
}

export async function registerUser(data: RegisterRequest): Promise<ApiResponse<UserResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await response.json()
  } catch (error) {
    console.error("Register error:", error)
    return { success: false, error: "서버와 연결할 수 없습니다." }
  }
}

export async function loginUser(data: LoginRequest): Promise<ApiResponse<{ user: UserResponse }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await response.json()
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "서버와 연결할 수 없습니다." }
  }
}

export async function googleLogin(data: GoogleLoginRequest): Promise<ApiResponse<{ user: UserResponse }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const result = await response.json()
    
    if (result.success && result.user) {
      // 사용자 정보를 localStorage에 저장
      localStorage.setItem("userId", result.user.email)
      localStorage.setItem("userInfo", JSON.stringify(result.user))
    }
    
    return result
  } catch (error) {
    console.error("Google login error:", error)
    return { success: false, error: "서버와 연결할 수 없습니다." }
  }
}

// ==================== 이미지 업로드 API ====================

export interface UploadImageRequest {
  userId: string
  image: File
  keywords: string[]
  tempSlotId: string
}

export interface UploadImageResponse {
  imageId: string
  imageUrl?: string
  imageData?: string
  mimeType?: string
  tempSlotId: string
  exifData?: any
  data?: {
    imageId: string
    imageData?: string
    mimeType?: string
    exifData?: any
    tempSlotId: string
  }
}

export async function uploadImage(data: UploadImageRequest): Promise<ApiResponse<UploadImageResponse>> {
  try {
    const formData = new FormData()
    formData.append("userId", data.userId)
    formData.append("image", data.image)
    formData.append("keywords", JSON.stringify(data.keywords))
    formData.append("tempSlotId", data.tempSlotId)

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
    })

    // ✅ 응답 처리 수정
    const result = await response.json()

    if (result.message && result.imageId) {
      return {
        success: true,
        data: {
          imageId: result.imageId,
          imageData: result.imageData,  // Base64 데이터
          mimeType: result.mimeType,
          exifData: result.exifData,
          tempSlotId: result.tempSlotId
        },
      }
    }
    
    return { success: false, error: result.error || "이미지 업로드 실패" }
  } catch (error) {
    console.error("Upload image error:", error)
    return { success: false, error: "서버와 연결할 수 없습니다." }
  }
}

// ==================== 다이어리 API ====================

export interface PhotoSlot {
  id: string
  photo?: string
  imageData?: string      // ✅ 추가
  mimeType?: string 
  keywords: string[]
  timeSlot: "morning" | "midday" | "afternoon" | "evening"
  timestamp: number
  exifData?: {
    timestamp?: Date
    location?: {
      latitude: number
      longitude: number
      locationName?: string
    }
    camera?: {
      make?: string
      model?: string
      settings?: string
    }
  }
}

export interface ApiPhotoSlot {
  id: string
  photo?: string
  imageData?: string      // ✅ 추가
  mimeType?: string       // ✅ 추가
  keywords: string[]
  timeSlot: "morning" | "midday" | "afternoon" | "evening"
  timestamp: number
  exifData?: {
    timestamp?: Date | string
    location?: {
      latitude: number
      longitude: number
      locationName?: string
    }
    camera?: {
      make?: string
      model?: string
      settings?: string
    }
  }
}

export interface Diary {
  _id?: string
  id?: string
  userId: string
  title: string
  date: string
  photoSlots: PhotoSlot[]
  createdAt: number | Date
  isCompleted?: boolean
}

export interface CreateDiaryRequest {
  userId: string
  title: string
  date?: string
  photoSlotIds: string[]
}

export async function createDiary(data: CreateDiaryRequest): Promise<ApiResponse<Diary>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/diaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    
    if (result.success && result.diary) {
      return {
        success: true,
        data: {
          ...result.diary,
          id: result.diary._id || result.diary.id,
        },
      }
    }
    
    return { success: false, error: result.error || "다이어리 생성 실패" }
  } catch (error) {
    console.error("Create diary error:", error)
    return { success: false, error: "서버와 연결할 수 없습니다." }
  }
}

// ✅ 수정된 getDiaries 함수
export async function getDiaries(userId: string): Promise<ApiResponse<Diary[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/diaries/list/${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: 서버 오류`)
      return { success: false, error: `HTTP ${response.status}: 서버 오류` }
    }

    const result = await response.json()
    
    console.log("📥 다이어리 목록 조회:", userId)
    console.log("📦 응답:", result)
    
    // ✅ 백엔드 응답 형식에 맞게 처리
    if (result.success && Array.isArray(result.data)) {
      console.log(`✅ ${result.data.length}개의 다이어리 조회됨`)
      return {
        success: true,
        data: result.data.map((diary: Diary) => ({
          ...diary,
          id: diary._id || diary.id,
        })),
      }
    }
    
    // 배열로 직접 응답하는 경우도 처리
    if (Array.isArray(result)) {
      console.log(`✅ ${result.length}개의 다이어리 조회됨`)
      return {
        success: true,
        data: result.map((diary: Diary) => ({
          ...diary,
          id: diary._id || diary.id,
        })),
      }
    }
    
    console.error("❌ 응답 형식 오류:", result)
    return { success: false, error: result.error || "다이어리 목록을 불러올 수 없습니다." }
  } catch (error) {
    console.error("❌ Get diaries error:", error)
    return { success: false, error: "서버와 연결할 수 없습니다." }
  }
}

export async function deleteDiary(diaryId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/diaries/${diaryId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })

    return await response.json()
  } catch (error) {
    console.error("Delete diary error:", error)
    return { success: false, error: "서버와 연결할 수 없습니다." }
  }
}

// ==================== 유틸리티 함수 ====================

export function getUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("userId")
}

export function getUserInfo(): UserResponse | null {
  if (typeof window === "undefined") return null
  const userInfo = localStorage.getItem("userInfo")
  if (!userInfo) return null
  try {
    return JSON.parse(userInfo)
  } catch {
    return null
  }
}

export function clearUserData(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("userId")
  localStorage.removeItem("userInfo")
}