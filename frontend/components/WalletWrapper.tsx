'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useState, useEffect, useMemo } from 'react'

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
  const [isWalletReady, setIsWalletReady] = useState(false)
  
  // Use useMemo to prevent unnecessary re-renders
  const walletState = useMemo(() => {
    if (!isClient || !isWalletReady) {
      return {
        address: undefined,
        isConnected: false,
        connect: null,
        connectors: [],
        disconnect: null,
        isClient: false
      }
    }

    try {
      const account = useAccount()
      const connect = useConnect()
      const disconnect = useDisconnect()

      return {
        address: account.address,
        isConnected: account.isConnected,
        connect: connect.connect,
        connectors: connect.connectors,
        disconnect: disconnect.disconnect,
        isClient: true
      }
    } catch (error) {
      console.warn('Wallet hooks error:', error)
      return {
        address: undefined,
        isConnected: false,
        connect: null,
        connectors: [],
        disconnect: null,
        isClient: true
      }
    }
  }, [isClient, isWalletReady])

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(true)
    
    // Add a small delay to ensure wallet injection is complete
    const timer = setTimeout(() => {
      setIsWalletReady(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Show loading state until everything is ready
  if (!isClient || !isWalletReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-avalanche-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {children(walletState)}
    </>
  )
}
