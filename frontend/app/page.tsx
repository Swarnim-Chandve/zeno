'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useState, useEffect } from 'react'
import { Wallet, Play, Trophy, Users } from 'lucide-react'
import { MatchmakingWebSocket } from '@/components/MatchmakingWebSocket'
import { DuelScreenWebSocket } from '@/components/DuelScreenWebSocket'
import { Results } from '@/components/Results'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [currentView, setCurrentView] = useState<'home' | 'matchmaking' | 'duel' | 'results'>('home')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [matchData, setMatchData] = useState<any>(null)
  const [duelData, setDuelData] = useState<any>(null)

  const handleMatchFound = (match: any) => {
    setMatchData(match)
    setCurrentView('duel')
  }

  const handleDuelComplete = (results: any) => {
    setDuelData(results)
    setCurrentView('results')
  }

  const handleDemoMode = () => {
    setIsDemoMode(true)
    setCurrentView('matchmaking')
  }

  const resetToHome = () => {
    setCurrentView('home')
    setIsDemoMode(false)
    setMatchData(null)
    setDuelData(null)
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
                Demo Mode (No Wallet)
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'matchmaking') {
    return <MatchmakingWebSocket onMatchFound={handleMatchFound} onBack={resetToHome} isDemoMode={isDemoMode} playerAddress={isDemoMode ? '0xDemoPlayer123...' : address} />
  }

  if (currentView === 'duel' && matchData) {
    return <DuelScreenWebSocket match={matchData} onBack={resetToHome} isDemoMode={isDemoMode} />
  }

  if (currentView === 'results' && duelData) {
    return <Results results={duelData} onPlayAgain={resetToHome} isDemoMode={isDemoMode} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-avalanche-500 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Math Duel Game</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <button
              onClick={() => disconnect()}
              className="text-avalanche-600 hover:text-avalanche-700 font-medium"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Duel?</h2>
              <p className="text-gray-600 text-lg">
                Test your math skills in real-time 1v1 battles on Avalanche!
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-avalanche-50 rounded-xl">
                <Users className="w-8 h-8 text-avalanche-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">1v1 Battles</h3>
                <p className="text-sm text-gray-600">Face off against real opponents</p>
              </div>
              <div className="text-center p-6 bg-avalanche-50 rounded-xl">
                <Trophy className="w-8 h-8 text-avalanche-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Win Rewards</h3>
                <p className="text-sm text-gray-600">Winner takes all the stakes</p>
              </div>
              <div className="text-center p-6 bg-avalanche-50 rounded-xl">
                <Play className="w-8 h-8 text-avalanche-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Real-time</h3>
                <p className="text-sm text-gray-600">Fast-paced math challenges</p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setCurrentView('matchmaking')}
                className="bg-avalanche-500 hover:bg-avalanche-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors duration-200 flex items-center gap-3 mx-auto"
              >
                <Play className="w-6 h-6" />
                Find Opponent
              </button>
            </div>
          </div>

          {/* Game Rules */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">How to Play</h3>
            <div className="space-y-4 text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-avalanche-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <p>Connect your wallet and get some USDC.e test tokens from the faucet</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-avalanche-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <p>Click "Find Opponent" to start matchmaking</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-avalanche-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <p>Answer 3 math questions as fast and accurately as possible</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-avalanche-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</div>
                <p>Winner gets 2x the stake amount instantly!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
