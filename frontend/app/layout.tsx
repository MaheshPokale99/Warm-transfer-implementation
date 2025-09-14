import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NotificationProvider from '../components/ui/NotificationProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Warm Transfer - LiveKit & LLM',
  description: 'Real-time warm transfer system with LiveKit and AI-powered call summaries',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NotificationProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {children}
          </div>
        </NotificationProvider>
      </body>
    </html>
  )
}
