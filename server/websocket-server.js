const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006'],
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Game state management
const lobbies = new Map();
const players = new Map();

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Generate math questions
const generateQuestions = (count = 5) => {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const operation = Math.random() > 0.5 ? '+' : '-';
    let question, answer;
    
    if (operation === '+') {
      question = `${a} + ${b}`;
      answer = a + b;
    } else {
      // Ensure positive result
      const larger = Math.max(a, b);
      const smaller = Math.min(a, b);
      question = `${larger} - ${smaller}`;
      answer = larger - smaller;
    }
    
    questions.push({
      id: i,
      question,
      answer,
      timeLimit: 30
    });
  }
  return questions;
};

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    // Clean up player data
    for (const [playerId, playerData] of players) {
      if (playerData.ws === ws) {
        players.delete(playerId);
        // Remove from lobby
        for (const [lobbyId, lobby] of lobbies) {
          if (lobby.players.includes(playerId)) {
            lobby.players = lobby.players.filter(id => id !== playerId);
            lobby.playerAddresses = lobby.playerAddresses.filter(addr => addr !== playerData.address);
            if (lobby.players.length === 0) {
              lobbies.delete(lobbyId);
            } else {
              // Notify remaining players
              broadcastToLobby(lobbyId, {
                type: 'player_left',
                playerId,
                players: lobby.players
              });
            }
            break;
          }
        }
        break;
      }
    }
  });
});

function handleMessage(ws, message) {
  switch (message.type) {
    case 'join_lobby':
      handleJoinLobby(ws, message);
      break;
    case 'create_lobby':
      handleCreateLobby(ws, message);
      break;
    case 'start_game':
      handleStartGame(ws, message);
      break;
    case 'submit_answer':
      handleSubmitAnswer(ws, message);
      break;
    case 'get_lobby_status':
      handleGetLobbyStatus(ws, message);
      break;
    case 'player_ready':
      handlePlayerReady(ws, message);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

function handleJoinLobby(ws, message) {
  const { playerId, playerAddress, lobbyId, stakeAmount } = message;
  
  console.log(`Player ${playerId} (${playerAddress}) trying to join lobby ${lobbyId}`);
  console.log(`Available lobbies: ${Array.from(lobbies.keys()).join(', ')}`);
  console.log(`Total lobbies in memory: ${lobbies.size}`);
  
  if (!lobbies.has(lobbyId)) {
    console.log(`Lobby ${lobbyId} not found! Available lobbies:`, Array.from(lobbies.keys()));
    console.log(`Creating new lobby with ID: ${lobbyId}`);
    
    // Create a new lobby if it doesn't exist (fallback for server restarts)
    const lobby = {
      id: lobbyId,
      players: [],
      playerAddresses: [], // Track addresses separately for easier comparison
      status: 'waiting',
      questions: [],
      createdAt: Date.now(),
      stakeAmount: stakeAmount || '0.01',
      duelId: null
    };
    
    lobbies.set(lobbyId, lobby);
    console.log(`Created fallback lobby ${lobbyId}`);
  }
  
  const lobby = lobbies.get(lobbyId);
  
  if (lobby.players.length >= 2) {
    console.log(`Lobby ${lobbyId} is full!`);
    ws.send(JSON.stringify({ type: 'error', message: 'Lobby is full' }));
    return;
  }
  
  // Check if player is already in lobby by address
  if (lobby.playerAddresses.includes(playerAddress)) {
    console.log(`Player ${playerAddress} already in lobby ${lobbyId}!`);
    ws.send(JSON.stringify({ type: 'error', message: 'Player already in lobby' }));
    return;
  }
  
  // Add player to lobby
  lobby.players.push(playerId);
  lobby.playerAddresses.push(playerAddress);
  players.set(playerId, {
    ws,
    address: playerAddress,
    lobbyId,
    answers: [],
    score: 0,
    isReady: false,
    isStaked: true
  });
  
  console.log(`Player ${playerId} (${playerAddress}) joined lobby ${lobbyId} successfully. Players: ${lobby.players.join(', ')}`);
  
  // Get player data for response
  const playerData = lobby.players.map(pId => {
    const player = players.get(pId);
    return {
      id: pId,
      address: player.address,
      isReady: player.isReady || false,
      stakeAmount: lobby.stakeAmount,
      isStaked: player.isStaked || false
    };
  });
  
  // Notify all players in lobby
  broadcastToLobby(lobbyId, {
    type: 'lobby_joined',
    players: playerData,
    lobbyStatus: 'waiting'
  });
  
  console.log(`Player ${playerId} joined lobby ${lobbyId}`);
  
  // Auto-start game when both players are in lobby
  if (lobby.players.length === 2) {
    console.log(`Both players in lobby ${lobbyId}, starting game automatically`);
    handleStartGame({ send: (msg) => broadcastToLobby(lobbyId, JSON.parse(msg)) }, { lobbyId });
  }
}

function handleCreateLobby(ws, message) {
  const { playerId, playerAddress, stakeAmount, duelId } = message;
  const lobbyId = `lobby_${Date.now()}_${generateId()}`;
  
  console.log(`Creating lobby ${lobbyId} for player ${playerId} (${playerAddress})`);
  
  const lobby = {
    id: lobbyId,
    players: [playerId],
    playerAddresses: [playerAddress], // Track addresses separately for easier comparison
    status: 'waiting',
    questions: [],
    createdAt: Date.now(),
    stakeAmount: stakeAmount || '0.01',
    duelId: duelId || null
  };
  
  lobbies.set(lobbyId, lobby);
  players.set(playerId, {
    ws,
    address: playerAddress,
    lobbyId,
    answers: [],
    score: 0,
    isReady: false,
    isStaked: true
  });
  
  ws.send(JSON.stringify({
    type: 'lobby_created',
    lobbyId,
    players: [{
      id: playerId,
      address: playerAddress,
      isReady: false,
      stakeAmount: stakeAmount || '0.01',
      isStaked: true
    }],
    duelId: duelId || null
  }));
  
  console.log(`Lobby ${lobbyId} created successfully. Total lobbies: ${lobbies.size}`);
}

function handleStartGame(ws, message) {
  const { lobbyId } = message;
  
  if (!lobbies.has(lobbyId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
    return;
  }
  
  const lobby = lobbies.get(lobbyId);
  
  if (lobby.players.length !== 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Need exactly 2 players to start' }));
    return;
  }
  
  // Generate questions
  lobby.questions = generateQuestions(5);
  lobby.status = 'playing';
  
  // Notify all players
  console.log(`Sending duel_started message to lobby ${lobbyId}`);
  broadcastToLobby(lobbyId, {
    type: 'duel_started',
    lobbyId: lobbyId,
    players: lobby.players.map(pId => {
      const player = players.get(pId);
      return {
        id: pId,
        address: player.address,
        isReady: player.isReady || false,
        stakeAmount: lobby.stakeAmount,
        isStaked: player.isStaked || false
      };
    }),
    questions: lobby.questions,
    lobbyStatus: 'playing'
  });
  
  console.log(`Game started in lobby ${lobbyId}`);
  
  // Store previous scores to avoid spam
  lobby.lastScores = new Map();
  
  // Start periodic score updates during the game (only when scores change)
  lobby.scoreUpdateInterval = setInterval(() => {
    if (lobby.status === 'playing') {
      const playerScores = lobby.players.map(pId => {
        const player = players.get(pId);
        return {
          playerId: pId,
          playerAddress: player ? player.address : null,
          score: player ? player.score : 0
        };
      });
      
      // Check if scores have changed
      let scoresChanged = false;
      for (const scoreData of playerScores) {
        const lastScore = lobby.lastScores.get(scoreData.playerId) || 0;
        if (scoreData.score !== lastScore) {
          scoresChanged = true;
          lobby.lastScores.set(scoreData.playerId, scoreData.score);
        }
      }
      
      // Only broadcast if scores changed
      if (scoresChanged) {
        broadcastToLobby(lobbyId, {
          type: 'score_sync',
          playerScores
        });
      }
    }
  }, 1000); // Check every 1 second but only send when changed
  
  // Set a timeout to force end the game after 5 minutes (300 seconds)
  lobby.gameTimeout = setTimeout(() => {
    if (lobby.status === 'playing') {
      console.log(`Game timeout reached for lobby ${lobbyId}, forcing game end`);
      // Force end the game
      const results = lobby.players.map(pId => {
        const p = players.get(pId);
        return {
          playerId: pId,
          playerAddress: p.address,
          score: p.score,
          answers: p.answers
        };
      });
      
      // Sort results by score to determine winner
      results.sort((a, b) => b.score - a.score);
      
      const winner = results[0].score > results[1].score ? results[0] : null;
      const loser = results[0].score > results[1].score ? results[1] : null;
      const isTie = results[0].score === results[1].score;
      
      console.log(`Forced game end - Winner: ${winner ? winner.playerAddress : 'Tie'}`);
      
      broadcastToLobby(lobbyId, {
        type: 'game_finished',
        results,
        winner: winner ? winner.playerAddress : null,
        loser: loser ? loser.playerAddress : null,
        isTie: isTie,
        winnerScore: results[0].score,
        loserScore: results[1].score
      });
      
      lobby.status = 'finished';
      
      // Clear intervals
      if (lobby.scoreUpdateInterval) {
        clearInterval(lobby.scoreUpdateInterval);
        lobby.scoreUpdateInterval = null;
      }
    }
  }, 300000); // 5 minutes timeout
}

function handleSubmitAnswer(ws, message) {
  const { playerId, questionId, answer, lobbyId } = message;
  
  if (!lobbies.has(lobbyId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
    return;
  }
  
  const lobby = lobbies.get(lobbyId);
  const player = players.get(playerId);
  
  if (!player) {
    ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
    return;
  }
  
  // Check if answer is correct
  const question = lobby.questions.find(q => q.id === questionId);
  if (!question) {
    ws.send(JSON.stringify({ type: 'error', message: 'Question not found' }));
    return;
  }
  
  const isCorrect = parseInt(answer) === question.answer;
  const answerData = {
    questionId,
    answer: parseInt(answer),
    isCorrect,
    timestamp: Date.now()
  };
  
  // Update player's answers
  player.answers.push(answerData);
  if (isCorrect) {
    player.score += 1;
  }
  
  // Notify all players about the answer
  broadcastToLobby(lobbyId, {
    type: 'answer_submitted',
    playerId,
    playerAddress: player.address,
    questionId,
    answer: parseInt(answer),
    isCorrect,
    score: player.score,
    timestamp: Date.now()
  });
  
  // Send real-time score update with both playerId and playerAddress
  broadcastToLobby(lobbyId, {
    type: 'score_update',
    playerId,
    playerAddress: player.address,
    score: player.score,
    isCorrect,
    timestamp: Date.now()
  });
  
  // Send immediate score sync to ensure both players see the update
  const playerScores = lobby.players.map(pId => {
    const p = players.get(pId);
    return {
      playerId: pId,
      playerAddress: p.address,
      score: p.score
    };
  });
  
  broadcastToLobby(lobbyId, {
    type: 'score_sync',
    playerScores,
    timestamp: Date.now()
  });
  
  // Check if all questions answered - be more strict about this
  const allAnswered = lobby.players.every(pId => {
    const p = players.get(pId);
    return p && p.answers.length >= lobby.questions.length;
  });
  
  console.log(`Player ${playerId} answered question ${questionId}. Current answers: ${player.answers.length}/${lobby.questions.length}`);
  console.log(`All players answered: ${allAnswered}. Players: ${lobby.players.map(pId => {
    const p = players.get(pId);
    return `${pId}(${p?.address}): ${p?.answers.length || 0}/${lobby.questions.length}`;
  }).join(', ')}`);
  
  // Only end game if both players have answered all questions AND we have exactly 2 players
  if (allAnswered && lobby.players.length === 2) {
    // Game finished - determine winner and loser
    const results = lobby.players.map(pId => {
      const p = players.get(pId);
      return {
        playerId: pId,
        playerAddress: p.address,
        score: p.score,
        answers: p.answers
      };
    });
    
    // Sort results by score to determine winner
    results.sort((a, b) => b.score - a.score);
    
    const winner = results[0].score > results[1].score ? results[0] : null;
    const loser = results[0].score > results[1].score ? results[1] : null;
    const isTie = results[0].score === results[1].score;
    
    console.log(`Game finished in lobby ${lobbyId}:`);
    console.log(`Player 1 (${results[0].playerAddress}): ${results[0].score} points`);
    console.log(`Player 2 (${results[1].playerAddress}): ${results[1].score} points`);
    console.log(`Winner: ${winner ? winner.playerAddress : 'Tie'}`);
    
    broadcastToLobby(lobbyId, {
      type: 'game_finished',
      results,
      winner: winner ? winner.playerAddress : null,
      loser: loser ? loser.playerAddress : null,
      isTie: isTie,
      winnerScore: results[0].score,
      loserScore: results[1].score
    });
    
    lobby.status = 'finished';
    
    // Clear the score update interval and timeout
    if (lobby.scoreUpdateInterval) {
      clearInterval(lobby.scoreUpdateInterval);
      lobby.scoreUpdateInterval = null;
    }
    if (lobby.gameTimeout) {
      clearTimeout(lobby.gameTimeout);
      lobby.gameTimeout = null;
    }
  }
}

function handlePlayerReady(ws, message) {
  const { playerAddress, lobbyId } = message;
  
  if (!lobbies.has(lobbyId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
    return;
  }
  
  const lobby = lobbies.get(lobbyId);
  const player = Array.from(players.values()).find(p => p.address === playerAddress && p.lobbyId === lobbyId);
  
  if (!player) {
    ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
    return;
  }
  
  player.isReady = true;
  
  // Get updated player data
  const playerData = lobby.players.map(pId => {
    const p = players.get(pId);
    return {
      id: pId,
      address: p.address,
      isReady: p.isReady || false,
      stakeAmount: lobby.stakeAmount,
      isStaked: p.isStaked || false
    };
  });
  
  // Notify all players
  broadcastToLobby(lobbyId, {
    type: 'player_ready',
    playerAddress,
    players: playerData
  });
  
  // Check if both players are ready
  const allReady = lobby.players.every(pId => {
    const p = players.get(pId);
    return p && p.isReady;
  });
  
  if (allReady && lobby.players.length === 2) {
    broadcastToLobby(lobbyId, {
      type: 'duel_started',
      lobbyId,
      players: playerData
    });
  }
}

function handleGetLobbyStatus(ws, message) {
  const { lobbyId } = message;
  
  if (!lobbies.has(lobbyId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
    return;
  }
  
  const lobby = lobbies.get(lobbyId);
  const playerScores = lobby.players.map(pId => {
    const player = players.get(pId);
    return {
      playerId: pId,
      score: player ? player.score : 0,
      answersCount: player ? player.answers.length : 0
    };
  });
  
  ws.send(JSON.stringify({
    type: 'lobby_status',
    lobbyId,
    players: lobby.players,
    status: lobby.status,
    questions: lobby.questions,
    playerScores
  }));
}

function broadcastToLobby(lobbyId, message) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) {
    console.log(`Lobby ${lobbyId} not found for broadcast`);
    return;
  }
  
  console.log(`Broadcasting ${message.type} to ${lobby.players.length} players in lobby ${lobbyId}`);
  lobby.players.forEach(playerId => {
    const player = players.get(playerId);
    if (player && player.ws.readyState === WebSocket.OPEN) {
      console.log(`Sending ${message.type} to player ${playerId}`);
      player.ws.send(JSON.stringify(message));
    } else {
      console.log(`Player ${playerId} WebSocket not open (readyState: ${player?.ws?.readyState})`);
    }
  });
}

// API endpoints
app.get('/api/lobbies', (req, res) => {
  const lobbyList = Array.from(lobbies.values()).map(lobby => ({
    id: lobby.id,
    players: lobby.players.length,
    status: lobby.status,
    createdAt: lobby.createdAt
  }));
  
  res.json({ lobbies: lobbyList });
});

app.get('/api/online-players', (req, res) => {
  const onlineCount = players.size;
  const waitingPlayers = Array.from(players.values())
    .filter(p => lobbies.get(p.lobbyId)?.status === 'waiting')
    .map(p => ({
      address: p.address,
      joinedAt: lobbies.get(p.lobbyId)?.createdAt || Date.now()
    }));
  
  res.json({
    totalOnline: onlineCount,
    waitingPlayers
  });
});

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
