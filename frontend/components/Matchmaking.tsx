'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Loader2, Users, X, Clock, User } from 'lucide-react'

interface MatchmakingProps {
  onMatchFound: (match: any) => void
  onBack: () => void
  isDemoMode?: boolean
  playerAddress?: string
}

interface WaitingPlayer {
  address: string
  joinedAt: number
}

export function Matchmaking({ onMatchFound, onBack, isDemoMode = false, playerAddress }: MatchmakingProps) {
  const { address } = useAccount()
  const [status, setStatus] = useState<'searching' | 'found' | 'error' | 'waiting'>('searching')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const currentAddress = isDemoMode ? playerAddress : address
    if (!currentAddress) return

    // Connect to WebSocket for real-time updates
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    const wsUrl = backendUrl.replace('http', 'ws').replace('https', 'wss')
    
    // For now, use polling instead of WebSocket for deployed version
    const useWebSocket = backendUrl.includes('localhost')
    let websocket = null
    
    if (useWebSocket) {
      websocket = new WebSocket(wsUrl)
      websocket.onopen = () => {
        websocket.send(JSON.stringify({
          type: 'join_matchmaking',
          playerAddress: currentAddress
        }))
      }

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'matchmaking_update') {
          setWaitingPlayers(data.waitingPlayers || [])
          setStatus('waiting')
        } else if (data.type === 'match_found') {
          setStatus('found')
          onMatchFound({ ...data, playerAddress: currentAddress })
        } else if (data.type === 'opponent_joined') {
          setStatus('found')
          onMatchFound({ ...data, playerAddress: currentAddress })
        }
      }

      websocket.onclose = () => {
        console.log('WebSocket connection closed')
      }
    }

    wsRef.current = websocket
    setWs(websocket)

    const findMatch = async () => {
      try {
        const response = await fetch('/api/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerAddress: currentAddress }),
        })

        if (!response.ok) {
          throw new Error('Failed to find match')
        }

        const data = await response.json()
        setMatchId(data.matchId)
        
        if (data.status === 'ready') {
          setStatus('found')
          onMatchFound({ ...data, playerAddress: currentAddress })
        } else {
          setStatus('waiting')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('error')
      }
    }

    findMatch()

    // Polling for deployed version
    let pollInterval = null
    if (!useWebSocket) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/match?matchId=${matchId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.status === 'ready') {
              setStatus('found')
              onMatchFound({ ...data, playerAddress: currentAddress })
            }
          }
        } catch (err) {
          console.log('Polling error:', err)
        }
      }, 2000)
    }

    return () => {
      if (websocket) {
        websocket.close()
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [address, onMatchFound, isDemoMode, playerAddress])

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Matchmaking Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-avalanche-500 hover:bg-avalanche-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-avalanche-100 rounded-full flex items-center justify-center mb-6">
            <Users className="w-8 h-8 text-avalanche-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {status === 'searching' ? 'Finding Opponent' : 
             status === 'waiting' ? 'Waiting for Opponent' : 
             'Match Found!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {status === 'searching' 
              ? 'Searching for an opponent...' 
              : status === 'waiting'
              ? 'You are in the matchmaking queue. Waiting for another player...'
              : 'Match found! Starting duel...'
            }
          </p>
          
          <div className="flex justify-center mb-6">
            <Loader2 className="w-8 h-8 text-avalanche-500 animate-spin" />
          </div>

          {/* Waiting Players List */}
          {status === 'waiting' && waitingPlayers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Players in Queue</h3>
              <div className="space-y-2">
                {waitingPlayers.map((player, index) => (
                  <div key={player.address} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-avalanche-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">
                        {player.address.slice(0, 6)}...{player.address.slice(-4)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Waiting {Math.floor((Date.now() - player.joinedAt) / 1000)}s
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-500 mb-4">
            Match ID: {matchId?.slice(0, 8)}...
          </div>

          {/* Cancel Button */}
          <button
            onClick={onBack}
            className="text-avalanche-600 hover:text-avalanche-700 font-medium"
          >
            Cancel Matchmaking
          </button>
        </div>
      </div>
    </div>
  )
}
