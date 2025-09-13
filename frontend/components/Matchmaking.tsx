'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Loader2, Users, X } from 'lucide-react'

interface MatchmakingProps {
  onMatchFound: (match: any) => void
  onBack: () => void
  isDemoMode?: boolean
  playerAddress?: string
}

export function Matchmaking({ onMatchFound, onBack, isDemoMode = false, playerAddress }: MatchmakingProps) {
  const { address } = useAccount()
  const [status, setStatus] = useState<'searching' | 'found' | 'error'>('searching')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const currentAddress = isDemoMode ? playerAddress : address
    if (!currentAddress) return

    const findMatch = async () => {
      try {
        const response = await fetch('http://localhost:3001/match', {
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
          setStatus('searching')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('error')
      }
    }

    findMatch()
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
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-avalanche-100 rounded-full flex items-center justify-center mb-6">
            <Users className="w-8 h-8 text-avalanche-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Finding Opponent</h2>
          <p className="text-gray-600 mb-6">
            {status === 'searching' 
              ? 'Searching for an opponent...' 
              : 'Match found! Starting duel...'
            }
          </p>
          
          <div className="flex justify-center mb-6">
            <Loader2 className="w-8 h-8 text-avalanche-500 animate-spin" />
          </div>
          
          <div className="text-sm text-gray-500">
            Match ID: {matchId?.slice(0, 8)}...
          </div>
        </div>
      </div>
    </div>
  )
}
