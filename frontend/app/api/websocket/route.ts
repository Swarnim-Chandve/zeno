import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // For WebSocket upgrade requests, we'll use a different approach
  // Since Vercel doesn't support WebSocket upgrades in serverless functions,
  // we'll use a polling-based approach for production
  
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  if (action === 'create-lobby') {
    const playerId = searchParams.get('playerId')
    const playerAddress = searchParams.get('playerAddress')
    
    if (!playerId || !playerAddress) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 })
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
  
  if (action === 'join-lobby') {
    const playerId = searchParams.get('playerId')
    const playerAddress = searchParams.get('playerAddress')
    const lobbyId = searchParams.get('lobbyId')
    
    if (!playerId || !playerAddress || !lobbyId) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    if (!global.lobbies || !global.lobbies.has(lobbyId)) {
      return Response.json({ error: 'Lobby not found' }, { status: 404 })
    }
    
    const lobby = global.lobbies.get(lobbyId)
    
    if (lobby.players.length >= 2) {
      return Response.json({ error: 'Lobby is full' }, { status: 400 })
    }
    
    if (lobby.players.includes(playerId)) {
      return Response.json({ error: 'Player already in lobby' }, { status: 400 })
    }
    
    // Add player to lobby
    lobby.players.push(playerId)
    global.players.set(playerId, {
      address: playerAddress,
      lobbyId,
      answers: [],
      score: 0
    })
    
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
      return Response.json({ error: 'Lobby not found' }, { status: 404 })
    }
    
    const lobby = global.lobbies.get(lobbyId)
    const playerScores = lobby.players.map((pId: string) => {
      const player = global.players.get(pId)
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
      return Response.json({ error: 'Invalid parameters' }, { status: 400 })
    }
    
    const lobby = global.lobbies.get(lobbyId)
    const player = global.players.get(playerId)
    
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Check if answer is correct
    const question = lobby.questions.find((q: any) => q.id === questionId)
    if (!question) {
      return Response.json({ error: 'Question not found' }, { status: 404 })
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
      return Response.json({ error: 'Lobby not found' }, { status: 404 })
    }
    
    const lobby = global.lobbies.get(lobbyId)
    
    if (lobby.players.length !== 2) {
      return Response.json({ error: 'Need exactly 2 players to start' }, { status: 400 })
    }
    
    // Generate questions
    const questions = []
    for (let i = 0; i < 5; i++) {
      const a = Math.floor(Math.random() * 20) + 1
      const b = Math.floor(Math.random() * 20) + 1
      const operation = Math.random() > 0.5 ? '+' : '-'
      let question, answer
      
      if (operation === '+') {
        question = `${a} + ${b}`
        answer = a + b
      } else {
        const larger = Math.max(a, b)
        const smaller = Math.min(a, b)
        question = `${larger} - ${smaller}`
        answer = larger - smaller
      }
      
      questions.push({
        id: i,
        question,
        answer,
        timeLimit: 30
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
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body
    
    // Handle POST requests for more complex operations
    if (action === 'create-lobby') {
      const { playerId, playerAddress } = params
      
      if (!playerId || !playerAddress) {
        return Response.json({ error: 'Missing required parameters' }, { status: 400 })
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
    
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}
