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
  const [isWalletReady, setIsWalletReady] = useState(false)
  
  // Always call hooks at the top level - this is the correct way
  const account = useAccount()
  const connect = useConnect()
  const disconnect = useDisconnect()

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(true)
    
    let retryCount = 0
    const maxRetries = 50 // 5 seconds max wait time
    
    // Wait for wallet injection to complete
    const checkWalletReady = () => {
      retryCount++
      
      // Check if ethereum is available and stable
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('Wallet detected, proceeding with app')
        setIsWalletReady(true)
      } else if (retryCount >= maxRetries) {
        // After max retries, proceed anyway (for demo mode or browsers without wallet)
        console.log('No wallet detected after timeout, proceeding anyway (demo mode available)')
        setIsWalletReady(true)
      } else {
        // Retry after a short delay
        setTimeout(checkWalletReady, 100)
      }
    }
    
    // Start checking after a small delay
    const timer = setTimeout(checkWalletReady, 100)

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

  // Prepare wallet state
  const walletState = {
    address: account.address,
    isConnected: account.isConnected,
    connect: connect.connect,
    connectors: connect.connectors,
    disconnect: disconnect.disconnect,
    isClient: true
  }

  return (
    <>
      {children(walletState)}
    </>
  )
}
