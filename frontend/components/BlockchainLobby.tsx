'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useBalance } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'

interface Player {
  id: string
  address: string
  isReady: boolean
  stakeAmount: string
  isStaked: boolean
}

interface BlockchainLobbyProps {
  onDuelStart: (lobbyData: any) => void
  onBack: () => void
}

// Contract configuration - AVAX Duel Escrow
const CONTRACT_ADDRESS = "0x16F974aaeEa37A5422dF642934E7189E261C67B8" as `0x${string}`
const AVAX_DECIMALS = 18

// Contract ABI for AVAX Duel Escrow
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "createDuel",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "duelId", "type": "uint256"}],
    "name": "joinDuel",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "duelId", "type": "uint256"}, {"name": "winner", "type": "address"}],
    "name": "finalizeDuel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "duelId", "type": "uint256"}],
    "name": "getDuel",
    "outputs": [{"components": [{"name": "playerA", "type": "address"}, {"name": "playerB", "type": "address"}, {"name": "stakeAmount", "type": "uint256"}, {"name": "isActive", "type": "bool"}, {"name": "isCompleted", "type": "bool"}, {"name": "startTime", "type": "uint256"}], "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function BlockchainLobby({ onDuelStart, onBack }: BlockchainLobbyProps) {
  const { address } = useAccount()
  const [lobbyId, setLobbyId] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [stakeAmount, setStakeAmount] = useState('0.01')
  const [players, setPlayers] = useState<Player[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [duelId, setDuelId] = useState<number | null>(null)
  const [isStaked, setIsStaked] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [totalPool, setTotalPool] = useState('0')
  const [joinLobbyId, setJoinLobbyId] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  const { writeContract: writeDuelContract } = useWriteContract()
  const { data: avaxBalance } = useBalance({ address })

  // WebSocket connection
  useEffect(() => {
    if (!address) return

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    const connectWebSocket = () => {
      // For now, skip WebSocket connection in production
      if (process.env.NODE_ENV === 'production') {
        console.log('WebSocket disabled in production - using local state only')
        setWsConnected(true)
        return
      }
      
      const websocket = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3004')
      wsRef.current = websocket

      websocket.onopen = () => {
        console.log('Blockchain lobby WebSocket connected')
        setWsConnected(true)
        setWs(websocket)
        
        // Join lobby if we have a lobbyId
        if (lobbyId) {
          const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          websocket.send(JSON.stringify({
            type: 'join_lobby',
            lobbyId: lobbyId,
            playerId: playerId,
            playerAddress: address
          }))
        }
      }

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('Blockchain lobby message:', message)

          switch (message.type) {
            case 'lobby_created':
              setLobbyId(message.lobbyId)
              setDuelId(message.duelId)
              setIsCreator(true)
              setPlayers(message.players || [])
              setTotalPool((parseFloat(stakeAmount) * 2).toFixed(3))
              break
            case 'lobby_joined':
              setPlayers(message.players || [])
              setTotalPool((parseFloat(stakeAmount) * 2).toFixed(3))
              break
            case 'player_ready':
              setPlayers(prev => prev.map(p => 
                p.address === message.playerAddress 
                  ? { ...p, isReady: true }
                  : p
              ))
              break
            case 'duel_started':
            case 'duel_ready':
              // Both players are ready and staked, start the duel
              console.log('Duel started message received, starting game')
              setTimeout(() => {
                onDuelStart({
                  lobbyId: message.lobbyId,
                  players: message.players,
                  duelId: duelId,
                  stakeAmount: stakeAmount
                })
              }, 500)
              break
            case 'error':
              console.error('Lobby error:', message.message)
              alert(`Lobby Error: ${message.message}`)
              break
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      websocket.onclose = () => {
        console.log('Blockchain lobby WebSocket disconnected')
        setWsConnected(false)
        setWs(null)
        
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }

      websocket.onerror = (error) => {
        console.error('Blockchain lobby WebSocket error:', error)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [address, lobbyId, duelId, stakeAmount, onDuelStart])

  const createLobby = async () => {
    if (!address) return

    setIsCreating(true)
    try {
      // Convert AVAX amount to wei
      const stakeAmountWei = parseUnits(stakeAmount, AVAX_DECIMALS)

      // Create duel on blockchain with AVAX
      await writeDuelContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createDuel',
        value: stakeAmountWei,
      })

      // Generate a unique lobby ID
      const newLobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newDuelId = Date.now()
      
      setLobbyId(newLobbyId)
      setDuelId(newDuelId)
      setIsCreator(true)
      setIsStaked(true)
      setTotalPool((parseFloat(stakeAmount) * 2).toFixed(3))
      
      // Create lobby on WebSocket server
      if (ws) {
        const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        ws.send(JSON.stringify({
          type: 'create_lobby',
          lobbyId: newLobbyId,
          playerId: playerId,
          playerAddress: address,
          stakeAmount: stakeAmount,
          duelId: newDuelId
        }))
      }

      console.log('Lobby created successfully')
    } catch (error) {
      console.error('Failed to create lobby:', error)
      alert('Transaction failed. Please try again or check your wallet.')
    } finally {
      setIsCreating(false)
    }
  }

  const joinLobby = async () => {
    if (!address || !joinLobbyId) return
    

    setIsJoining(true)
    try {
      // First, try to join the lobby on WebSocket to get the duelId
      if (ws) {
        const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        ws.send(JSON.stringify({
          type: 'join_lobby',
          lobbyId: joinLobbyId,
          playerId: playerId,
          playerAddress: address,
          stakeAmount: stakeAmount
        }))
      }

      // Wait a moment for the lobby info
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Convert AVAX amount to wei
      const stakeAmountWei = parseUnits(stakeAmount, AVAX_DECIMALS)

      // Join duel on blockchain with AVAX
      if (duelId) {
        await writeDuelContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'joinDuel',
          args: [BigInt(duelId)],
          value: stakeAmountWei,
        })
      }

      setLobbyId(joinLobbyId)
      setIsStaked(true)
      setTotalPool((parseFloat(stakeAmount) * 2).toFixed(3))
      console.log('Joined lobby successfully')
    } catch (error) {
      console.error('Failed to join lobby:', error)
      alert('Transaction failed. Please try again or check your wallet.')
    } finally {
      setIsJoining(false)
    }
  }

  const markReady = () => {
    if (ws && address) {
      ws.send(JSON.stringify({
        type: 'player_ready',
        lobbyId: lobbyId,
        playerAddress: address
      }))
    }
  }

  const formatAVAXBalance = () => {
    if (!avaxBalance) return '0'
    return formatUnits(avaxBalance.value, avaxBalance.decimals)
  }

  const isPlayerInLobby = players.some(p => p.address === address)
  const isPlayerReady = players.find(p => p.address === address)?.isReady || false
  const allPlayersReady = players.length === 2 && players.every(p => p.isReady)

  // Auto-start duel when both players are ready
  useEffect(() => {
    if (allPlayersReady && lobbyId && duelId) {
      console.log('Both players ready, starting duel automatically')
      setTimeout(() => {
        onDuelStart({
          lobbyId: lobbyId,
          players: players,
          duelId: duelId,
          stakeAmount: stakeAmount
        })
      }, 1000) // Small delay for UI feedback
    }
  }, [allPlayersReady, lobbyId, duelId, players, stakeAmount, onDuelStart])

  return (
    <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🔗 Blockchain Math Duel</h2>
          <p className="text-gray-600">Stake AVAX and battle real opponents!</p>
          <div className="text-sm text-avalanche-600 mt-2">
            Balance: {formatAVAXBalance()} AVAX
          </div>
          {totalPool !== '0' && (
            <div className="text-lg font-bold text-green-600 mt-2">
              💰 Total Pool: {totalPool} AVAX
            </div>
          )}
        </div>

        {/* Stake Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stake Amount (AVAX)
          </label>
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            min="0.01"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-avalanche-500 focus:border-transparent"
            disabled={isStaked}
          />
          <p className="text-xs text-gray-500 mt-1">Minimum: 0.01 AVAX</p>
        </div>

        {/* Lobby Actions */}
        {!lobbyId ? (
          <div className="space-y-4">
            <button
              onClick={createLobby}
              disabled={isCreating || isStaked}
              className="w-full bg-avalanche-500 hover:bg-avalanche-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {isCreating ? 'Creating Lobby...' : 'Create Lobby & Stake'}
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinLobbyId}
                  onChange={(e) => setJoinLobbyId(e.target.value)}
                  placeholder="Enter Lobby ID to join"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-avalanche-500 focus:border-transparent"
                />
                <button
                  onClick={joinLobby}
                  disabled={isJoining || !joinLobbyId || isStaked}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
                >
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Ask the lobby creator for the Lobby ID
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Lobby Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Lobby: {lobbyId}</h3>
              <div className="text-sm text-gray-600 mb-2">
                Stake: {stakeAmount} AVAX per player
              </div>
              <div className="text-lg font-bold text-green-600">
                💰 Total Pool: {totalPool} AVAX
              </div>
              {isCreator && (
                <div className="text-xs text-blue-600 mt-1">
                  You are the lobby creator
                </div>
              )}
            </div>

            {/* Players List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Players ({players.length}/2)</h4>
              {players.map((player, index) => (
                <div key={player.address} className={`flex items-center justify-between p-3 rounded-lg ${
                  player.address === address ? 'bg-avalanche-50 border-2 border-avalanche-500' : 'bg-gray-50 border-2 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-avalanche-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">
                        {player.address === address ? 'You' : 'Opponent'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.address.slice(0, 6)}...{player.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.isStaked && (
                      <span className="text-green-600 text-sm">💰 Staked</span>
                    )}
                    {player.isReady && (
                      <span className="text-blue-600 text-sm">✅ Ready</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Ready Button */}
            {isPlayerInLobby && !isPlayerReady && (
              <button
                onClick={markReady}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                I'm Ready!
              </button>
            )}

            {/* Waiting Message */}
            {isPlayerReady && !allPlayersReady && (
              <div className="text-center text-gray-600">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-avalanche-500 mx-auto mb-2"></div>
                Waiting for opponent to be ready...
              </div>
            )}

            {/* Game Starting */}
            {allPlayersReady && (
              <div className="text-center text-green-600 font-semibold">
                🎮 Both players ready! Starting duel...
              </div>
            )}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 font-medium"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}
