import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wakeboard Booking',
  description: 'Book your wakeboard slot',
}
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, themeColor: '#14305f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
