import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Math Duel Game',
  description: '1v1 Math Duel Game on Avalanche',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="/ethereum-fix.js" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
