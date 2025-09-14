'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

interface Question {
  question: string
  answer: number
  id: string
}

interface Player {
  address: string
  answers: number[]
  currentQuestion: number
  isSubmitted: boolean
}

interface DuelScreenProps {
  match: any
  onComplete: (results: any) => void
  onBack: () => void
  isDemoMode?: boolean
}

export function DuelScreen({ match, onComplete, onBack, isDemoMode = false }: DuelScreenProps) {
  const { address } = useAccount()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [userAnswer, setUserAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [opponentProgress, setOpponentProgress] = useState<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const currentAddress = isDemoMode ? match.playerAddress : address
    if (!currentAddress) return

    // Start the duel using API
    const startDuel = async () => {
      try {
        const response = await fetch('/api/duel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchId: match.matchId,
            playerAddress: currentAddress,
            action: 'start'
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.questions) {
            setQuestions(data.questions)
            setTimeLeft(30)
            startTimer()
            
            // Initialize players
            const opponentAddress = match.players.find((p: string) => p !== currentAddress)
            setPlayers([
              { address: currentAddress, answers: [], currentQuestion: 0, isSubmitted: false },
              { address: opponentAddress, answers: [], currentQuestion: 0, isSubmitted: false }
            ])
          }
        }
      } catch (err) {
        console.error('Error starting duel:', err)
      }
    }

    startDuel()

    // Polling for opponent progress in deployed version
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/duel?matchId=${match.matchId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.answers) {
            // Update opponent progress
            const opponentAddress = match.players.find((p: string) => p !== currentAddress)
            if (opponentAddress && data.answers[opponentAddress]) {
              const opponentAnswers = data.answers[opponentAddress]
              setPlayers(prev => prev.map(player => 
                player.address === opponentAddress 
                  ? { ...player, answers: opponentAnswers.map((a: any) => a.answer), currentQuestion: opponentAnswers.length }
                  : player
              ))
            }
          }
        }
      } catch (err) {
        console.log('Polling error:', err)
      }
    }, 2000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [address, match.matchId, onComplete, isDemoMode, match.playerAddress])

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value)
  }

  const handleSubmit = () => {
    if (isSubmitted || !ws) return

    const answer = parseInt(userAnswer) || 0
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)
    setIsSubmitted(true)

    const currentAddress = isDemoMode ? match.playerAddress : address

    // Send answer to server via API
    fetch('/api/duel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matchId: match.matchId,
        playerAddress: currentAddress,
        action: 'submit',
        answer: answer,
        questionId: questions[currentQuestion]?.id,
        currentQuestion: currentQuestion
      }),
    }).then(response => response.json()).then(data => {
      if (data.match_completed) {
        onComplete(data)
      }
    }).catch(err => {
      console.error('Error submitting answer:', err)
    })

    // Update local player state
    setPlayers(prev => prev.map(player => 
      player.address === currentAddress 
        ? { ...player, answers: newAnswers, currentQuestion: currentQuestion + 1, isSubmitted: true }
        : player
    ))

    // Move to next question or complete
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1)
        setUserAnswer('')
        setIsSubmitted(false)
      }, 1000)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitted) {
      handleSubmit()
    }
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-avalanche-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Preparing Questions</h2>
            <p className="text-gray-600">Get ready for the math duel!</p>
          </div>
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const isCorrect = answers[currentQuestion] === question?.answer
  const isLastQuestion = currentQuestion === questions.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-avalanche-600 hover:text-avalanche-700 font-medium"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Math Duel</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {questions.length}
            </div>
            <div className="flex items-center gap-2 text-avalanche-600">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-lg">{timeLeft}s</span>
            </div>
          </div>
        </div>

        {/* Players Progress */}
        {players.length > 0 && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Players Progress</h3>
              <div className="grid grid-cols-2 gap-4">
                {players.map((player, index) => {
                  const isCurrentPlayer = player.address === (isDemoMode ? match.playerAddress : address)
                  const progress = (player.currentQuestion / questions.length) * 100
                  
                  return (
                    <div key={player.address} className={`p-4 rounded-lg ${isCurrentPlayer ? 'bg-avalanche-50 border-2 border-avalanche-500' : 'bg-gray-50 border-2 border-gray-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${isCurrentPlayer ? 'bg-avalanche-500' : 'bg-gray-400'}`}></div>
                        <span className="font-medium text-sm">
                          {isCurrentPlayer ? 'You' : 'Opponent'}
                        </span>
                        {isCurrentPlayer && <span className="text-xs text-avalanche-600">(You)</span>}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {player.address.slice(0, 6)}...{player.address.slice(-4)}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${isCurrentPlayer ? 'bg-avalanche-500' : 'bg-gray-400'}`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {player.currentQuestion} / {questions.length} questions
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {question.question}
              </h2>
              
              {isSubmitted && (
                <div className="mb-6">
                  {isCorrect ? (
                    <div className="flex items-center justify-center gap-2 text-green-600 text-lg">
                      <CheckCircle className="w-6 h-6" />
                      <span className="font-semibold">Correct!</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-red-600 text-lg">
                      <XCircle className="w-6 h-6" />
                      <span className="font-semibold">Incorrect</span>
                    </div>
                  )}
                  <p className="text-gray-600 mt-2">
                    Your answer: {answers[currentQuestion]} | 
                    Correct answer: {question.answer}
                  </p>
                </div>
              )}

              {!isSubmitted && (
                <div className="mb-6">
                  <input
                    type="number"
                    value={userAnswer}
                    onChange={handleAnswerChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your answer"
                    className="w-full max-w-xs text-center text-2xl font-mono border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-avalanche-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitted || !userAnswer}
                className="bg-avalanche-500 hover:bg-avalanche-600 disabled:bg-gray-300 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
              >
                {isSubmitted ? 'Submitted' : 'Submit Answer'}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-avalanche-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center text-gray-600">
            <p>Answer as quickly and accurately as possible!</p>
            <p className="text-sm mt-2">
              Speed and accuracy both count towards your final score.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
