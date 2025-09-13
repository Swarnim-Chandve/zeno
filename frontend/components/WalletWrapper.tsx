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

  // Only use wagmi hooks after client-side hydration
  const account = useAccount()
  const connect = useConnect()
  const disconnect = useDisconnect()

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
