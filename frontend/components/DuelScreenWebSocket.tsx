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
  
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentAddress = isDemoMode ? match.playerAddress : address

  // WebSocket connection
  useEffect(() => {
    if (!currentAddress) return

    const wsUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://zeno-websocket-server.vercel.app' 
      : 'ws://localhost:3002'

    console.log('Connecting to WebSocket for duel:', wsUrl)
    
    try {
      const ws = new WebSocket(wsUrl)
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
              if (message.playerId !== currentAddress) {
                setOpponentAnswers(prev => [...prev, {
                  questionId: message.questionId,
                  answer: message.answer,
                  isCorrect: message.isCorrect,
                  timestamp: Date.now()
                }])
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
    }
  }, [currentAddress, match.matchId])

  // Timer for each question
  useEffect(() => {
    if (gameStatus !== 'playing' || currentQuestionIndex >= questions.length) return

    setTimeLeft(questions[currentQuestionIndex]?.timeLimit || 30)
    
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

    // Send answer to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'submit_answer',
        playerId: currentAddress,
        questionId: question.id,
        answer: answerNum,
        lobbyId: match.matchId
      }))
    }

    // Move to next question after 2 seconds
    setTimeout(() => {
      setShowResult(false)
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
        setUserAnswer('')
      } else {
        setGameStatus('finished')
      }
    }, 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userAnswer.trim()) {
      handleSubmitAnswer(userAnswer)
    }
  }

  const getCurrentQuestion = () => {
    return questions[currentQuestionIndex] || null
  }

  const getPlayerScore = (playerAddress: string) => {
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
            <div className="text-white/80 text-sm">You</div>
            <div className="text-2xl font-bold text-white">{getPlayerScore(currentAddress)}</div>
          </div>
          <div className="text-center">
            <div className="text-white/80 text-sm">Opponent</div>
            <div className="text-2xl font-bold text-white">{getOpponentScore()}</div>
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
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Your answer"
              className="w-full px-6 py-4 text-2xl text-center bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={showResult}
              autoFocus
            />
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
