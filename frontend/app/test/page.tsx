'use client'

import { useState } from 'react'
import { Play, Zap, Wallet } from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { DuelScreenWebSocket } from '@/components/DuelScreenWebSocket'
import { BlockchainLobby } from '@/components/BlockchainLobby'
import { RealMultiplayerDuel } from '@/components/RealMultiplayerDuel'

export default function TestPage() {
  const [currentView, setCurrentView] = useState<'home' | 'demo-duel' | 'blockchain-lobby' | 'real-duel'>('home')
  const [matchData, setMatchData] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  useState(() => {
    setIsClient(true)
  })

  const handleDuelStart = (lobbyData: any) => {
    setMatchData(lobbyData)
    setCurrentView('real-duel')
  }

  const handleDuelComplete = (results: any) => {
    console.log('Duel completed:', results)
    setCurrentView('home')
  }

  const resetToHome = () => {
    setCurrentView('home')
    setMatchData(null)
  }

  const handleConnectWallet = () => {
    if (connectors && connectors.length > 0) {
      connect({ connector: connectors[0] })
    }
  }

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

  if (currentView === 'demo-duel') {
    const demoMatch = {
      matchId: `demo_${Date.now()}`,
      players: ['demo_player_1', 'demo_player_2'],
      playerAddress: 'demo_player_1'
    }
    return <DuelScreenWebSocket match={demoMatch} onComplete={handleDuelComplete} onBack={resetToHome} isDemoMode={true} />
  }

  if (currentView === 'blockchain-lobby') {
    return <BlockchainLobby onDuelStart={handleDuelStart} onBack={resetToHome} />
  }

  if (currentView === 'real-duel' && matchData) {
    return <RealMultiplayerDuel lobbyData={matchData} onComplete={handleDuelComplete} onBack={resetToHome} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🧪 Test Page</h1>
          <p className="text-gray-600">Real wallet connections for testing!</p>
          
          {/* Wallet Status */}
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            {isConnected ? (
              <div className="text-green-600 font-semibold">
                ✅ Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            ) : (
              <div className="text-red-600 font-semibold">
                ❌ No Wallet Connected
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setCurrentView('demo-duel')}
              className="bg-avalanche-500 hover:bg-avalanche-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors duration-200 flex items-center gap-3 justify-center"
            >
              <Play className="w-6 h-6" />
              Demo Duel
            </button>
            
            <button
              onClick={() => setCurrentView('blockchain-lobby')}
              disabled={!isConnected}
              className={`${isConnected ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors duration-200 flex items-center gap-3 justify-center`}
            >
              <Zap className="w-6 h-6" />
              Blockchain Duel
            </button>
          </div>

          {!isConnected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Wallet Required</h3>
              <p className="text-sm text-yellow-700 mb-3">
                Connect your MetaMask wallet to use Blockchain Duel mode.
              </p>
              <button
                onClick={handleConnectWallet}
                className="bg-avalanche-500 hover:bg-avalanche-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Connect MetaMask
              </button>
            </div>
          )}

          <div className="text-center text-sm text-gray-500">
            <p><strong>Demo Duel:</strong> Instant testing with simulated opponent</p>
            <p><strong>Blockchain Duel:</strong> Real AVAX staking and multiplayer</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">🔧 Test Instructions:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Demo Duel:</strong> Click and play instantly</li>
              <li>• <strong>Blockchain Duel:</strong> Connect wallet, stake AVAX</li>
              <li>• <strong>Multiplayer:</strong> Open 2 browsers for real testing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}