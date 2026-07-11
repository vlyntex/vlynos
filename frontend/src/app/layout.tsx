import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import LiveNotifications from '@/components/LiveNotifications'
import { AppShell } from '@/components/layout/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VlynTech WFM',
  description: 'Workforce Management Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppShell>
          {children}
        </AppShell>
        <LiveNotifications />
      </body>
    </html>
  )
}
