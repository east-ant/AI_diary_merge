import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Diary',
  description: 'Smart diary that AI analyzes',
}

export default function DiaryLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      {children}
    </>
  )
}




