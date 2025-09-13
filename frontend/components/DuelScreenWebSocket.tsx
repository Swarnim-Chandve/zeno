'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { ArrowLeft, Clock, Trophy, Zap, CheckCircle, XCircle } from 'lucide-react'

interface DuelScreenProps {
  match: {
    matchId: string
    status: string
    players: string[]
    playerAddress: string
  }
  onBack: () => void
  isDemoMode?: boolean
}

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
  const [timeLeft, setTimeLeft] = useState(30)
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
  
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentAddress = isDemoMode ? match.playerAddress : address

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
              setTimeLeft(30)
              break
              
            case 'answer_submitted':
              // Update opponent's answer
              if (message.playerId !== currentAddress) {
                setOpponentAnswers(prev => [...prev, {
                  questionId: message.questionId,
                  answer: message.answer,
                  isCorrect: message.isCorrect,
                  timestamp: Date.now()
                }])
                
                // Update opponent's score in real-time
                setPlayers(prev => prev.map(p => 
                  p.address === message.playerId 
                    ? { ...p, score: message.score || p.score }
                    : p
                ))
              }
              break
              
            case 'game_finished':
              setGameStatus('finished')
              setPlayers(message.results.map((r: any) => ({
                id: r.playerId,
                address: r.playerId,
                score: r.score,
                answers: r.answers
              })))
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
              setPlayers(prev => prev.map(p => 
                p.address === message.playerId 
                  ? { ...p, score: message.score }
                  : p
              ))
              
              // Trigger score animation
              if (message.playerId === currentAddress) {
                setScoreAnimation('user')
              } else {
                setScoreAnimation('opponent')
              }
              
              // Clear animation after a short delay
              setTimeout(() => setScoreAnimation(null), 1000)
              break
              
            case 'score_sync':
              // Periodic score synchronization
              setPlayers(prev => prev.map(p => {
                const updatedPlayer = message.playerScores.find((ps: any) => ps.playerId === p.address);
                return updatedPlayer ? { ...p, score: updatedPlayer.score } : p;
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

  // Timer for each question
  useEffect(() => {
    if (gameStatus !== 'playing' || currentQuestionIndex >= questions.length) return

    setTimeLeft(questions[currentQuestionIndex]?.timeLimit || 20)
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto-submit empty answer
          handleSubmitAnswer('')
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
  }, [gameStatus, currentQuestionIndex, questions])

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

    // Update player score immediately
    if (correct) {
      setPlayers(prev => prev.map(p => 
        p.address === currentAddress 
          ? { ...p, score: p.score + 1 }
          : p
      ))
    }

    // Send answer to server
    if (process.env.NODE_ENV === 'production') {
      // Use API in production
      fetch(`/api/websocket?action=submit-answer&playerId=${currentAddress}&questionId=${question.id}&answer=${answerNum}&lobbyId=${match.matchId}`)
        .then(response => response.json())
        .then(data => {
          console.log('Answer submitted via API:', data)
        })
        .catch(error => {
          console.error('Error submitting answer:', error)
        })
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Use WebSocket in development
      wsRef.current.send(JSON.stringify({
        type: 'submit_answer',
        playerId: currentAddress,
        questionId: question.id,
        answer: answerNum,
        lobbyId: match.matchId
      }))
    }

    // Move to next question after 1 second for speed
    setTimeout(() => {
      setShowResult(false)
      setInputStatus('neutral')
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
        setUserAnswer('')
      } else {
        setGameStatus('finished')
      }
    }, 1000)
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
      }, 500) // Auto-submit after 500ms
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
    if (!playerAddress) return 0
    const player = players.find(p => p.address === playerAddress)
    return player ? player.score : 0
  }

  const getOpponentScore = () => {
    const opponent = players.find(p => p.address !== currentAddress)
    return opponent ? opponent.score : 0
  }

  const getWinner = () => {
    if (players.length < 2) return null
    const [player1, player2] = players
    if (player1.score > player2.score) return player1.address
    if (player2.score > player1.score) return player2.address
    return null // Tie
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20 text-center">
          <div className="mb-6">
            {isWinner ? (
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            ) : isTie ? (
              <Zap className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            )}
            
            <h2 className="text-2xl font-bold text-white mb-2">
              {isWinner ? '🎉 You Won!' : isTie ? "It's a Tie!" : 'Game Over'}
            </h2>
            <p className="text-white/80">Final Scores</p>
          </div>

          <div className="bg-white/10 rounded-lg p-6 mb-6">
            <div className="space-y-4">
              {players.map((player, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-white font-medium">
                    {player.address === currentAddress ? 'You' : 'Opponent'}
                  </span>
                  <span className="text-white text-xl font-bold">
                    {player.score}/{questions.length}
                  </span>
                </div>
              ))}
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
            <span className="text-white font-bold text-xl">{timeLeft}s</span>
          </div>
        </div>

        {/* Scores */}
        <div className="flex justify-between mb-8">
          <div className="text-center">
            <div className="text-white/80 text-sm flex items-center justify-center gap-2">
              You
              {scoreAnimation === 'user' && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
            <div className={`text-2xl font-bold text-white transition-all duration-300 ${
              scoreAnimation === 'user' ? 'scale-110 text-green-400' : ''
            }`}>
              {getPlayerScore(currentAddress)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-white/80 text-sm flex items-center justify-center gap-2">
              Opponent
              {scoreAnimation === 'opponent' && (
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              )}
            </div>
            <div className={`text-2xl font-bold text-white transition-all duration-300 ${
              scoreAnimation === 'opponent' ? 'scale-110 text-red-400' : ''
            }`}>
              {getOpponentScore()}
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
