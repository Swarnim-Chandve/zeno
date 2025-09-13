import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Prevent ethereum property redefinition errors - must be at the very top
if (typeof window !== 'undefined') {
  const originalDefineProperty = Object.defineProperty
  Object.defineProperty = function<T>(obj: T, prop: PropertyKey, descriptor: PropertyDescriptor & ThisType<any>): T {
    if (prop === 'ethereum' && obj === window) {
      // If ethereum already exists, don't redefine it
      if (window.ethereum) {
        return obj
      }
    }
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor) as T
    } catch (error) {
      // If redefinition fails, just return the object
      console.warn('Property redefinition failed:', prop, error)
      return obj
    }
  }
}

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
