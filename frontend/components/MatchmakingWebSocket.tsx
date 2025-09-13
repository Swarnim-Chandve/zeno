'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Loader2, Users, X, Clock, User, Wifi, WifiOff } from 'lucide-react'

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

export function MatchmakingWebSocket({ onMatchFound, onBack, isDemoMode = false, playerAddress }: MatchmakingProps) {
  const { address } = useAccount()
  const [status, setStatus] = useState<'searching' | 'found' | 'error' | 'waiting' | 'connecting'>('connecting')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([])
  const [totalOnline, setTotalOnline] = useState(0)
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [joinLobbyId, setJoinLobbyId] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const playerIdRef = useRef<string | null>(null)

  // Join lobby function
  const joinLobby = async () => {
    const currentAddress = isDemoMode ? playerAddress : address
    if (!currentAddress) return

    const playerId = playerIdRef.current || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    playerIdRef.current = playerId

    try {
      const response = await fetch(`/api/websocket?action=join-lobby&playerId=${playerId}&playerAddress=${currentAddress}&lobbyId=${joinLobbyId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const text = await response.text()
      let data
      
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response text:', text)
        throw new Error('Invalid JSON response from server')
      }
      
      if (data.type === 'player_joined') {
        setLobbyId(joinLobbyId)
        setMatchId(joinLobbyId)
        setStatus('waiting')
        
        // Start polling for game start
        const pollForGameStart = async () => {
          try {
            const statusResponse = await fetch(`/api/websocket?action=get-lobby-status&lobbyId=${joinLobbyId}`)
            
            if (!statusResponse.ok) {
              throw new Error(`HTTP error! status: ${statusResponse.status}`)
            }
            
            const statusText = await statusResponse.text()
            let statusData
            
            try {
              statusData = JSON.parse(statusText)
            } catch (parseError) {
              console.error('JSON parse error in polling:', parseError)
              console.error('Response text:', statusText)
              throw new Error('Invalid JSON response from server')
            }
            
            if (statusData.status === 'playing') {
              setStatus('found')
              onMatchFound({
                matchId: joinLobbyId,
                status: 'ready',
                players: statusData.players,
                playerAddress: currentAddress
              })
            } else {
              // Continue polling
              setTimeout(pollForGameStart, 1000)
            }
          } catch (error) {
            console.error('Error polling for game start:', error)
            setStatus('error')
            setError(`Failed to check game status: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
        
        // Start polling after a short delay
        setTimeout(pollForGameStart, 1000)
      } else if (data.error) {
        setStatus('error')
        setError(data.error)
      }
    } catch (error) {
      console.error('Error joining lobby:', error)
      setStatus('error')
      setError(`Failed to join lobby: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // WebSocket/API connection
  useEffect(() => {
    const currentAddress = isDemoMode ? playerAddress : address
    if (!currentAddress) return

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    playerIdRef.current = playerId

    // Use production API for WebSocket functionality
    const isProduction = process.env.NODE_ENV === 'production'
    const wsUrl = isProduction 
      ? null // Use API instead of WebSocket in production
      : 'ws://localhost:3004'

    console.log('Connecting to WebSocket:', wsUrl)
    
    // If production, use API-based system
    if (isProduction) {
      console.log('Using production API system')
      setIsConnected(true)
      setStatus('searching')
      
      // Create lobby using API
      const createLobby = async () => {
        try {
          const response = await fetch(`/api/websocket?action=create-lobby&playerId=${playerId}&playerAddress=${currentAddress}`)
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const text = await response.text()
          let data
          
          try {
            data = JSON.parse(text)
          } catch (parseError) {
            console.error('JSON parse error:', parseError)
            console.error('Response text:', text)
            throw new Error('Invalid JSON response from server')
          }
          
          if (data.type === 'lobby_created') {
            setLobbyId(data.lobbyId)
            setMatchId(data.lobbyId)
            setStatus('waiting')
            
            // Start polling for other players
            const pollForPlayers = async () => {
              try {
                const statusResponse = await fetch(`/api/websocket?action=get-lobby-status&lobbyId=${data.lobbyId}`)
                
                if (!statusResponse.ok) {
                  throw new Error(`HTTP error! status: ${statusResponse.status}`)
                }
                
                const statusText = await statusResponse.text()
                let statusData
                
                try {
                  statusData = JSON.parse(statusText)
                } catch (parseError) {
                  console.error('JSON parse error in polling:', parseError)
                  console.error('Response text:', statusText)
                  throw new Error('Invalid JSON response from server')
                }
                
                if (statusData.players.length >= 2) {
                  setStatus('found')
                  onMatchFound({
                    matchId: data.lobbyId,
                    status: 'ready',
                    players: statusData.players,
                    playerAddress: currentAddress
                  })
                } else {
                  // Continue polling
                  setTimeout(pollForPlayers, 1000)
                }
              } catch (error) {
                console.error('Error polling for players:', error)
                setStatus('error')
                setError(`Failed to check for players: ${error instanceof Error ? error.message : 'Unknown error'}`)
              }
            }
            
            // Start polling after a short delay
            setTimeout(pollForPlayers, 1000)
          }
        } catch (error) {
          console.error('Error creating lobby:', error)
          setStatus('error')
          setError(`Failed to create lobby: ${error instanceof Error ? error.message : 'Unknown error'}`)
          
          // Retry mechanism
          if (retryCount < 3) {
            setRetryCount(prev => prev + 1)
            setTimeout(() => {
              setStatus('connecting')
              setError(null)
              createLobby()
            }, 2000 * retryCount) // Exponential backoff
          }
        }
      }

      
      if (mode === 'create') {
        createLobby()
      } else if (mode === 'join' && joinLobbyId) {
        joinLobby()
      }
      return
    }
    
    try {
      const ws = new WebSocket(wsUrl!)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setStatus('searching')
        
        // Create a new lobby
        ws.send(JSON.stringify({
          type: 'create_lobby',
          playerId,
          playerAddress: currentAddress
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('WebSocket message:', message)
          
          switch (message.type) {
            case 'lobby_created':
              setLobbyId(message.lobbyId)
              setMatchId(message.lobbyId)
              setStatus('waiting')
              break
              
            case 'player_joined':
              setStatus('found')
              onMatchFound({
                matchId: message.lobbyId,
                status: 'ready',
                players: message.players,
                playerAddress: currentAddress
              })
              break
              
            case 'game_started':
              // Game is starting
              break
              
            case 'error':
              setError(message.message)
              setStatus('error')
              break
              
            case 'lobby_status':
              setWaitingPlayers(message.players.map((pId: string) => ({
                address: pId,
                joinedAt: Date.now()
              })))
              setTotalOnline(message.players.length)
              break
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        setStatus('error')
        setError('Connection lost. Please try again.')
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
        setStatus('error')
        setError('Connection failed. Please check your internet connection.')
      }

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setStatus('error')
      setError('Failed to connect to game server')
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [address, onMatchFound, isDemoMode, playerAddress])

  // Poll for online players
  useEffect(() => {
    if (!isConnected) return

    const pollOnlinePlayers = async () => {
      try {
        const response = await fetch('/api/online-players')
        if (response.ok) {
          const data = await response.json()
          setTotalOnline(data.totalOnline)
          setWaitingPlayers(data.waitingPlayers)
        }
      } catch (err) {
        console.error('Failed to fetch online players:', err)
      }
    }

    // Poll every 2 seconds for more real-time updates
    const interval = setInterval(pollOnlinePlayers, 2000)
    pollOnlinePlayers() // Initial fetch

    return () => clearInterval(interval)
  }, [isConnected])

  const handleRefresh = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'get_lobby_status',
        lobbyId: lobbyId
      }))
    }
  }

  const getStatusMessage = () => {
    if (!isConnected) return 'Connecting to game server...'
    if (status === 'waiting') return 'Waiting for another player...'
    if (status === 'found') return 'Match found! Starting game...'
    if (status === 'error') return error || 'Something went wrong'
    return 'Searching for players...'
  }

  const getStatusIcon = () => {
    if (!isConnected) return <Loader2 className="w-5 h-5 animate-spin" />
    if (status === 'waiting') return <Clock className="w-5 h-5" />
    if (status === 'found') return <Users className="w-5 h-5 text-green-500" />
    if (status === 'error') return <X className="w-5 h-5 text-red-500" />
    return <Loader2 className="w-5 h-5 animate-spin" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Math Duel</h1>
          <p className="text-white/80">Find your opponent and battle!</p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <span className="text-white/80 text-sm">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Online Players Count */}
        <div className="bg-white/10 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">
                {totalOnline} Player{totalOnline !== 1 ? 's' : ''} Online
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="text-blue-400 hover:text-blue-300 transition-colors"
              disabled={!isConnected}
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
          
          {totalOnline > 0 && (
            <div className="mt-2 text-sm text-white/70">
              {waitingPlayers.length} waiting for match
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="bg-white/10 rounded-lg p-4 mb-6">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                mode === 'create' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/20 text-white/70 hover:bg-white/30'
              }`}
            >
              Create Lobby
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                mode === 'join' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/20 text-white/70 hover:bg-white/30'
              }`}
            >
              Join Lobby
            </button>
          </div>
          
          {mode === 'join' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter Lobby ID"
                value={joinLobbyId}
                onChange={(e) => setJoinLobbyId(e.target.value)}
                className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={() => {
                  if (joinLobbyId.trim()) {
                    setStatus('connecting')
                    setError(null)
                    joinLobby()
                  }
                }}
                disabled={!joinLobbyId.trim() || status === 'connecting'}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Join Lobby
              </button>
            </div>
          )}
        </div>

        {/* Status Display */}
        <div className="bg-white/10 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center space-x-3 mb-4">
            {getStatusIcon()}
            <span className="text-white font-medium text-lg">
              {getStatusMessage()}
            </span>
          </div>

          {status === 'waiting' && (
            <div className="text-center">
              <div className="animate-pulse text-white/60">
                Share this lobby ID: <span className="font-mono bg-white/20 px-2 py-1 rounded">{lobbyId}</span>
              </div>
            </div>
          )}

          {status === 'found' && (
            <div className="text-center">
              <div className="text-green-400 font-medium">
                🎮 Game starting in 3 seconds...
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="text-red-400 font-medium mb-2">
                Connection Error
              </div>
              <div className="text-red-300 text-sm mb-4">
                {error}
              </div>
              {retryCount > 0 && retryCount < 3 && (
                <div className="text-xs text-red-300 mb-2">
                  Retrying... (Attempt {retryCount + 1}/3)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onBack}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          {status === 'error' && (
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-white/50">
            <div>Player ID: {playerIdRef.current}</div>
            <div>Lobby ID: {lobbyId}</div>
            <div>Status: {status}</div>
          </div>
        )}
      </div>
    </div>
  )
}
