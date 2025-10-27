"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useGoogleAuth } from "@/hooks/use-google-auth"

export default function Home() {
  const router = useRouter()
  const { user, loading, signOut } = useGoogleAuth()

  const destinations = [
    {
      title: "제주도 올레길 9코스",
      subtitle: "한 달에 2회 방문",
      image: "/images/lush-green-forest-path.jpg",
    },
    {
      title: "도쿄 현대 문화의 중심",
      subtitle: "한 달에 1회 방문",
      image: "/images/tokyo-modern-cityscape.jpg",
    },
    {
      title: "캐나다 록키산 캠핑",
      subtitle: "한 달에 3회 방문",
      image: "/images/canadian-rocky-mountains-lake.jpg",
    },
    {
      title: "교토 고찰 투어",
      subtitle: "한 달에 2회 방문",
      image: "/images/kyoto-traditional-temple.jpg",
    },
    {
      title: "파리에서의 낭만",
      subtitle: "한 달에 1회 방문",
      image: "/images/eiffel-tower-paris.png",
    },
    {
      title: "산토리니에서 여유 즐기기",
      subtitle: "한 달에 2회 방문",
      image: "/images/santorini-white-blue.png",
    },
    {
      title: "오로라 관측 투어",
      subtitle: "한 달에 1회 방문",
      image: "/images/northern-lights.png",
    },
    {
      title: "페루에서 고산 트레킹",
      subtitle: "한 달에 2회 방문",
      image: "/images/machu-picchu-mountains.png",
    },
  ]

  const handleLogout = async () => {
    await signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-xl font-bold text-gray-900">TRAVELY</span>
          </div>

          {/* 로딩 중 */}
          {loading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* 로그인 안 된 상태 */}
          {!loading && !user && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              onClick={() => router.push('/login')}
            >
              로그인
            </Button>
          )}

          {/* 로그인된 상태 - 프로필 드롭다운 */}
          {!loading && user && (
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/diary')}
                className="hidden sm:flex"
              >
                내 다이어리
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.picture || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium text-gray-900">
                      {user.name}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">어떤의 모든 순간</h1>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-balance">AI와 함께 기록하고 추억하세요</h2>
              <p className="text-gray-300 mb-2">여행의 모든 순간,</p>
              <p className="text-gray-300 mb-2">AI의 힘을 더해 추억을 남겨보세요.</p>
              <p className="text-gray-300">TRAVELY가 당신의 여행을 반짝이게 만들어드립니다.</p>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative w-64 h-64 bg-white rounded-lg shadow-2xl transform rotate-3">
                <div className="absolute inset-4 flex items-center justify-center">
                  <svg className="w-48 h-48" viewBox="0 0 200 200" fill="none">
                    <rect x="20" y="40" width="160" height="120" fill="#f3f4f6" stroke="#000" strokeWidth="2" />
                    <circle cx="70" cy="80" r="15" fill="#fbbf24" />
                    <circle cx="130" cy="80" r="15" fill="#fbbf24" />
                    <path d="M 60 110 Q 100 140 140 110" stroke="#000" strokeWidth="3" fill="none" />
                    <circle cx="100" cy="100" r="8" fill="#000" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* First Content Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="relative h-64 md:h-80 rounded-lg overflow-hidden">
                <Image src="/images/people-toasting-with-wine-glasses-sunset.jpg" alt="여행 중 건배하는 모습" fill className="object-cover" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">매일매일, 내 여행을 색칠하는 시간</h3>
              <p className="text-gray-600 mb-3">여행 중 경험한 순간들을 기록하고 공유하세요.</p>
              <p className="text-gray-600 mb-3">AI가 당신의 여행 패턴을 분석해 더 나은 추천을 제공합니다.</p>
              <p className="text-gray-600">TRAVELY가 당신의 여행을 더욱 특별하게 만들어드립니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Second Content Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="flex-1">
              <div className="relative h-64 md:h-80 rounded-lg overflow-hidden">
                <Image src="/images/wine-glass-with-fruits-on-table-warm-lighting.jpg" alt="여행의 순간" fill className="object-cover" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">나의 여행이 이야기가 되는 순간</h3>
              <p className="text-gray-600 mb-3">당신의 여행을 사진, 글로 이야기로 만들어보세요.</p>
              <p className="text-gray-600 mb-3">좋아 한 장면이 하나의 이야기로 완성됩니다.</p>
              <p className="text-gray-600">TRAVELY가 당신의 여행을 감동으로 가득 채워드립니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Third Content Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">나의 여행이 이야기가 되는 순간</h3>
          <p className="text-gray-600 mb-2">당신의 좋아하는 여행을 공유하세요.</p>
          <p className="text-gray-600">TRAVELY가 당신의 모든 순간을 함께 하겠습니다.</p>
        </div>
      </section>

      {/* Travel Diary Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">나의 여행 일기</h3>
          <p className="text-gray-500 mb-8">AI, 여행의 순간을 함께하세요.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {destinations.map((destination, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48">
                  <Image
                    src={destination.image || "/placeholder.svg"}
                    alt={destination.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-1">{destination.title}</h4>
                  <p className="text-sm text-gray-500">{destination.subtitle}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" className="rounded-full bg-transparent">
              더 보기 +
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}