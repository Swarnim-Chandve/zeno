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
  const [totalOnline, setTotalOnline] = useState(0)
  // Frontend-only matchmaking as workaround for API issues
  const [localMatches, setLocalMatches] = useState<Map<string, any>>(new Map())
  const [localPlayers, setLocalPlayers] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const currentAddress = isDemoMode ? playerAddress : address
    if (!currentAddress) return

    // For deployed version, use polling only (WebSocket disabled)
    // No WebSocket setup needed

    // Frontend-only matchmaking system
    const findMatch = () => {
      try {
        // Check if player is already in a match
        if (localPlayers.has(currentAddress)) {
          setError('Player already in a match')
          setStatus('error')
          return
        }
        
        // Look for available match or create new one
        let foundMatchId = null
        for (const [id, match] of localMatches) {
          if (match.players.length === 1 && !match.players.includes(currentAddress)) {
            foundMatchId = id
            break
          }
        }
        
        if (!foundMatchId) {
          // Create new match
          foundMatchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const newMatch = {
            id: foundMatchId,
            players: [currentAddress],
            questions: [],
            answers: new Map(),
            status: 'waiting',
            createdAt: Date.now()
          }
          setLocalMatches(prev => new Map(prev).set(foundMatchId, newMatch))
          setStatus('waiting')
        } else {
          // Join existing match
          setLocalMatches(prev => {
            const newMap = new Map(prev)
            const match = newMap.get(foundMatchId)
            if (match) {
              match.players.push(currentAddress)
              match.status = 'ready'
            }
            return newMap
          })
          setStatus('found')
          onMatchFound({ 
            matchId: foundMatchId, 
            status: 'ready', 
            players: [currentAddress, ...(localMatches.get(foundMatchId)?.players || [])],
            playerAddress: currentAddress 
          })
        }
        
        setMatchId(foundMatchId)
        setLocalPlayers(prev => new Map(prev).set(currentAddress, foundMatchId))
        
      } catch (err) {
        console.error('Matchmaking error:', err)
        setError('Matchmaking failed')
        setStatus('error')
      }
    }

    findMatch()

    // Update online player count from local state
    const updateOnlineCount = () => {
      const allWaitingPlayers = Array.from(localMatches.values())
        .filter(match => match.status === 'waiting')
        .flatMap(match => match.players.map(address => ({
          address,
          joinedAt: match.createdAt
        })));
      
      setWaitingPlayers(allWaitingPlayers)
      setTotalOnline(allWaitingPlayers.length)
    }
    
    // Update online count every 2 seconds
    const pollInterval = setInterval(updateOnlineCount, 2000)
    
    // Initial update
    updateOnlineCount()

    return () => {
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
          
          {/* Online Players Count */}
          <div className="bg-avalanche-50 border border-avalanche-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-avalanche-500" />
              <span className="text-lg font-semibold text-avalanche-700">
                {totalOnline} Player{totalOnline !== 1 ? 's' : ''} Online
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-sm text-avalanche-600 mb-3">
              {totalOnline === 0 
                ? 'Be the first to join the queue!' 
                : totalOnline === 1 
                ? '1 player waiting for a match' 
                : `${totalOnline} players looking for opponents`
              }
            </p>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/match')
                  if (response.ok) {
                    const data = await response.json()
                    setWaitingPlayers(data.waitingPlayers || [])
                    setTotalOnline(data.totalWaiting || 0)
                  }
                } catch (err) {
                  console.log('Refresh error:', err)
                }
              }}
              className="text-xs text-avalanche-600 hover:text-avalanche-700 underline"
            >
              🔄 Refresh Queue
            </button>
          </div>
          
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
