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

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
