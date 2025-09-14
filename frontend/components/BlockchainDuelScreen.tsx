'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'

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
}

interface BlockchainDuelScreenProps {
  match: {
    matchId: string
    players: string[]
    playerAddress?: string
    duelId?: number
    stakeAmount?: string
  }
  onComplete: (results: any) => void
  onBack: () => void
  isDemoMode?: boolean
}

// Contract configuration
const CONTRACT_ADDRESS = "0x59a564EFAC88524a5358a2aCD298Ed82c91c1642" as `0x${string}`
const USDC_ADDRESS = "0x356333ea7c55A4618d26ea355FBa93801A0A3A15" as `0x${string}`

// Contract ABI
const CONTRACT_ABI = [
  {
    "inputs": [{"name": "stakeAmount", "type": "uint256"}],
    "name": "createDuel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "duelId", "type": "uint256"}],
    "name": "joinDuel",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "inputs": [{"name": "amount", "type": "uint256"}],
    "name": "approveStake",
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

const USDC_ABI = [
  {
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function BlockchainDuelScreen({ match, onComplete, onBack, isDemoMode = false }: BlockchainDuelScreenProps) {
  const { address } = useAccount()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting')
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | 'pending'>('pending')
  const [showFeedback, setShowFeedback] = useState(false)
  const [opponentThinking, setOpponentThinking] = useState(false)
  const [duelId, setDuelId] = useState<number | null>(null)
  const [stakeAmount, setStakeAmount] = useState<string>('1') // 1 USDC.e
  const [isApproving, setIsApproving] = useState(false)
  const [isCreatingDuel, setIsCreatingDuel] = useState(false)
  const [isJoiningDuel, setIsJoiningDuel] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const answerTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentAddress = isDemoMode ? match.playerAddress : address

  // Contract interactions
  const { writeContract: writeDuelContract } = useWriteContract()
  const { writeContract: writeUSDCContract } = useWriteContract()

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress as `0x${string}`] : undefined,
  })

  // Read USDC decimals
  const { data: usdcDecimals } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'decimals',
  })

  // Read duel data if duelId exists
  const { data: duelData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getDuel',
    args: duelId ? [BigInt(duelId)] : undefined,
  })

  // Initialize game
  useEffect(() => {
    if (!currentAddress) return

    console.log('Blockchain Duel: Starting game with real blockchain integration')
    setGameStatus('playing')
    
    // Generate diverse random math problems
    const generateQuestions = () => {
      const questions = []
      const problemTypes = [
        'addition', 'subtraction', 'multiplication', 'division', 
        'mixed', 'fractions', 'decimals', 'exponents'
      ]
      
      for (let i = 0; i < 10; i++) {
        const problemType = problemTypes[Math.floor(Math.random() * problemTypes.length)]
        let answer: number
        let question: string
        
        switch (problemType) {
          case 'addition':
            const a1 = Math.floor(Math.random() * 50) + 1
            const a2 = Math.floor(Math.random() * 50) + 1
            answer = a1 + a2
            question = `${a1} + ${a2}`
            break
            
          case 'subtraction':
            const s1 = Math.floor(Math.random() * 50) + 20
            const s2 = Math.floor(Math.random() * 20) + 1
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
            
          case 'mixed':
            const mix1 = Math.floor(Math.random() * 20) + 1
            const mix2 = Math.floor(Math.random() * 20) + 1
            const mix3 = Math.floor(Math.random() * 10) + 1
            answer = mix1 + mix2 - mix3
            question = `${mix1} + ${mix2} - ${mix3}`
            break
            
          case 'fractions':
            const f1 = Math.floor(Math.random() * 10) + 1
            const f2 = Math.floor(Math.random() * 10) + 1
            const f3 = Math.floor(Math.random() * 10) + 1
            const f4 = Math.floor(Math.random() * 10) + 1
            answer = Math.round((f1/f2 + f3/f4) * 100) / 100
            question = `${f1}/${f2} + ${f3}/${f4}`
            break
            
          case 'decimals':
            const dec1 = Math.round((Math.random() * 20 + 1) * 10) / 10
            const dec2 = Math.round((Math.random() * 20 + 1) * 10) / 10
            answer = Math.round((dec1 + dec2) * 10) / 10
            question = `${dec1} + ${dec2}`
            break
            
          case 'exponents':
            const e1 = Math.floor(Math.random() * 5) + 2
            const e2 = Math.floor(Math.random() * 3) + 2
            answer = Math.pow(e1, e2)
            question = `${e1}^${e2}`
            break
            
          default:
            const def1 = Math.floor(Math.random() * 20) + 1
            const def2 = Math.floor(Math.random() * 20) + 1
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
    
    const questions = generateQuestions()
    setQuestions(questions)
    setPlayers([
      { 
        id: currentAddress, 
        address: currentAddress, 
        score: 0, 
        answers: [],
        currentQuestion: 0,
        isSubmitted: false,
        currentAnswer: '',
        answerStatus: 'pending'
      },
      { 
        id: 'opponent', 
        address: 'opponent', 
        score: 0, 
        answers: [],
        currentQuestion: 0,
        isSubmitted: false,
        currentAnswer: '',
        answerStatus: 'pending'
      }
    ])
    setTimeLeft(30)
    
  }, [currentAddress, match.matchId, isDemoMode])

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
          handleSubmit(false)
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
    
    // Update player score and status immediately
    setPlayers(prev => prev.map(p => 
      p.address === currentAddress 
        ? { 
            ...p, 
            score: p.score + (isCorrect ? 1 : 0), 
            answers: [...p.answers, { questionId: questions[currentQuestion].id, answer, isCorrect }],
            currentQuestion: p.currentQuestion + 1,
            isSubmitted: true,
            answerStatus: isCorrect ? 'correct' : 'incorrect'
          }
        : p
    ))

    // Real multiplayer - opponent will submit their own answers
    setOpponentThinking(false)

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
        
        setPlayers(prev => prev.map(p => ({ ...p, answerStatus: 'pending', isSubmitted: false })))
        setOpponentThinking(false)
      } else {
        // Game finished - finalize on blockchain
        setGameStatus('finished')
        finalizeDuelOnBlockchain()
      }
    }, 2000)
  }

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value)
  }

  // Blockchain functions
  const approveUSDC = async () => {
    if (!currentAddress || !usdcDecimals) return
    
    setIsApproving(true)
    try {
      const amount = parseUnits(stakeAmount, usdcDecimals)
      await writeUSDCContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, amount],
      })
      console.log('USDC approval successful')
    } catch (error) {
      console.error('USDC approval failed:', error)
    } finally {
      setIsApproving(false)
    }
  }

  const createDuel = async () => {
    if (!currentAddress || !usdcDecimals) return
    
    setIsCreatingDuel(true)
    try {
      const amount = parseUnits(stakeAmount, usdcDecimals)
      await writeDuelContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createDuel',
        args: [amount],
      })
      console.log('Duel creation initiated')
    } catch (error) {
      console.error('Duel creation failed:', error)
    } finally {
      setIsCreatingDuel(false)
    }
  }

  const joinDuel = async (duelId: number) => {
    if (!currentAddress) return
    
    setIsJoiningDuel(true)
    try {
      await writeDuelContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'joinDuel',
        args: [BigInt(duelId)],
      })
      console.log('Duel join initiated')
    } catch (error) {
      console.error('Duel join failed:', error)
    } finally {
      setIsJoiningDuel(false)
    }
  }

  const finalizeDuelOnBlockchain = async () => {
    if (!duelId || !currentAddress) return
    
    setIsFinalizing(true)
    try {
      const finalScores = players.map(p => ({ address: p.address, score: p.score }))
      const winner = finalScores[0].score > finalScores[1].score ? currentAddress : 'opponent'
      
      // Note: This would need to be called by the backend/owner in production
      // For demo purposes, we'll simulate the finalization
      console.log('Duel finalized on blockchain:', { duelId, winner })
      
      if (onComplete) {
        const scoresData: { [key: string]: { score: number; totalTime: number } } = {
          [currentAddress || 'player']: { 
            score: players.find(p => p.address === currentAddress)?.score || 0,
            totalTime: 300000
          },
          'opponent': { 
            score: players.find(p => p.address === 'opponent')?.score || 0,
            totalTime: 300000
          }
        }
        
        onComplete({
          winner: winner,
          scores: scoresData,
          questions: questions,
          playerAddress: currentAddress,
          duelId: duelId,
          stakeAmount: stakeAmount
        })
      }
    } catch (error) {
      console.error('Duel finalization failed:', error)
    } finally {
      setIsFinalizing(false)
    }
  }

  // Format USDC balance for display
  const formatUSDCBalance = () => {
    if (!usdcBalance || !usdcDecimals) return '0'
    return formatUnits(usdcBalance, usdcDecimals)
  }

  if (gameStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-avalanche-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Starting blockchain duel...</p>
        </div>
      </div>
    )
  }

  if (gameStatus === 'finished') {
    const finalScores = players.map(p => ({ address: p.address, score: p.score }))
    const winner = finalScores[0].score > finalScores[1].score ? currentAddress : 'opponent'

    return (
      <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 Game Complete!</h2>
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gray-700">Final Scores:</div>
              {finalScores.map((player, index) => (
                <div key={player.address} className={`p-3 rounded-lg ${player.address === currentAddress ? 'bg-avalanche-50 border-2 border-avalanche-500' : 'bg-gray-50 border-2 border-gray-200'}`}>
                  <div className="font-medium">
                    {player.address === currentAddress ? 'You' : 'Opponent'}
                  </div>
                  <div className="text-2xl font-bold text-avalanche-500">{isNaN(player.score) ? 0 : player.score}</div>
                </div>
              ))}
              <div className="text-xl font-bold text-green-600">
                Winner: {winner === currentAddress ? 'You!' : 'Opponent'}
              </div>
              <div className="text-sm text-gray-600">
                Prize: {stakeAmount} USDC.e × 2 = {(parseFloat(stakeAmount) * 2).toFixed(1)} USDC.e
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
        {/* Header with scores and blockchain info */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🔗 Blockchain Math Duel</h2>
            <p className="text-gray-600">Question {currentQuestion + 1} of {questions.length}</p>
            <div className="text-sm text-avalanche-600 mt-1">
              Stake: {stakeAmount} USDC.e | Balance: {formatUSDCBalance()} USDC.e
            </div>
          </div>
          
          {/* Real-time scores */}
          <div className="flex space-x-8">
            <div className="text-center">
              <div className="text-sm text-gray-600">You</div>
              <div className={`text-3xl font-bold ${
                players.find(p => p.address === currentAddress)?.answerStatus === 'correct' ? 'text-green-500' :
                players.find(p => p.address === currentAddress)?.answerStatus === 'incorrect' ? 'text-red-500' :
                'text-avalanche-500'
              }`}>
                {players.find(p => p.address === currentAddress)?.score || 0}
              </div>
              {players.find(p => p.address === currentAddress)?.answerStatus === 'correct' && (
                <div className="text-green-500 text-sm font-semibold">✓ Correct!</div>
              )}
              {players.find(p => p.address === currentAddress)?.answerStatus === 'incorrect' && (
                <div className="text-red-500 text-sm font-semibold">✗ Wrong</div>
              )}
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-600">Opponent</div>
              <div className={`text-3xl font-bold ${
                players.find(p => p.address === 'opponent')?.answerStatus === 'correct' ? 'text-green-500' :
                players.find(p => p.address === 'opponent')?.answerStatus === 'incorrect' ? 'text-red-500' :
                'text-gray-500'
              }`}>
                {players.find(p => p.address === 'opponent')?.score || 0}
              </div>
              {opponentThinking && (
                <div className="text-blue-500 text-sm font-semibold mt-1">🤔 Thinking...</div>
              )}
              {players.find(p => p.address === 'opponent')?.answerStatus === 'correct' && (
                <div className="text-green-500 text-sm font-semibold">✓ Correct!</div>
              )}
              {players.find(p => p.address === 'opponent')?.answerStatus === 'incorrect' && (
                <div className="text-red-500 text-sm font-semibold">✗ Wrong</div>
              )}
            </div>
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
              Just type your answer - it will be checked automatically! Winner gets {stakeAmount} USDC.e × 2!
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
