'use client'

import { useState, useEffect } from 'react'
import { Trophy, Medal, Award, Users, Zap, Crown } from 'lucide-react'

interface PlayerScore {
  address: string
  score: number
  gamesPlayed: number
  wins: number
  losses: number
  winRate: number
  lastPlayed: number
  isOnline: boolean
}

interface LeaderboardProps {
  className?: string
  showOnlineOnly?: boolean
  maxPlayers?: number
}

export function Leaderboard({ 
  className = '', 
  showOnlineOnly = false, 
  maxPlayers = 10 
}: LeaderboardProps) {
  const [players, setPlayers] = useState<PlayerScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        // Try to load from localStorage first
        const savedData = localStorage.getItem('math-duel-leaderboard')
        if (savedData) {
          const parsedData = JSON.parse(savedData)
          setPlayers(parsedData)
        } else {
          // Initialize with some demo data
          const demoPlayers: PlayerScore[] = [
            {
              address: '0x1234...5678',
              score: 1250,
              gamesPlayed: 15,
              wins: 12,
              losses: 3,
              winRate: 80,
              lastPlayed: Date.now() - 1000 * 60 * 5, // 5 minutes ago
              isOnline: true
            },
            {
              address: '0x9876...4321',
              score: 1180,
              gamesPlayed: 12,
              wins: 9,
              losses: 3,
              winRate: 75,
              lastPlayed: Date.now() - 1000 * 60 * 15, // 15 minutes ago
              isOnline: true
            },
            {
              address: '0x5555...7777',
              score: 950,
              gamesPlayed: 8,
              wins: 5,
              losses: 3,
              winRate: 62.5,
              lastPlayed: Date.now() - 1000 * 60 * 30, // 30 minutes ago
              isOnline: false
            }
          ]
          setPlayers(demoPlayers)
          localStorage.setItem('math-duel-leaderboard', JSON.stringify(demoPlayers))
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadLeaderboard()
  }, [])

  // Update leaderboard every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date())
      
      // Simulate some players going online/offline
      setPlayers(prev => prev.map(player => ({
        ...player,
        isOnline: Math.random() > 0.3 // 70% chance of being online
      })))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Add new player score
  const addPlayerScore = (address: string, score: number, won: boolean) => {
    setPlayers(prev => {
      const existingPlayer = prev.find(p => p.address === address)
      
      if (existingPlayer) {
        // Update existing player
        const updatedPlayer = {
          ...existingPlayer,
          score: existingPlayer.score + score,
          gamesPlayed: existingPlayer.gamesPlayed + 1,
          wins: existingPlayer.wins + (won ? 1 : 0),
          losses: existingPlayer.losses + (won ? 0 : 1),
          winRate: ((existingPlayer.wins + (won ? 1 : 0)) / (existingPlayer.gamesPlayed + 1)) * 100,
          lastPlayed: Date.now(),
          isOnline: true
        }
        
        const updatedPlayers = prev.map(p => p.address === address ? updatedPlayer : p)
        localStorage.setItem('math-duel-leaderboard', JSON.stringify(updatedPlayers))
        return updatedPlayers
      } else {
        // Add new player
        const newPlayer: PlayerScore = {
          address,
          score: Math.max(0, score),
          gamesPlayed: 1,
          wins: won ? 1 : 0,
          losses: won ? 0 : 1,
          winRate: won ? 100 : 0,
          lastPlayed: Date.now(),
          isOnline: true
        }
        
        const updatedPlayers = [...prev, newPlayer]
        localStorage.setItem('math-duel-leaderboard', JSON.stringify(updatedPlayers))
        return updatedPlayers
      }
    })
  }

  // Expose function globally for other components to use
  useEffect(() => {
    (window as any).addPlayerScore = addPlayerScore
    return () => {
      delete (window as any).addPlayerScore
    }
  }, [])

  const filteredPlayers = showOnlineOnly 
    ? players.filter(p => p.isOnline)
    : players

  const sortedPlayers = filteredPlayers
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPlayers)

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return <span className="text-white/60 font-bold text-sm">#{index + 1}</span>
    }
  }

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (isLoading) {
    return (
      <div className={`bg-white/10 backdrop-blur-lg rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Leaderboard</h2>
        </div>
        <div className="text-center text-white/60">
          <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full mx-auto mb-2"></div>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/10 backdrop-blur-lg rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Leaderboard</h2>
        </div>
        <div className="flex items-center space-x-2 text-sm text-white/60">
          <Users className="w-4 h-4" />
          <span>{filteredPlayers.length} players</span>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-white/50 mb-4 text-center">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      {/* Players List */}
      <div className="space-y-3">
        {sortedPlayers.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No players yet</p>
            <p className="text-sm">Be the first to play!</p>
          </div>
        ) : (
          sortedPlayers.map((player, index) => (
            <div
              key={player.address}
              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                index < 3 
                  ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {/* Rank & Player Info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8">
                  {getRankIcon(index)}
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-white font-medium">
                    {formatAddress(player.address)}
                  </div>
                  {player.isOnline && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>

              {/* Score & Stats */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="text-right">
                  <div className="text-white font-bold">{player.score}</div>
                  <div className="text-white/60">points</div>
                </div>
                
                <div className="text-right">
                  <div className="text-white">{player.winRate.toFixed(0)}%</div>
                  <div className="text-white/60">win rate</div>
                </div>
                
                <div className="text-right">
                  <div className="text-white">{player.gamesPlayed}</div>
                  <div className="text-white/60">games</div>
                </div>
                
                <div className="text-right text-xs text-white/50">
                  {formatTimeAgo(player.lastPlayed)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-center space-x-2 text-xs text-white/50">
          <Zap className="w-3 h-3" />
          <span>Real-time updates</span>
        </div>
      </div>
    </div>
  )
}
