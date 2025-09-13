import { NextRequest } from 'next/server'

// Extend global type for in-memory storage
declare global {
  var lobbies: Map<string, any> | undefined
  var players: Map<string, any> | undefined
}

export async function GET(request: NextRequest) {
  // For WebSocket upgrade requests, we'll use a different approach
  // Since Vercel doesn't support WebSocket upgrades in serverless functions,
  // we'll use a polling-based approach for production
  
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    // Add CORS headers
    const headers = new Headers()
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
    headers.set('Content-Type', 'application/json')
  
  if (action === 'create-lobby') {
    const playerId = searchParams.get('playerId')
    const playerAddress = searchParams.get('playerAddress')
    
    if (!playerId || !playerAddress) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400, headers })
    }
    
    // Generate lobby ID
    const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store lobby in a simple in-memory store (in production, use Redis or database)
    if (!global.lobbies) {
      global.lobbies = new Map()
    }
    if (!global.players) {
      global.players = new Map()
    }
    
    global.lobbies.set(lobbyId, {
      id: lobbyId,
      players: [playerId],
      status: 'waiting',
      questions: [],
      createdAt: Date.now()
    })
    
    if (global.players) {
      global.players.set(playerId, {
        address: playerAddress,
        lobbyId,
        answers: [],
        score: 0
      })
    }
    
    return Response.json({
      type: 'lobby_created',
      lobbyId,
      players: [playerId]
    }, { headers })
  }
  
  if (action === 'join-lobby') {
    const playerId = searchParams.get('playerId')
    const playerAddress = searchParams.get('playerAddress')
    const lobbyId = searchParams.get('lobbyId')
    
    if (!playerId || !playerAddress || !lobbyId) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400, headers })
    }
    
    if (!global.lobbies || !global.lobbies.has(lobbyId)) {
      return Response.json({ error: 'Lobby not found' }, { status: 404, headers })
    }
    
    const lobby = global.lobbies?.get(lobbyId)
    
    if (lobby.players.length >= 2) {
      return Response.json({ error: 'Lobby is full' }, { status: 400, headers })
    }
    
    if (lobby.players.includes(playerId)) {
      return Response.json({ error: 'Player already in lobby' }, { status: 400, headers })
    }
    
    // Add player to lobby
    lobby.players.push(playerId)
    if (global.players) {
      global.players.set(playerId, {
        address: playerAddress,
        lobbyId,
        answers: [],
        score: 0
      })
    }
    
    return Response.json({
      type: 'player_joined',
      playerId,
      players: lobby.players,
      lobbyStatus: 'waiting'
    })
  }
  
  if (action === 'get-lobby-status') {
    const lobbyId = searchParams.get('lobbyId')
    
    if (!lobbyId || !global.lobbies || !global.lobbies.has(lobbyId)) {
      return Response.json({ error: 'Lobby not found' }, { status: 404, headers })
    }
    
    const lobby = global.lobbies?.get(lobbyId)
    const playerScores = lobby.players.map((pId: string) => {
      const player = global.players?.get(pId)
      return {
        playerId: pId,
        score: player ? player.score : 0,
        answersCount: player ? player.answers.length : 0
      }
    })
    
    return Response.json({
      type: 'lobby_status',
      lobbyId,
      players: lobby.players,
      status: lobby.status,
      questions: lobby.questions,
      playerScores
    })
  }
  
  if (action === 'submit-answer') {
    const playerId = searchParams.get('playerId')
    const questionId = parseInt(searchParams.get('questionId') || '0')
    const answer = parseInt(searchParams.get('answer') || '0')
    const lobbyId = searchParams.get('lobbyId')
    
    if (!playerId || !lobbyId || !global.lobbies || !global.lobbies.has(lobbyId)) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400, headers })
    }
    
    const lobby = global.lobbies?.get(lobbyId)
    const player = global.players?.get(playerId)
    
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404, headers })
    }
    
    // Check if answer is correct
    const question = lobby.questions.find((q: any) => q.id === questionId)
    if (!question) {
      return Response.json({ error: 'Question not found' }, { status: 404, headers })
    }
    
    const isCorrect = answer === question.answer
    const answerData = {
      questionId,
      answer,
      isCorrect,
      timestamp: Date.now()
    }
    
    // Update player's answers
    player.answers.push(answerData)
    if (isCorrect) {
      player.score += 1
    }
    
    return Response.json({
      type: 'answer_submitted',
      playerId,
      questionId,
      answer,
      isCorrect,
      score: player.score
    })
  }
  
  if (action === 'start-game') {
    const lobbyId = searchParams.get('lobbyId')
    
    if (!lobbyId || !global.lobbies || !global.lobbies.has(lobbyId)) {
      return Response.json({ error: 'Lobby not found' }, { status: 404, headers })
    }
    
    const lobby = global.lobbies?.get(lobbyId)
    
    if (lobby.players.length !== 2) {
      return Response.json({ error: 'Need exactly 2 players to start' }, { status: 400, headers })
    }
    
    // Generate better math questions with varying difficulty
    const questions = []
    const difficultyLevels = ['very_easy', 'easy', 'medium']
    
    for (let i = 0; i < 5; i++) {
      const difficulty = difficultyLevels[Math.floor(Math.random() * difficultyLevels.length)]
      let question, answer
      
      switch (difficulty) {
        case 'very_easy':
          // Single digit addition/subtraction
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
          // Double digit addition/subtraction or simple multiplication
          const operation = Math.random()
          if (operation < 0.4) {
            // Addition
            const a2 = Math.floor(Math.random() * 20) + 1
            const b2 = Math.floor(Math.random() * 20) + 1
            question = `${a2} + ${b2}`
            answer = a2 + b2
          } else if (operation < 0.8) {
            // Subtraction
            const a3 = Math.floor(Math.random() * 30) + 10
            const b3 = Math.floor(Math.random() * 20) + 1
            question = `${a3} - ${b3}`
            answer = a3 - b3
          } else {
            // Simple multiplication
            const a4 = Math.floor(Math.random() * 9) + 1
            const b4 = Math.floor(Math.random() * 9) + 1
            question = `${a4} × ${b4}`
            answer = a4 * b4
          }
          break
          
        case 'medium':
          // More complex operations
          const op = Math.random()
          if (op < 0.3) {
            // Double digit multiplication
            const a5 = Math.floor(Math.random() * 9) + 1
            const b5 = Math.floor(Math.random() * 9) + 1
            question = `${a5} × ${b5}`
            answer = a5 * b5
          } else if (op < 0.6) {
            // Division
            const a6 = Math.floor(Math.random() * 8) + 2
            const b6 = Math.floor(Math.random() * 8) + 2
            const result = a6 * b6
            question = `${result} ÷ ${a6}`
            answer = b6
          } else {
            // Mixed operations
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
        question,
        answer,
        timeLimit: 20 // Reduced time for speed
      })
    }
    
    lobby.questions = questions
    lobby.status = 'playing'
    
    return Response.json({
      type: 'game_started',
      questions: lobby.questions,
      lobbyStatus: 'playing'
    })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400, headers })
  } catch (error) {
    console.error('WebSocket API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  // Add CORS headers
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  headers.set('Content-Type', 'application/json')
  
  try {
    const body = await request.json()
    const { action, ...params } = body
    
    // Handle POST requests for more complex operations
    if (action === 'create-lobby') {
      const { playerId, playerAddress } = params
      
      if (!playerId || !playerAddress) {
        return Response.json({ error: 'Missing required parameters' }, { status: 400, headers })
      }
      
      const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      if (!global.lobbies) {
        global.lobbies = new Map()
      }
      if (!global.players) {
        global.players = new Map()
      }
      
      global.lobbies.set(lobbyId, {
        id: lobbyId,
        players: [playerId],
        status: 'waiting',
        questions: [],
        createdAt: Date.now()
      })
      
      global.players.set(playerId, {
        address: playerAddress,
        lobbyId,
        answers: [],
        score: 0
      })
      
      return Response.json({
        type: 'lobby_created',
        lobbyId,
        players: [playerId]
      })
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400, headers })
  } catch (error) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }
}
