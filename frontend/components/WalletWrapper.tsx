'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useState, useEffect } from 'react'

interface WalletWrapperProps {
  children: (props: {
    address: string | undefined
    isConnected: boolean
    connect: any
    connectors: readonly any[]
    disconnect: any
    isClient: boolean
  }) => React.ReactNode
}

export function WalletWrapper({ children }: WalletWrapperProps) {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Always call hooks, but handle the state properly
  const account = useAccount()
  const connect = useConnect()
  const disconnect = useDisconnect()

  // Don't render until client-side to prevent hydration issues
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-avalanche-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {children({
        address: account.address,
        isConnected: account.isConnected,
        connect: connect.connect,
        connectors: connect.connectors,
        disconnect: disconnect.disconnect,
        isClient
      })}
    </>
  )
}
