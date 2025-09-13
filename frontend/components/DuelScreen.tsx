'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

interface Question {
  question: string
  answer: number
  id: string
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
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const currentAddress = isDemoMode ? match.playerAddress : address
    if (!currentAddress) return

    // Connect to WebSocket
    const websocket = new WebSocket('ws://localhost:3001')
    websocket.onopen = () => {
      websocket.send(JSON.stringify({
        type: 'join',
        playerAddress: currentAddress
      }))
    }

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'questions') {
        setQuestions(data.questions)
        setTimeLeft(30)
        startTimer()
      } else if (data.type === 'match_completed') {
        onComplete(data)
      }
    }

    setWs(websocket)

    // Start the duel
    setTimeout(() => {
      websocket.send(JSON.stringify({
        type: 'start_duel',
        matchId: match.matchId,
        playerAddress: currentAddress
      }))
    }, 1000)

    return () => {
      websocket.close()
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

    // Send answer to server
    ws.send(JSON.stringify({
      type: 'submit_answer',
      playerAddress: currentAddress,
      matchId: match.matchId,
      answer: answer,
      questionId: questions[currentQuestion]?.id
    }))

    // Move to next question or complete
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1)
        setUserAnswer('')
        setIsSubmitted(false)
        setTimeLeft(30)
        startTimer()
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
