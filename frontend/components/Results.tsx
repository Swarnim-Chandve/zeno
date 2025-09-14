'use client'

import { Trophy, Clock, Target, RefreshCw } from 'lucide-react'

interface ResultsProps {
  results: any
  onPlayAgain: () => void
  isDemoMode?: boolean
}

export function Results({ results, onPlayAgain, isDemoMode = false }: ResultsProps) {
  const { winner, scores, questions } = results
  const isWinner = winner === results.playerAddress

  return (
    <div className="min-h-screen bg-gradient-to-br from-avalanche-50 to-avalanche-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
              isWinner ? 'bg-yellow-100' : 'bg-gray-100'
            }`}>
              <Trophy className={`w-10 h-10 ${isWinner ? 'text-yellow-500' : 'text-gray-400'}`} />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-gray-900">
              {isWinner ? 'You Won!' : 'You Lost'}
            </h1>
            <p className="text-xl text-gray-700">
              {isWinner 
                ? 'Congratulations! You won the math duel!' 
                : 'Better luck next time!'
              }
            </p>
          </div>

          {/* Results Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Duel Results</h2>
            
            {/* Scores */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {Object.entries(scores).map(([playerAddress, scoreData]: [string, any]) => (
                <div key={playerAddress} className={`p-6 rounded-xl border-2 ${
                  playerAddress === winner 
                    ? 'border-yellow-200 bg-yellow-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                      {playerAddress === results.playerAddress ? 'You' : 'Opponent'}
                    </h3>
                    {playerAddress === winner && (
                      <Trophy className="w-6 h-6 text-yellow-500" />
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Score:</span>
                      <span className="font-semibold text-gray-900">{scoreData.score || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total Time:</span>
                      <span className="font-semibold text-gray-900">
                        {scoreData.totalTime ? (scoreData.totalTime / 1000).toFixed(1) + 's' : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Questions Review */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions Review</h3>
              <div className="space-y-3">
                {questions.map((question: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-mono text-lg text-gray-900">{question.question}</span>
                    <span className="text-gray-700">Answer: {question.answer}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="text-center">
              <button
                onClick={onPlayAgain}
                className="bg-avalanche-500 hover:bg-avalanche-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors duration-200 flex items-center gap-3 mx-auto"
              >
                <RefreshCw className="w-6 h-6" />
                Play Again
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <Target className="w-8 h-8 text-avalanche-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Accuracy</h3>
              <p className="text-2xl font-bold text-gray-900">
                {(() => {
                  const totalQuestions = questions.length
                  const correctAnswers = Object.values(scores).reduce((total: number, s: any) => total + (s.score || 0), 0)
                  return totalQuestions > 0 ? ((correctAnswers / (totalQuestions * 2)) * 100).toFixed(1) + '%' : '0%'
                })()}
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <Clock className="w-8 h-8 text-avalanche-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Speed</h3>
              <p className="text-2xl font-bold text-gray-900">
                {(() => {
                  const totalTime = Object.values(scores).reduce((total: number, s: any) => total + (s.totalTime || 0), 0)
                  return totalTime > 0 ? (totalTime / 1000).toFixed(0) + 's' : 'N/A'
                })()}
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <Trophy className="w-8 h-8 text-avalanche-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Winner</h3>
              <p className="text-lg font-bold text-gray-900">
                {isWinner ? 'You' : 'Opponent'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
