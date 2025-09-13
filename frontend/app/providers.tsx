'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { avalancheFuji } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { createClient } from 'viem'
import { useState, useEffect } from 'react'

const config = createConfig({
  chains: [avalancheFuji],
  connectors: [
    injected(),
    metaMask(),
  ],
  client: ({ chain }) => createClient({
    chain,
    transport: http(),
  }),
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    // Prevent ethereum property redefinition errors
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
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
