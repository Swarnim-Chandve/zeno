'use client'

import { useState } from 'react'
import { Wallet, Play, Trophy, Users, Zap } from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { MatchmakingWebSocket } from '@/components/MatchmakingWebSocket'
import { DuelScreenWebSocket } from '@/components/DuelScreenWebSocket'
import { BlockchainLobby } from '@/components/BlockchainLobby'
import { RealMultiplayerDuel } from '@/components/RealMultiplayerDuel'
import { Results } from '@/components/Results'
import { Leaderboard } from '@/components/Leaderboard'

export default function HomePage() {
  const [currentView, setCurrentView] = useState<'home' | 'matchmaking' | 'duel' | 'blockchain-lobby' | 'real-duel' | 'results'>('home')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isBlockchainMode, setIsBlockchainMode] = useState(false)
  const [demoAddress, setDemoAddress] = useState<string>('')
  const [matchData, setMatchData] = useState<any>(null)
  const [duelData, setDuelData] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  useState(() => {
    setIsClient(true)
  })

  const handleMatchFound = (match: any) => {
    setMatchData(match)
    setCurrentView('duel')
  }

  const handleDuelComplete = (results: any) => {
    setDuelData(results)
    setCurrentView('results')
  }

  const handleDuelStart = (lobbyData: any) => {
    setMatchData(lobbyData)
    setCurrentView('real-duel')
  }

  const handleDemoMode = () => {
    const uniqueId = Math.random().toString(36).substr(2, 9)
    const demoAddr = `0xDemo${uniqueId}...${Math.random().toString(36).substr(2, 4)}`
    setDemoAddress(demoAddr)
    setIsDemoMode(true)
    setIsBlockchainMode(false)
    setCurrentView('matchmaking')
  }

  const handleBlockchainMode = () => {
    if (!isConnected) {
      if (connectors && connectors.length > 0) {
        connect({ connector: connectors[0] })
      }
      return
    }
    setIsBlockchainMode(true)
    setIsDemoMode(false)
    setCurrentView('blockchain-lobby')
  }

  const handleConnectWallet = () => {
    if (connectors && connectors.length > 0) {
      connect({ connector: connectors[0] })
    }
  }

  const resetToHome = () => {
    setCurrentView('home')
    setMatchData(null)
    setDuelData(null)
    setIsDemoMode(false)
    setIsBlockchainMode(false)
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

  if (!isConnected && !isDemoMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-avalanche-500 rounded-full flex items-center justify-center mb-6">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Math Duel Game</h1>
            <p className="text-gray-600 mb-8">
              Connect your wallet to start playing 1v1 math duels on Avalanche!
            </p>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="w-full bg-avalanche-500 hover:bg-avalanche-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  Connect {connector.name}
                </button>
              ))}
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>
              
              <button
                onClick={handleDemoMode}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Try Demo Mode
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Perfect for testing with multiple browsers!
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'matchmaking') {
    return (
      <MatchmakingWebSocket
        onMatchFound={handleMatchFound}
        onBack={resetToHome}
        isDemoMode={isDemoMode}
      />
    )
  }

  if (currentView === 'duel' && matchData) {
    return (
      <DuelScreenWebSocket
        match={matchData}
        onComplete={handleDuelComplete}
        onBack={resetToHome}
        isDemoMode={isDemoMode}
      />
    )
  }

  if (currentView === 'blockchain-lobby') {
    return <BlockchainLobby onDuelStart={handleDuelStart} onBack={resetToHome} />
  }

  if (currentView === 'real-duel' && matchData) {
    return <RealMultiplayerDuel lobbyData={matchData} onComplete={handleDuelComplete} onBack={resetToHome} />
  }

  if (currentView === 'results' && duelData) {
    return <Results results={duelData} onPlayAgain={resetToHome} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Math Duel Game</h1>
          <p className="text-xl text-gray-600 mb-6">
            Battle opponents in real-time math duels on Avalanche!
          </p>
          
          {/* Wallet Status */}
          <div className="inline-flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-md">
            {isConnected ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-600 font-semibold">
                  Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-red-600 font-semibold">Not Connected</span>
              </>
            )}
          </div>
        </div>

        {/* Game Modes */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Demo Mode */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-avalanche-500 rounded-full flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Demo Mode</h2>
              <p className="text-gray-600">Test the game without wallet connection</p>
            </div>
            <button
              onClick={handleDemoMode}
              className="w-full bg-avalanche-500 hover:bg-avalanche-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors duration-200"
            >
              Start Demo Game
            </button>
          </div>

          {/* Blockchain Mode */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Blockchain Mode</h2>
              <p className="text-gray-600">Real AVAX staking and multiplayer duels</p>
            </div>
            <button
              onClick={handleBlockchainMode}
              disabled={!isConnected}
              className={`w-full ${
                isConnected 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gray-400 cursor-not-allowed'
              } text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors duration-200`}
            >
              {isConnected ? 'Start Blockchain Game' : 'Connect Wallet First'}
            </button>
            {!isConnected && (
              <button
                onClick={handleConnectWallet}
                className="w-full mt-3 bg-avalanche-500 hover:bg-avalanche-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Connect MetaMask
              </button>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Multiplayer</h3>
            <p className="text-gray-600 text-sm">Battle opponents in live math duels</p>
          </div>
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Win AVAX Prizes</h3>
            <p className="text-gray-600 text-sm">Stake and win real cryptocurrency</p>
          </div>
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Games</h3>
            <p className="text-gray-600 text-sm">Quick 5-question math battles</p>
          </div>
        </div>
      </div>
    </div>
  )
}