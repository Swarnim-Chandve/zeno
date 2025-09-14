'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { ArrowLeft, Clock, Trophy, Zap, CheckCircle, XCircle, Coins } from 'lucide-react'
import { parseUnits, formatUnits } from 'viem'

interface DuelScreenProps {
  match: {
    matchId: string
    status: string
    players: string[]
    playerAddress: string
    duelId?: number
    stakeAmount?: string
    stakeToken?: 'AVAX' | 'USDC'
  }
  onBack: () => void
  isDemoMode?: boolean
}

// Contract configuration - AVAX Duel Escrow
const AVAX_CONTRACT_ADDRESS = "0x16F974aaeEa37A5422dF642934E7189E261C67B8" as `0x${string}`
const USDC_CONTRACT_ADDRESS = "0x59a564EFAC88524a5358a2aCD298Ed82c91c1642" as `0x${string}`
const USDC_TOKEN_ADDRESS = "0x356333ea7c55A4618d26ea355FBa93801A0A3A15" as `0x${string}`
const AVAX_DECIMALS = 18
const USDC_DECIMALS = 6

// Contract ABI for AVAX Duel Escrow
const AVAX_CONTRACT_ABI = [
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

// Contract ABI for USDC Duel Escrow
const USDC_CONTRACT_ABI = [
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
    "outputs": [{"components": [{"name": "playerA", "type": "address"}, {"name": "playerB", "type": "address"}, {"name": "stakeAmount", "type": "uint256"}, {"name": "isActive", "type": "bool"}, {"name": "isCompleted", "type": "bool"}], "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

interface Question {
  id: number
  question: string
  answer: number
  timeLimit: number
}

interface PlayerAnswer {
  questionId: number
  answer: number
  isCorrect: boolean
  timestamp: number
}

interface Player {
  id: string
  address: string
  score: number
  answers: PlayerAnswer[]
}

export function DuelScreenWebSocket({ match, onBack, isDemoMode = false }: DuelScreenProps) {
  const { address } = useAccount()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(30) // Total game time: 30 seconds
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting')
  const [players, setPlayers] = useState<Player[]>([])
  const [opponentAnswers, setOpponentAnswers] = useState<PlayerAnswer[]>([])
  const [userAnswers, setUserAnswers] = useState<PlayerAnswer[]>([])
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [scoreAnimation, setScoreAnimation] = useState<'user' | 'opponent' | null>(null)
  const [inputStatus, setInputStatus] = useState<'neutral' | 'correct' | 'incorrect'>('neutral')
  const [autoSubmitTimer, setAutoSubmitTimer] = useState<NodeJS.Timeout | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [poolAmount, setPoolAmount] = useState('0')
  const [duelId, setDuelId] = useState<number | null>(match.duelId || null)
  const [stakeToken, setStakeToken] = useState<'AVAX' | 'USDC'>(match.stakeToken || 'AVAX')
  
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentAddress = isDemoMode ? match.playerAddress : address

  // Contract interactions
  const { writeContract: writeContract } = useWriteContract()

  // WebSocket/API connection
  useEffect(() => {
    if (!currentAddress) return

    const isProduction = process.env.NODE_ENV === 'production'
    const wsUrl = isProduction 
      ? null // Use API instead of WebSocket in production
      : 'ws://localhost:3004'

    console.log('Connecting to WebSocket for duel:', wsUrl)
    
    // If production, use API-based system
    if (isProduction) {
      console.log('Using production API system for duel')
      setWsConnected(true)
      setGameStatus('playing')
      
      // Start game using API
      const startGame = async () => {
        try {
          const response = await fetch(`/api/websocket?action=start-game&lobbyId=${match.matchId}`)
          const data = await response.json()
          
          if (data.type === 'game_started') {
            setQuestions(data.questions)
            setPlayers([
              { id: currentAddress, address: currentAddress, score: 0, answers: [] },
              { id: 'opponent', address: 'opponent', score: 0, answers: [] }
            ])
          } else {
            // Generate real-time questions if API fails
            const generateQuestions = () => {
              const questions = []
              const difficultyLevels = ['very_easy', 'easy', 'medium']
              
              for (let i = 0; i < 5; i++) {
                const difficulty = difficultyLevels[Math.floor(Math.random() * difficultyLevels.length)]
                let question, answer
                
                switch (difficulty) {
                  case 'very_easy':
                    const a1 = Math.floor(Math.random() * 9) + 1
                    const b1 = Math.floor(Math.random() * 9) + 1
                    if (Math.random() > 0.5) {
                      question = `${a1} + ${b1}`
                      answer = a1 + b1
                    } else {
                      const larger1 = Math.max(a1, b1)
                      const smaller1 = Math.min(a1, b1)
                      question = `${larger1} - ${smaller1}`
                      answer = larger1 - smaller1
                    }
                    break
                    
                  case 'easy':
                    const operation = Math.random()
                    if (operation < 0.4) {
                      const a2 = Math.floor(Math.random() * 20) + 1
                      const b2 = Math.floor(Math.random() * 20) + 1
                      question = `${a2} + ${b2}`
                      answer = a2 + b2
                    } else if (operation < 0.8) {
                      const a3 = Math.floor(Math.random() * 30) + 10
                      const b3 = Math.floor(Math.random() * 20) + 1
                      question = `${a3} - ${b3}`
                      answer = a3 - b3
                    } else {
                      const a4 = Math.floor(Math.random() * 9) + 1
                      const b4 = Math.floor(Math.random() * 9) + 1
                      question = `${a4} × ${b4}`
                      answer = a4 * b4
                    }
                    break
                    
                  case 'medium':
                    const op = Math.random()
                    if (op < 0.3) {
                      const a5 = Math.floor(Math.random() * 9) + 1
                      const b5 = Math.floor(Math.random() * 9) + 1
                      question = `${a5} × ${b5}`
                      answer = a5 * b5
                    } else if (op < 0.6) {
                      const a6 = Math.floor(Math.random() * 8) + 2
                      const b6 = Math.floor(Math.random() * 8) + 2
                      const result = a6 * b6
                      question = `${result} ÷ ${a6}`
                      answer = b6
                    } else {
                      const a7 = Math.floor(Math.random() * 15) + 5
                      const b7 = Math.floor(Math.random() * 15) + 5
                      const c7 = Math.floor(Math.random() * 5) + 1
                      question = `${a7} + ${b7} - ${c7}`
                      answer = a7 + b7 - c7
                    }
                    break
                }
                
                questions.push({
                  id: i,
                  question: question || '',
                  answer: answer || 0,
                  timeLimit: 20
                })
              }
              return questions
            }
            
            setQuestions(generateQuestions())
            setPlayers([
              { id: currentAddress, address: currentAddress, score: 0, answers: [] },
              { id: 'opponent', address: 'opponent', score: 0, answers: [] }
            ])
            setGameStatus('playing')
            // DON'T reset timer - let it continue from where it was
          }
        } catch (error) {
          console.error('Error starting game:', error)
          // Generate real-time questions as fallback
          const generateQuestions = () => {
            const questions = []
            const difficultyLevels = ['very_easy', 'easy', 'medium']
            
            for (let i = 0; i < 5; i++) {
              const difficulty = difficultyLevels[Math.floor(Math.random() * difficultyLevels.length)]
              let question, answer
              
              switch (difficulty) {
                case 'very_easy':
                  const a1 = Math.floor(Math.random() * 9) + 1
                  const b1 = Math.floor(Math.random() * 9) + 1
                  if (Math.random() > 0.5) {
                    question = `${a1} + ${b1}`
                    answer = a1 + b1
                  } else {
                    const larger1 = Math.max(a1, b1)
                    const smaller1 = Math.min(a1, b1)
                    question = `${larger1} - ${smaller1}`
                    answer = larger1 - smaller1
                  }
                  break
                  
                case 'easy':
                  const operation = Math.random()
                  if (operation < 0.4) {
                    const a2 = Math.floor(Math.random() * 20) + 1
                    const b2 = Math.floor(Math.random() * 20) + 1
                    question = `${a2} + ${b2}`
                    answer = a2 + b2
                  } else if (operation < 0.8) {
                    const a3 = Math.floor(Math.random() * 30) + 10
                    const b3 = Math.floor(Math.random() * 20) + 1
                    question = `${a3} - ${b3}`
                    answer = a3 - b3
                  } else {
                    const a4 = Math.floor(Math.random() * 9) + 1
                    const b4 = Math.floor(Math.random() * 9) + 1
                    question = `${a4} × ${b4}`
                    answer = a4 * b4
                  }
                  break
                  
                case 'medium':
                  const op = Math.random()
                  if (op < 0.3) {
                    const a5 = Math.floor(Math.random() * 9) + 1
                    const b5 = Math.floor(Math.random() * 9) + 1
                    question = `${a5} × ${b5}`
                    answer = a5 * b5
                  } else if (op < 0.6) {
                    const a6 = Math.floor(Math.random() * 8) + 2
                    const b6 = Math.floor(Math.random() * 8) + 2
                    const result = a6 * b6
                    question = `${result} ÷ ${a6}`
                    answer = b6
                  } else {
                    const a7 = Math.floor(Math.random() * 15) + 5
                    const b7 = Math.floor(Math.random() * 15) + 5
                    const c7 = Math.floor(Math.random() * 5) + 1
                    question = `${a7} + ${b7} - ${c7}`
                    answer = a7 + b7 - c7
                  }
                  break
              }
              
              questions.push({
                id: i,
                question: question || '',
                answer: answer || 0,
                timeLimit: 20
              })
            }
            return questions
          }
          
          setQuestions(generateQuestions())
          setPlayers([
            { id: currentAddress, address: currentAddress, score: 0, answers: [] },
            { id: 'opponent', address: 'opponent', score: 0, answers: [] }
          ])
          setGameStatus('playing')
          // DON'T reset timer - let it continue from where it was
        }
      }
      
      startGame()
      return
    }
    
    try {
      const ws = new WebSocket(wsUrl!)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected for duel')
        setWsConnected(true)
        
        // Join the lobby
        ws.send(JSON.stringify({
          type: 'join_lobby',
          playerId: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          playerAddress: currentAddress,
          lobbyId: match.matchId
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('Duel WebSocket message:', message)
          
          switch (message.type) {
            case 'player_joined':
              setPlayers(message.players.map((pId: string) => ({
                id: pId,
                address: pId,
                score: 0,
                answers: []
              })))
              break
              
            case 'game_started':
              setQuestions(message.questions)
              setGameStatus('playing')
              // Extract duelId if provided
              if (message.duelId) {
                setDuelId(message.duelId)
              }
              // Don't reset timer - it should continue from where it was
              break
              
            case 'answer_submitted':
              // Update opponent's answer
              if (message.playerAddress !== currentAddress) {
                setOpponentAnswers(prev => [...prev, {
                  questionId: message.questionId,
                  answer: message.answer,
                  isCorrect: message.isCorrect,
                  timestamp: Date.now()
                }])
                
                // Update opponent's score in real-time with animation
                setPlayers(prev => prev.map(p => 
                  p.address === message.playerAddress 
                    ? { ...p, score: message.score || p.score }
                    : p
                ))
                
                // Trigger score animation for opponent
                if (message.isCorrect) {
                  setScoreAnimation('opponent')
                  setTimeout(() => setScoreAnimation(null), 500)
                }
              }
              break
              
            case 'game_finished':
              setGameStatus('finished')
              const gameResults = message.results.map((r: any) => ({
                id: r.playerId,
                address: r.playerAddress,
                score: r.score,
                answers: r.answers
              }))
              console.log('Game finished - Results:', gameResults)
              console.log('Current address:', currentAddress)
              
              // Remove duplicates based on address to ensure we only have unique players
              const uniqueResults = gameResults.filter((player: any, index: number, self: any[]) => 
                index === self.findIndex((p: any) => p.address === player.address)
              )
              console.log('Unique results:', uniqueResults)
              setPlayers(uniqueResults)
              // Store winner/loser info for display
              if (message.winner) {
                console.log(`Winner: ${message.winner} (${message.winnerScore} points)`)
                console.log(`Loser: ${message.loser} (${message.loserScore} points)`)
              } else if (message.isTie) {
                console.log(`Game ended in a tie! Both players scored ${message.winnerScore} points`)
              }
              
              // Calculate pool amount for claiming (combined stake from both players)
              const stakeAmount = match.stakeAmount || '0.01'
              const totalPool = (parseFloat(stakeAmount) * 2).toFixed(3)
              setPoolAmount(totalPool)
              break
              
            case 'lobby_status':
              setPlayers(message.playerScores.map((p: any) => ({
                id: p.playerId,
                address: p.playerId,
                score: p.score,
                answers: []
              })))
              break
              
            case 'score_update':
              // Real-time score update for any player
              console.log(`Score update received: ${message.playerAddress} scored ${message.score}`)
              setPlayers(prev => prev.map(p => {
                if (p.address === message.playerAddress) {
                  console.log(`Updating score for ${p.address}: ${p.score} -> ${message.score}`)
                  return { ...p, score: message.score }
                }
                return p
              }))
              
              // Trigger score animation with enhanced visual feedback
              if (message.playerAddress === currentAddress) {
                setScoreAnimation('user')
              } else {
                setScoreAnimation('opponent')
              }
              
              // Clear animation after a short delay
              setTimeout(() => setScoreAnimation(null), 600) // Slightly longer for better visibility
              break
              
            case 'score_sync':
              // Periodic score synchronization
              console.log('Score sync received:', message.playerScores)
              setPlayers(prev => prev.map(p => {
                const updatedPlayer = message.playerScores.find((ps: any) => {
                  // Try to match by playerId first, then by address
                  return ps.playerId === p.address || ps.playerAddress === p.address;
                });
                if (updatedPlayer) {
                  console.log(`Syncing score for ${p.address}: ${p.score} -> ${updatedPlayer.score}`)
                  return { ...p, score: updatedPlayer.score }
                }
                return p;
              }))
              break
          }
        } catch (err) {
          console.error('Error parsing duel WebSocket message:', err)
        }
      }

      ws.onclose = () => {
        console.log('Duel WebSocket disconnected')
        setWsConnected(false)
      }

      ws.onerror = (error) => {
        console.error('Duel WebSocket error:', error)
        setWsConnected(false)
      }

    } catch (err) {
      console.error('Failed to create duel WebSocket connection:', err)
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (autoSubmitTimer) {
        clearTimeout(autoSubmitTimer)
      }
    }
  }, [currentAddress, match.matchId])

  // Global game timer - 30 seconds total for both players
  useEffect(() => {
    if (gameStatus !== 'playing') {
      // Clear timer when not playing
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Only start timer if not already running
    if (timerRef.current) return

    // Start timer only once when game starts
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Game time's up - finish the game
          setGameStatus('finished')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [gameStatus])

  const handleSubmitAnswer = (answer: string) => {
    if (currentQuestionIndex >= questions.length) return

    const question = questions[currentQuestionIndex]
    const answerNum = parseInt(answer) || 0
    const correct = answerNum === question.answer

    const answerData: PlayerAnswer = {
      questionId: question.id,
      answer: answerNum,
      isCorrect: correct,
      timestamp: Date.now()
    }

    setUserAnswers(prev => [...prev, answerData])
    setIsCorrect(correct)
    setShowResult(true)

    // Update player score immediately with animation
    if (correct) {
      setPlayers(prev => prev.map(p => 
        p.address === currentAddress 
          ? { ...p, score: p.score + 1 }
          : p
      ))
      
      // Trigger score animation for user
      setScoreAnimation('user')
      setTimeout(() => setScoreAnimation(null), 500)
    }

    // Send answer to server with enhanced data
    const answerPayload = {
      type: 'submit_answer',
      playerId: currentAddress,
      playerAddress: currentAddress,
      questionId: question.id,
      answer: answerNum,
      isCorrect: correct,
      lobbyId: match.matchId,
      timestamp: Date.now()
    }

    if (process.env.NODE_ENV === 'production') {
      // Use API in production
      fetch(`/api/websocket?action=submit-answer&playerId=${currentAddress}&questionId=${question.id}&answer=${answerNum}&isCorrect=${correct}&lobbyId=${match.matchId}`)
        .then(response => response.json())
        .then(data => {
          console.log('Answer submitted via API:', data)
          // Trigger real-time score update for both players
          if (data.scoreUpdate) {
            setPlayers(prev => prev.map(p => 
              p.address === data.playerAddress 
                ? { ...p, score: data.score }
                : p
            ))
          }
        })
        .catch(error => {
          console.error('Error submitting answer:', error)
        })
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Use WebSocket in development
      wsRef.current.send(JSON.stringify(answerPayload))
    }

    // Move to next question after 200ms for super speed
    setTimeout(() => {
      setShowResult(false)
      setInputStatus('neutral')
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
        setUserAnswer('')
      } else {
        setGameStatus('finished')
      }
    }, 200) // Super fast: 200ms instead of 1000ms
  }

  // Real-time input validation
  const handleInputChange = (value: string) => {
    setUserAnswer(value)
    
    if (!value.trim()) {
      setInputStatus('neutral')
      return
    }

    const question = questions[currentQuestionIndex]
    if (!question) return

    const answerNum = parseInt(value) || 0
    const correct = answerNum === question.answer

    if (correct) {
      setInputStatus('correct')
      // Auto-submit correct answer after a short delay
      if (autoSubmitTimer) {
        clearTimeout(autoSubmitTimer)
      }
      const timer = setTimeout(() => {
        handleSubmitAnswer(value)
      }, 200) // Auto-submit after 200ms for super speed
      setAutoSubmitTimer(timer)
    } else {
      setInputStatus('incorrect')
      // Clear any existing timer
      if (autoSubmitTimer) {
        clearTimeout(autoSubmitTimer)
        setAutoSubmitTimer(null)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userAnswer.trim()) {
      handleSubmitAnswer(userAnswer)
    }
  }

  const getCurrentQuestion = () => {
    return questions[currentQuestionIndex] || null
  }

  const getPlayerScore = (playerAddress: string | undefined) => {
    if (!playerAddress || !players.length) return 0
    const player = players.find(p => p.address === playerAddress)
    const score = player ? player.score : 0
    return isNaN(score) ? 0 : Math.max(0, score)
  }

  const getOpponentScore = () => {
    if (!players.length) return 0
    const opponent = players.find(p => p.address !== currentAddress)
    const score = opponent ? opponent.score : 0
    return isNaN(score) ? 0 : Math.max(0, score)
  }

  const getWinner = () => {
    if (players.length < 2) {
      console.log('Not enough players to determine winner')
      return null
    }
    
    // Sort players by score to determine winner
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
    const [winner, loser] = sortedPlayers
    
    console.log('Player scores:', sortedPlayers.map(p => `${p.address}: ${p.score}`))
    
    if (winner.score > loser.score) {
      console.log(`Winner determined: ${winner.address} (${winner.score} points) vs ${loser.address} (${loser.score} points)`)
      return winner.address
    }
    
    console.log(`Game ended in a tie: both players scored ${winner.score} points`)
    return null // Tie
  }

  const claimPool = async () => {
    if (!duelId || !currentAddress || isDemoMode) {
      console.log('Cannot claim prize pool: missing duelId, address, or in demo mode')
      return
    }

    setIsClaiming(true)
    try {
      const winner = getWinner()
      if (!winner || winner !== currentAddress) {
        alert('Only the winner can claim the prize pool!')
        return
      }

      console.log(`Claiming prize pool for duel ${duelId}, winner: ${currentAddress}`)
      
      // Determine which contract to use based on stake token
      const contractAddress = stakeToken === 'AVAX' ? AVAX_CONTRACT_ADDRESS : USDC_CONTRACT_ADDRESS
      const contractABI = stakeToken === 'AVAX' ? AVAX_CONTRACT_ABI : USDC_CONTRACT_ABI

      // Call finalizeDuel to claim the pool
      await writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'finalizeDuel',
        args: [BigInt(duelId), currentAddress as `0x${string}`],
      })

      setClaimSuccess(true)
      console.log('Prize pool claimed successfully!')
      
      // Calculate pool amount (combined stake from both players)
      const stakeAmount = match.stakeAmount || '0.01'
      const totalPool = (parseFloat(stakeAmount) * 2).toFixed(3)
      setPoolAmount(totalPool)
      
    } catch (error) {
      console.error('Failed to claim prize pool:', error)
      alert('Failed to claim prize pool. Please try again.')
    } finally {
      setIsClaiming(false)
    }
  }

  if (gameStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20 text-center">
          <div className="mb-6">
            <Clock className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-white mb-2">Waiting for Game to Start</h2>
            <p className="text-white/80">Both players are ready. Starting soon...</p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 mb-6">
            <div className="text-white/80 mb-2">Players in lobby:</div>
            {players.map((player, index) => (
              <div key={index} className="text-white font-medium">
                {player.address === currentAddress ? 'You' : 'Opponent'} 
                {player.address === currentAddress && ' (You)'}
              </div>
            ))}
          </div>

          <button
            onClick={onBack}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  // Update leaderboard when game finishes
  useEffect(() => {
    if (gameStatus === 'finished' && currentAddress) {
      const userScore = getPlayerScore(currentAddress)
      const opponentScore = getOpponentScore()
      const isWinner = userScore > opponentScore
      const isTie = userScore === opponentScore
      
      // Calculate score points (base score + bonus for winning)
      let scorePoints = userScore * 10 // 10 points per correct answer
      if (isWinner) scorePoints += 50 // Bonus for winning
      if (isTie) scorePoints += 25 // Bonus for tie
      
      // Update leaderboard
      if ((window as any).addPlayerScore) {
        (window as any).addPlayerScore(currentAddress, scorePoints, isWinner)
      }
    }
  }, [gameStatus, currentAddress])

  if (gameStatus === 'finished') {
    const winner = getWinner()
    const isWinner = winner === currentAddress
    const isTie = !winner
    const userScore = getPlayerScore(currentAddress)
    const opponentScore = getOpponentScore()

    // Debug logging
    console.log('Game finished - Debug info:')
    console.log('Winner:', winner)
    console.log('Current address:', currentAddress)
    console.log('Is winner:', isWinner)
    console.log('Is tie:', isTie)
    console.log('User score:', userScore)
    console.log('Opponent score:', opponentScore)
    console.log('Players:', players)

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full border border-white/20 text-center">
          {/* Winner Header */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {isWinner ? 'You Won!' : isTie ? "It's a Tie!" : 'You Lost!'}
            </h1>
            <p className="text-white/80 text-lg">
              {isWinner ? 'Congratulations! You won the math duel!' : 
               isTie ? 'Both players performed equally well!' : 
               'Better luck next time!'}
            </p>
          </div>

          {/* Duel Results Card */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Duel Results</h2>
            
            {/* Player Results */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* You Section */}
              <div className={`p-4 rounded-xl ${isWinner ? 'bg-yellow-100' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span className="font-bold text-gray-800">You</span>
                  {isWinner && <span className="text-yellow-600 text-lg">👑</span>}
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  Score: {userScore}
                </div>
                <div className="text-sm text-gray-600">
                  Total Time: 300.0s
                </div>
              </div>

              {/* Opponent Section */}
              <div className={`p-4 rounded-xl ${!isWinner && !isTie ? 'bg-red-100' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="font-bold text-gray-800">Opponent</span>
                  {!isWinner && !isTie && <span className="text-red-600 text-lg">💀</span>}
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  Score: {opponentScore}
                </div>
                <div className="text-sm text-gray-600">
                  Total Time: 300.0s
                </div>
              </div>
            </div>

            {/* Questions Review */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Questions Review</h3>
              <div className="space-y-2">
                {questions.map((question, index) => {
                  const userAnswer = userAnswers.find(a => a.questionId === question.id)
                  const opponentAnswer = opponentAnswers.find(a => a.questionId === question.id)
                  
                  return (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">{question.question}</span>
                      <div className="flex gap-4 text-sm">
                        <span className={`px-2 py-1 rounded ${
                          userAnswer?.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          You: {userAnswer?.answer || 'N/A'}
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          opponentAnswer?.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          Opponent: {opponentAnswer?.answer || 'N/A'}
                        </span>
                        <span className="text-gray-600">
                          Answer: {question.answer}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Score Points Earned */}
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-lg p-4 mb-6 border border-yellow-500/30">
            <div className="text-yellow-400 font-bold text-lg">
              +{getPlayerScore(currentAddress) * 10 + (isWinner ? 50 : isTie ? 25 : 0)} points earned!
            </div>
            <div className="text-yellow-300 text-sm">
              {isWinner ? 'Winner bonus: +50' : isTie ? 'Tie bonus: +25' : 'Base score only'}
            </div>
            {isWinner && !isDemoMode && (
              <div className="text-yellow-300 text-sm mt-2">
                Prize Pool: {poolAmount || '0.02'} {stakeToken} (Combined Stake)
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onBack}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Back to Menu
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>

          {/* Claim Pool Button - Only show for winner */}
          {(() => {
            console.log('Claim button visibility check:')
            console.log('isWinner:', isWinner)
            console.log('isDemoMode:', isDemoMode)
            console.log('duelId:', duelId)
            console.log('claimSuccess:', claimSuccess)
            
            if (isWinner) {
              return (
                <div className="mt-6">
                  {claimSuccess ? (
                    <div className="bg-green-500/20 border border-green-400 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 text-green-400 mb-2">
                        <Coins className="w-6 h-6" />
                        <span className="font-bold text-lg">Prize Pool Claimed!</span>
                      </div>
                      <p className="text-green-300">
                        You've successfully claimed {poolAmount} {stakeToken} (Combined Prize Pool)!
                      </p>
                    </div>
                  ) : duelId ? (
                    <button
                      onClick={claimPool}
                      disabled={isClaiming || isDemoMode}
                      className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-yellow-500/50 disabled:to-yellow-600/50 text-white px-6 py-4 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      {isClaiming ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Claiming Prize Pool...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-6 h-6" />
                          <span>Claim Prize Pool ({poolAmount || '0.02'} {stakeToken})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 text-yellow-400 mb-2">
                        <Coins className="w-6 h-6" />
                        <span className="font-bold text-lg">Prize Pool Available</span>
                      </div>
                      <p className="text-yellow-300">
                        Prize Pool of {poolAmount || '0.02'} {stakeToken} (Combined Stake) is available for claiming!
                      </p>
                      <p className="text-yellow-300 text-sm mt-1">
                        {isDemoMode ? '(Demo mode - no real claiming)' : '(Duel ID not found - contact support if needed)'}
                      </p>
                    </div>
                  )}
                </div>
              )
            } else {
              console.log('Claim button not shown - not a winner')
              return null
            }
          })()}
        </div>
      </div>
    )
  }

  const currentQuestion = getCurrentQuestion()
  if (!currentQuestion) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="text-center">
            <div className="text-white/80 text-sm">Question {currentQuestionIndex + 1} of {questions.length}</div>
            <div className="text-2xl font-bold text-white">{currentQuestion.question}</div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-white/80" />
            <span className="text-white font-bold text-xl">{timeLeft}s remaining</span>
          </div>
        </div>

        {/* Enhanced Scores Display */}
        <div className="flex justify-between mb-8">
          {/* Your Score */}
          <div className="text-center flex-1">
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="text-white/80 text-sm flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-4 h-4" />
                You
                {scoreAnimation === 'user' && (
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>
              <div className={`text-4xl font-bold text-white transition-all duration-500 ${
                scoreAnimation === 'user' ? 'scale-125 text-green-400 drop-shadow-lg' : ''
              }`}>
                {getPlayerScore(currentAddress) || 0}
              </div>
              <div className="text-white/60 text-xs mt-1">
                {questions.length} questions
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center px-4">
            <div className="text-white/60 text-2xl font-bold">VS</div>
          </div>

          {/* Opponent Score */}
          <div className="text-center flex-1">
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="text-white/80 text-sm flex items-center justify-center gap-2 mb-2">
                <Zap className="w-4 h-4" />
                Opponent
                {scoreAnimation === 'opponent' && (
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
                )}
              </div>
              <div className={`text-4xl font-bold text-white transition-all duration-500 ${
                scoreAnimation === 'opponent' ? 'scale-125 text-red-400 drop-shadow-lg' : ''
              }`}>
                {getOpponentScore() || 0}
              </div>
              <div className="text-white/60 text-xs mt-1">
                {questions.length} questions
              </div>
            </div>
          </div>
        </div>

        {/* Question Input */}
        <div className="text-center mb-8">
          <div className="text-6xl font-bold text-white mb-8">
            {currentQuestion.question} = ?
          </div>
          
          <div className="max-w-xs mx-auto">
            <input
              type="number"
              value={userAnswer}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer..."
              className={`w-full px-6 py-4 text-2xl text-center rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 transition-all duration-300 ${
                inputStatus === 'correct' 
                  ? 'bg-green-500/30 border-2 border-green-400 focus:ring-green-400' 
                  : inputStatus === 'incorrect'
                  ? 'bg-red-500/30 border-2 border-red-400 focus:ring-red-400'
                  : 'bg-white/20 border border-white/30 focus:ring-blue-500'
              }`}
              disabled={showResult}
              autoFocus
            />
            
            {/* Real-time feedback */}
            {inputStatus === 'correct' && (
              <div className="mt-2 text-green-400 font-bold text-lg animate-pulse">
                ✓ Correct! Auto-submitting...
              </div>
            )}
            {inputStatus === 'incorrect' && userAnswer && (
              <div className="mt-2 text-red-400 font-bold text-lg">
                ✗ Try again
              </div>
            )}
          </div>
        </div>

        {/* Result Display */}
        {showResult && (
          <div className="text-center mb-6">
            {isCorrect ? (
              <div className="flex items-center justify-center space-x-2 text-green-400">
                <CheckCircle className="w-6 h-6" />
                <span className="text-xl font-bold">Correct!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 text-red-400">
                <XCircle className="w-6 h-6" />
                <span className="text-xl font-bold">Wrong! Answer was {currentQuestion.answer}</span>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="text-center">
          <button
            onClick={() => handleSubmitAnswer(userAnswer)}
            disabled={!userAnswer.trim() || showResult}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-white/20 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg text-xl font-bold transition-colors"
          >
            Submit Answer
          </button>
        </div>

        {/* Connection Status */}
        <div className="mt-6 text-center">
          <div className={`inline-flex items-center space-x-2 text-sm ${
            wsConnected ? 'text-green-400' : 'text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
