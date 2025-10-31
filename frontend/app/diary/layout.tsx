import type React from "react"
import { GeistSans } from "geist/font/sans"
import { Analytics } from "@vercel/analytics/next"
import "../globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={GeistSans.className}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
