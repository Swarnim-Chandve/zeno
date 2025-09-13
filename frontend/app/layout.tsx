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
                
                // Store original methods
                const originalDefineProperty = Object.defineProperty;
                const originalDefineProperties = Object.defineProperties;
                
                // Enhanced protection
                Object.defineProperty = function(obj, prop, descriptor) {
                  if (prop === 'ethereum' && obj === window) {
                    if (window.ethereum) {
                      console.log('Blocking ethereum redefinition in head script');
                      return obj;
                    }
                  }
                  try {
                    return originalDefineProperty.call(this, obj, prop, descriptor);
                  } catch (error) {
                    console.warn('Property redefinition failed:', prop, error.message);
                    return obj;
                  }
                };
                
                Object.defineProperties = function(obj, props) {
                  if (obj === window && props && props.ethereum) {
                    if (window.ethereum) {
                      console.log('Blocking ethereum redefinition via defineProperties in head script');
                      return obj;
                    }
                  }
                  try {
                    return originalDefineProperties.call(this, obj, props);
                  } catch (error) {
                    console.warn('Properties redefinition failed:', error.message);
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
                    console.log('Ethereum property protected in head script');
                  } catch (e) {
                    console.log('Ethereum property already protected in head script');
                  }
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
