'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract } from 'wagmi'

interface Question {
  id: string
  question: string
  answer: number
  timeLimit: number
}

interface Player {
  id: string
  address: string
  score: number
  answers: any[]
  currentQuestion: number
  isSubmitted: boolean
  currentAnswer?: string
  answerStatus?: 'correct' | 'incorrect' | 'pending'
  isOnline: boolean
  key?: string
}

interface RealMultiplayerDuelProps {
  lobbyData: {
    lobbyId: string
    players: Player[]
    duelId: number
    stakeAmount: string
  }
  onComplete: (results: any) => void
  onBack: () => void
}

export function RealMultiplayerDuel({ lobbyData, onComplete, onBack }: RealMultiplayerDuelProps) {
  const { address } = useAccount()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [players, setPlayers] = useState<Player[]>(lobbyData.players
    .map((p, index) => ({ 
      ...p, 
      key: `${p.address}_${p.id || index}`,
      isOnline: true, 
      answers: p.answers || [],
      score: p.score || 0
    }))
    .sort((a, b) => a.address.localeCompare(b.address)) // Consistent ordering
  )
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting')
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | 'pending'>('pending')
  const [showFeedback, setShowFeedback] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const answerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const { writeContract: writeDuelContract } = useWriteContract()

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!address) return

    // Connect to WebSocket for real-time updates
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('ws://localhost:3004/ws')
        wsRef.current = ws

        ws.onopen = () => {
          console.log('Real Multiplayer WebSocket connected')
          setWsConnected(true)
          
          // Join the duel lobby
          ws.send(JSON.stringify({
            type: 'join_lobby',
            playerId: address,
            playerAddress: address,
            lobbyId: lobbyData.lobbyId,
            stakeAmount: lobbyData.stakeAmount
          }))
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            console.log('Real Multiplayer WebSocket message:', message)

            switch (message.type) {
              case 'lobby_joined':
                console.log('Lobby joined! Players:', message.players)
                // Update players with server data, ensuring unique keys
                if (message.players) {
                  const uniquePlayers = message.players.reduce((acc, p) => {
                    const key = `${p.address}_${p.id || Math.random()}`
                    if (!acc.find(existing => existing.address === p.address && existing.id === p.id)) {
                      acc.push({ 
                        ...p, 
                        key: key,
                        isOnline: true, 
                        isReady: false,
                        score: 0,
                        answers: [],
                        currentQuestion: 0,
                        isSubmitted: false,
                        answerStatus: 'pending'
                      })
                    }
                    return acc
                  }, [])
                  setPlayers(uniquePlayers)
                }
                break
                
              case 'duel_started':
                console.log('Duel started! Questions:', message.questions)
                setGameStatus('playing')
                setQuestions(message.questions || [])
                // Update players with server data, ensuring unique keys
                if (message.players) {
                  const uniquePlayers = message.players.reduce((acc, p) => {
                    const key = `${p.address}_${p.id || Math.random()}`
                    if (!acc.find(existing => existing.address === p.address && existing.id === p.id)) {
                      acc.push({ 
                        ...p, 
                        key: key,
                        isOnline: true, 
                        isReady: true,
                        score: 0,
                        answers: [],
                        currentQuestion: 0,
                        isSubmitted: false,
                        answerStatus: 'pending'
                      })
                    }
                    return acc
                  }, [])
                  setPlayers(uniquePlayers)
                } else {
                  setPlayers(prev => prev.map(p => ({ ...p, isOnline: true, isReady: true })))
                }
                break
                
              case 'answer_submitted':
                // Update opponent's answer and score in real-time
                console.log('Answer submitted by:', message.playerId, 'Score:', message.score)
                setPlayers(prev => prev.map(p => 
                  p.address === message.playerId 
                    ? { 
                        ...p, 
                        score: message.score,
                        answers: [...(p.answers || []), {
                          questionId: message.questionId,
                          answer: message.answer,
                          isCorrect: message.isCorrect
                        }],
                        currentQuestion: message.currentQuestion,
                        answerStatus: message.isCorrect ? 'correct' : 'incorrect'
                      }
                    : p
                ))
                break
                
              case 'score_update':
                // Update all players' scores in real-time
                console.log('Score update received:', message.scores)
                if (message.scores) {
                  setPlayers(prev => prev.map(p => {
                    const updatedScore = message.scores.find((s: any) => s.playerId === p.address || s.address === p.address)
                    if (updatedScore) {
                      console.log(`Updating score for ${p.address}: ${p.score} -> ${updatedScore.score}`)
                      return { ...p, score: updatedScore.score }
                    }
                    return p
                  }))
                }
                break
                
              case 'score_sync':
                // Sync all players' scores
                console.log('Score sync received:', message.scores)
                if (message.scores) {
                  setPlayers(prev => prev.map(p => {
                    const updatedScore = message.scores.find((s: any) => s.playerId === p.address || s.address === p.address)
                    if (updatedScore) {
                      console.log(`Syncing score for ${p.address}: ${p.score} -> ${updatedScore.score}`)
                      return { ...p, score: updatedScore.score }
                    }
                    return p
                  }))
                }
                break
                
              case 'question_advanced':
                // Both players move to next question
                if (message.questionIndex !== undefined) {
                  setCurrentQuestion(message.questionIndex)
                  setUserAnswer('')
                  setIsSubmitted(false)
                  setAnswerStatus('pending')
                  setShowFeedback(false)
                }
                break
                
              case 'duel_finished':
                setGameStatus('finished')
                setPlayers(message.finalScores || [])
                break
                
              case 'error':
                console.log('WebSocket error:', message.message)
                if (message.message === 'Lobby is full') {
                  // If lobby is full, try to start the game anyway with current players
                  console.log('Lobby is full, starting game with current players')
                  setGameStatus('playing')
                  setPlayers(prev => prev.map(p => ({ ...p, isOnline: true, isReady: true })))
                }
                break
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err)
          }
        }

        ws.onclose = () => {
          console.log('Real Multiplayer WebSocket disconnected')
          setWsConnected(false)
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000)
        }

        ws.onerror = (error) => {
          console.error('Real Multiplayer WebSocket error:', error)
          setWsConnected(false)
        }

      } catch (err) {
        console.error('Failed to create WebSocket connection:', err)
        // Fallback: start game without WebSocket
        setWsConnected(false)
        setGameStatus('playing')
        setPlayers(prev => prev.map(p => ({ ...p, isOnline: true, isReady: true })))
      }
    }

    connectWebSocket()

    // Generate questions as fallback
    const generateQuestions = () => {
      const questions = []
      const problemTypes = ['addition', 'subtraction', 'multiplication', 'division']
      
      for (let i = 0; i < 10; i++) {
        const problemType = problemTypes[Math.floor(Math.random() * problemTypes.length)]
        let answer: number
        let question: string
        
        switch (problemType) {
          case 'addition':
            const a1 = Math.floor(Math.random() * 99) + 1
            const a2 = Math.floor(Math.random() * 99) + 1
            answer = a1 + a2
            question = `${a1} + ${a2}`
            break
            
          case 'subtraction':
            const s1 = Math.floor(Math.random() * 99) + 10
            const s2 = Math.floor(Math.random() * s1) + 1
            answer = s1 - s2
            question = `${s1} - ${s2}`
            break
            
          case 'multiplication':
            const m1 = Math.floor(Math.random() * 12) + 1
            const m2 = Math.floor(Math.random() * 12) + 1
            answer = m1 * m2
            question = `${m1} × ${m2}`
            break
            
          case 'division':
            const d1 = Math.floor(Math.random() * 12) + 1
            const d2 = Math.floor(Math.random() * 12) + 1
            answer = d1
            question = `${d1 * d2} ÷ ${d2}`
            break
            
          default:
            const def1 = Math.floor(Math.random() * 99) + 1
            const def2 = Math.floor(Math.random() * 99) + 1
            answer = def1 + def2
            question = `${def1} + ${def2}`
        }
        
        questions.push({
          id: `q${i}`,
          question,
          answer,
          timeLimit: 30
        })
      }
      return questions
    }
    
    const generatedQuestions = generateQuestions()
    setQuestions(generatedQuestions)
    setTimeLeft(30)
    
    // Fallback: Start game after 5 seconds if WebSocket doesn't work
    const fallbackTimeout = setTimeout(() => {
      if (gameStatus === 'waiting' && players.length >= 2) {
        console.log('Fallback: Starting game with generated questions')
        setGameStatus('playing')
        setPlayers(prev => prev.map(p => ({ ...p, isOnline: true, isReady: true })))
      }
    }, 5000)
    
    // Real multiplayer - no opponent simulation
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      clearTimeout(fallbackTimeout)
    }
  }, [address, lobbyData.lobbyId])

  // Questions are now generated in the main useEffect above

  // Real multiplayer - opponent answers will come through WebSocket/API

  // Force both players to be ready and online
  useEffect(() => {
    if (gameStatus === 'playing') {
      setPlayers(prev => prev.map(p => ({ ...p, isOnline: true, isReady: true })))
    }
  }, [gameStatus])

  // Call onComplete when game finishes
  useEffect(() => {
    if (gameStatus === 'finished' && onComplete) {
      const player1 = players.find(p => p.address === address)
      const player2 = players.find(p => p.address !== address)
      const player1Score = player1?.score || 0
      const player2Score = player2?.score || 0
      const winner = player1Score > player2Score ? address : (player2?.address || 'opponent')
      
      const scoresData: { [key: string]: { score: number; totalTime: number } } = {
        [address || 'player']: { 
          score: player1Score,
          totalTime: 300000 // 30 seconds per question * 10 questions
        },
        [player2?.address || 'opponent']: { 
          score: player2Score,
          totalTime: 300000
        }
      }
      
      onComplete({
        winner: winner,
        scores: scoresData,
        questions: questions,
        playerAddress: address,
        duelId: lobbyData.duelId,
        stakeAmount: lobbyData.stakeAmount
      })
    }
  }, [gameStatus, players, address, onComplete, questions, lobbyData.duelId, lobbyData.stakeAmount])

  // Periodic score sync to ensure real-time updates
  useEffect(() => {
    if (gameStatus !== 'playing') return

    const scoreSyncInterval = setInterval(() => {
      // Request current scores from server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'get_lobby_status',
          lobbyId: lobbyData.lobbyId
        }))
      }
    }, 2000) // Sync every 2 seconds

    return () => clearInterval(scoreSyncInterval)
  }, [gameStatus, lobbyData.lobbyId])

  // Real-time answer checking
  useEffect(() => {
    if (!userAnswer || isSubmitted || gameStatus !== 'playing') return

    if (answerTimeoutRef.current) {
      clearTimeout(answerTimeoutRef.current)
    }

    answerTimeoutRef.current = setTimeout(() => {
      const answer = parseInt(userAnswer)
      const currentQ = questions[currentQuestion]
      
      if (currentQ && !isNaN(answer)) {
        const isCorrect = answer === currentQ.answer
        
        if (isCorrect) {
          setAnswerStatus('correct')
          setShowFeedback(true)
          
          setTimeout(() => {
            handleSubmit(true)
          }, 1000)
        } else {
          setAnswerStatus('incorrect')
          setShowFeedback(true)
          
          setTimeout(() => {
            setShowFeedback(false)
            setAnswerStatus('pending')
          }, 2000)
        }
      }
    }, 500)

    return () => {
      if (answerTimeoutRef.current) {
        clearTimeout(answerTimeoutRef.current)
      }
    }
  }, [userAnswer, isSubmitted, gameStatus, currentQuestion, questions])

  // Timer effect
  useEffect(() => {
    if (gameStatus !== 'playing' || isSubmitted) return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Timer expired - show final results
          setGameStatus('finished')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameStatus, isSubmitted])

  const handleSubmit = (isAutoSubmit = false) => {
    if (isSubmitted || !questions[currentQuestion]) return

    const answer = parseInt(userAnswer) || 0
    const isCorrect = answer === questions[currentQuestion].answer
    
    // Update local player score
    const updatedPlayers = players.map(p => 
      p.address === address 
        ? { 
            ...p, 
            score: p.score + (isCorrect ? 1 : 0), 
            answers: [...(p.answers || []), { questionId: questions[currentQuestion].id, answer, isCorrect }],
            currentQuestion: p.currentQuestion + 1,
            isSubmitted: true,
            answerStatus: isCorrect ? 'correct' as const : 'incorrect' as const
          }
        : p
    )
    setPlayers(updatedPlayers)

    // Send answer to WebSocket for real-time sync
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const answerMessage = {
        type: 'submit_answer',
        playerId: address,
        playerAddress: address,
        questionId: questions[currentQuestion].id,
        answer: answer,
        isCorrect: isCorrect,
        score: updatedPlayers.find(p => p.address === address)?.score || 0,
        currentQuestion: currentQuestion + 1,
        lobbyId: lobbyData.lobbyId
      }
      console.log('Sending answer to WebSocket:', answerMessage)
      wsRef.current.send(JSON.stringify(answerMessage))
    }

    setIsSubmitted(true)
    setAnswerStatus(isCorrect ? 'correct' : 'incorrect')
    setShowFeedback(true)
    
    // Move to next question after 2 seconds
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1)
        setUserAnswer('')
        setIsSubmitted(false)
        setAnswerStatus('pending')
        setShowFeedback(false)
        
        // Reset player statuses
        setPlayers(prev => prev.map(p => ({ ...p, answerStatus: 'pending' as const, isSubmitted: false })))
        
        // Real multiplayer - opponent will submit their own answers
      } else {
        // All questions completed - show final results
        setGameStatus('finished')
      }
    }, 2000)
  }

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value)
  }

  // Calculate comprehensive score including speed and accuracy
  const calculatePlayerScore = (player: Player) => {
    const correctAnswers = player.answers.filter(a => a.isCorrect).length
    const totalQuestions = questions.length
    const accuracy = (correctAnswers / totalQuestions) * 100
    
    // Calculate average response time (inverse of speed - faster = higher score)
    const responseTimes = player.answers.map((answer, index) => {
      // Estimate response time based on question complexity and answer correctness
      const baseTime = 5 // 5 seconds base time
      const complexityBonus = questions[index]?.answer > 50 ? 2 : 0
      const speedPenalty = answer.isCorrect ? 0 : 3 // Wrong answers take longer
      return baseTime + complexityBonus + speedPenalty
    })
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    const speedScore = Math.max(0, 10 - avgResponseTime) // Faster = higher score
    
    // Final score: accuracy (70%) + speed (30%)
    const finalScore = Math.round((accuracy * 0.7) + (speedScore * 0.3))
    
    return {
      score: finalScore,
      accuracy: Math.round(accuracy),
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      correctAnswers,
      totalQuestions
    }
  }

  const finalizeDuel = async (finalScores: any) => {
    try {
      // Calculate comprehensive scores for both players
      const player1 = players.find(p => p.address === address)
      const player2 = players.find(p => p.address !== address)
      
      const player1Stats = player1 ? calculatePlayerScore(player1) : { score: 0, accuracy: 0, avgResponseTime: 0, correctAnswers: 0, totalQuestions: 0 }
      const player2Stats = player2 ? calculatePlayerScore(player2) : { score: 0, accuracy: 0, avgResponseTime: 0, correctAnswers: 0, totalQuestions: 0 }
      
      // Determine winner based on comprehensive score
      const winner = player1Stats.score > player2Stats.score ? address : (player2?.address || 'opponent')
      
      // Finalize on blockchain
      await writeDuelContract({
        address: "0x59a564EFAC88524a5358a2aCD298Ed82c91c1642",
        abi: [
          {
            "inputs": [{"name": "duelId", "type": "uint256"}, {"name": "winner", "type": "address"}],
            "name": "finalizeDuel",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'finalizeDuel',
        args: [BigInt(lobbyData.duelId), winner as `0x${string}`],
      })

      // Call completion handler with detailed stats
      if (onComplete) {
        onComplete({
          winner: winner,
          scores: [
            { address: address, ...player1Stats },
            { address: player2?.address || 'opponent', ...player2Stats }
          ],
          questions: questions,
          playerAddress: address,
          duelId: lobbyData.duelId,
          stakeAmount: lobbyData.stakeAmount
        })
      }
    } catch (error) {
      console.error('Failed to finalize duel:', error)
    }
  }

  if (gameStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-avalanche-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Starting real multiplayer duel...</p>
          <p className="text-sm text-gray-500 mt-2">
            WebSocket: {wsConnected ? '✅ Connected' : '❌ Disconnected'}
          </p>
        </div>
      </div>
    )
  }

  if (gameStatus === 'finished') {
    const player1 = players.find(p => p.address === address)
    const player2 = players.find(p => p.address !== address)
    
    // Use actual scores from the game
    const player1Score = player1?.score || 0
    const player2Score = player2?.score || 0
    const player1Correct = player1?.answers?.filter(a => a.isCorrect).length || 0
    const player2Correct = player2?.answers?.filter(a => a.isCorrect).length || 0
    const totalQuestions = questions.length
    
    const player1Stats = {
      score: player1Score,
      accuracy: totalQuestions > 0 ? Math.round((player1Correct / totalQuestions) * 100) : 0,
      avgResponseTime: 5, // Default estimate
      correctAnswers: player1Correct,
      totalQuestions: totalQuestions
    }
    
    const player2Stats = {
      score: player2Score,
      accuracy: totalQuestions > 0 ? Math.round((player2Correct / totalQuestions) * 100) : 0,
      avgResponseTime: 5, // Default estimate
      correctAnswers: player2Correct,
      totalQuestions: totalQuestions
    }
    
    const winner = player1Score > player2Score ? address : (player2?.address || 'opponent')
    const isWinner = winner === address

    return (
      <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">
          <div className="text-center">
            <h2 className={`text-2xl font-bold mb-4 ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
              {isWinner ? '🎉 You Won!' : '😞 You Lost!'}
            </h2>
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gray-700">Final Results:</div>
              
              {/* Player 1 Stats */}
              <div className={`p-4 rounded-lg ${
                player1?.address === address 
                  ? (isWinner ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500')
                  : (player1Score > player2Score ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500')
              }`}>
                <div className="font-medium text-lg mb-2">
                  {player1?.address === address ? 'You' : 'Opponent'}
                  {player1?.address === address ? (isWinner ? ' 🏆' : ' ❌') : (player1Score > player2Score ? ' 🏆' : ' ❌')}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-2xl font-bold text-avalanche-500">{player1Stats.score}</div>
                    <div className="text-gray-600">Final Score</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">{player1Stats.accuracy}%</div>
                    <div className="text-gray-600">Accuracy</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{player1Stats.correctAnswers}/{player1Stats.totalQuestions}</div>
                    <div className="text-gray-600">Correct</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">{player1Stats.avgResponseTime}s</div>
                    <div className="text-gray-600">Avg Time</div>
                  </div>
                </div>
              </div>
              
              {/* Player 2 Stats */}
              <div className={`p-4 rounded-lg ${
                player2?.address === address 
                  ? (isWinner ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500')
                  : (player2Score > player1Score ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500')
              }`}>
                <div className="font-medium text-lg mb-2">
                  {player2?.address === address ? 'You' : 'Opponent'}
                  {player2?.address === address ? (isWinner ? ' 🏆' : ' ❌') : (player2Score > player1Score ? ' 🏆' : ' ❌')}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-2xl font-bold text-avalanche-500">{player2Stats.score}</div>
                    <div className="text-gray-600">Final Score</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">{player2Stats.accuracy}%</div>
                    <div className="text-gray-600">Accuracy</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{player2Stats.correctAnswers}/{player2Stats.totalQuestions}</div>
                    <div className="text-gray-600">Correct</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">{player2Stats.avgResponseTime}s</div>
                    <div className="text-gray-600">Avg Time</div>
                  </div>
                </div>
              </div>
              
              <div className={`text-xl font-bold ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
                {isWinner ? '🏆 You are the Winner!' : '😞 Opponent Won'}
              </div>
              <div className="text-sm text-gray-600">
                Prize: {lobbyData.stakeAmount} USDC.e × 2 = {(parseFloat(lobbyData.stakeAmount) * 2).toFixed(1)} USDC.e
              </div>
            </div>
            <button
              onClick={onBack}
              className="mt-6 bg-avalanche-500 hover:bg-avalanche-600 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  if (!currentQ) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-4">
        {/* Header with scores and connection status */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🔗 Real Multiplayer Duel</h2>
            <p className="text-gray-600">Question {currentQuestion + 1} of {questions.length}</p>
            <div className="text-sm text-avalanche-600 mt-1">
              Stake: {lobbyData.stakeAmount} USDC.e | Prize: {(parseFloat(lobbyData.stakeAmount) * 2).toFixed(1)} USDC.e
            </div>
            <div className="text-xs text-gray-500 mt-1">
              WebSocket: {wsConnected ? '✅ Connected' : '❌ Disconnected'}
            </div>
            
            {/* Real-time Live Scores */}
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">🏆 Live Scores (Real-time)</h3>
              <div className="flex justify-around">
                {players.map((player, index) => (
                  <div key={player.key || player.address} className="text-center">
                    <div className={`text-sm font-bold ${player.address === address ? 'text-green-600' : 'text-blue-600'}`}>
                      {player.address === address ? 'YOU' : 'OPPONENT'}
                    </div>
                    <div className={`text-2xl font-bold ${player.address === address ? 'text-green-700' : 'text-blue-700'}`}>
                      {isNaN(player.score) ? 0 : player.score}
                    </div>
                    <div className="text-xs text-gray-500">
                      {player.isOnline ? '🟢 Online' : '🔴 Offline'}
                    </div>
                    {player.answerStatus === 'correct' && (
                      <div className="text-green-600 text-xs font-bold">✓ Correct!</div>
                    )}
                    {player.answerStatus === 'incorrect' && (
                      <div className="text-red-600 text-xs font-bold">✗ Wrong</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Real-time scores */}
          <div className="flex space-x-8">
            {players.map((player, index) => (
              <div key={player.key || player.address} className="text-center">
                <div className="text-sm text-gray-600">
                  {player.address === address ? 'You' : 'Opponent'}
                  {!player.isOnline && <span className="text-red-500 ml-1">(Offline)</span>}
                </div>
                <div className={`text-3xl font-bold ${
                  player.answerStatus === 'correct' ? 'text-green-500' :
                  player.answerStatus === 'incorrect' ? 'text-red-500' :
                  player.address === address ? 'text-avalanche-500' : 'text-gray-500'
                }`}>
                  {isNaN(player.score) ? 0 : player.score}
                </div>
                {player.answerStatus === 'correct' && (
                  <div className="text-green-500 text-sm font-semibold">✓ Correct!</div>
                )}
                {player.answerStatus === 'incorrect' && (
                  <div className="text-red-500 text-sm font-semibold">✗ Wrong</div>
                )}
                {player.isSubmitted && player.answerStatus === 'pending' && (
                  <div className="text-blue-500 text-sm font-semibold">⏳ Answering...</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="text-3xl font-bold text-gray-900">{currentQ.question} = ?</div>
            <div className={`text-3xl font-bold ${
              timeLeft <= 5 ? 'text-red-500' : 
              timeLeft <= 10 ? 'text-yellow-500' : 
              'text-avalanche-500'
            }`}>
              {timeLeft}s
            </div>
          </div>

          <div className="mb-6">
            <input
              type="number"
              value={userAnswer}
              onChange={handleAnswerChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={isSubmitted}
              className={`w-full text-4xl text-center border-4 rounded-lg py-6 px-8 focus:outline-none transition-all duration-300 ${
                answerStatus === 'correct' ? 'border-green-500 bg-green-50 text-green-700' :
                answerStatus === 'incorrect' ? 'border-red-500 bg-red-50 text-red-700' :
                showFeedback ? 'border-yellow-400 bg-yellow-50 text-black' :
                'border-gray-300 focus:border-avalanche-500 text-black'
              }`}
              placeholder="Type your answer here..."
              autoFocus
            />
            
            {/* Answer feedback */}
            {showFeedback && (
              <div className={`text-center mt-4 text-xl font-semibold ${
                answerStatus === 'correct' ? 'text-green-600' : 'text-red-600'
              }`}>
                {answerStatus === 'correct' ? '🎉 Correct! Auto-submitting...' : '❌ Wrong answer, try again!'}
              </div>
            )}
          </div>

          {!isSubmitted && (
            <div className="text-center text-gray-500 text-sm">
              Just type your answer - it will be checked automatically! Winner gets {lobbyData.stakeAmount} USDC.e × 2!
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Back to Menu
          </button>
          
          {isSubmitted && (
            <div className="text-center text-gray-600">
              <div className="text-lg">Next question in {Math.ceil((2000 - (Date.now() % 2000)) / 1000)}s</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
