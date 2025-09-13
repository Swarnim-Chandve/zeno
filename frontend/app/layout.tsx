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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Immediate ethereum protection - runs before any other scripts
              (function() {
                if (typeof window === 'undefined') return;
                
                const originalDefineProperty = Object.defineProperty;
                Object.defineProperty = function(obj, prop, descriptor) {
                  if (prop === 'ethereum' && obj === window && window.ethereum) {
                    console.log('Blocking ethereum redefinition');
                    return obj;
                  }
                  try {
                    return originalDefineProperty.call(this, obj, prop, descriptor);
                  } catch (error) {
                    return obj;
                  }
                };
                
                // Make ethereum non-configurable if it exists
                if (window.ethereum) {
                  try {
                    Object.defineProperty(window, 'ethereum', {
                      value: window.ethereum,
                      writable: true,
                      enumerable: true,
                      configurable: false
                    });
                  } catch (e) {}
                }
              })();
            `,
          }}
        />
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
