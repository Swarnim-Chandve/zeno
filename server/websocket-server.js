const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
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
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

function handleJoinLobby(ws, message) {
  const { playerId, playerAddress, lobbyId } = message;
  
  if (!lobbies.has(lobbyId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
    return;
  }
  
  const lobby = lobbies.get(lobbyId);
  
  if (lobby.players.length >= 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Lobby is full' }));
    return;
  }
  
  if (lobby.players.includes(playerId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Player already in lobby' }));
    return;
  }
  
  // Add player to lobby
  lobby.players.push(playerId);
  players.set(playerId, {
    ws,
    address: playerAddress,
    lobbyId,
    answers: [],
    score: 0
  });
  
  // Notify all players in lobby
  broadcastToLobby(lobbyId, {
    type: 'player_joined',
    playerId,
    players: lobby.players,
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
  const { playerId, playerAddress } = message;
  const lobbyId = generateId();
  
  const lobby = {
    id: lobbyId,
    players: [playerId],
    status: 'waiting',
    questions: [],
    createdAt: Date.now()
  };
  
  lobbies.set(lobbyId, lobby);
  players.set(playerId, {
    ws,
    address: playerAddress,
    lobbyId,
    answers: [],
    score: 0
  });
  
  ws.send(JSON.stringify({
    type: 'lobby_created',
    lobbyId,
    players: [playerId]
  }));
  
  console.log(`Lobby ${lobbyId} created by player ${playerId}`);
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
  broadcastToLobby(lobbyId, {
    type: 'game_started',
    questions: lobby.questions,
    lobbyStatus: 'playing'
  });
  
  console.log(`Game started in lobby ${lobbyId}`);
  
  // Start periodic score updates during the game
  lobby.scoreUpdateInterval = setInterval(() => {
    if (lobby.status === 'playing') {
      const playerScores = lobby.players.map(pId => {
        const player = players.get(pId);
        return {
          playerId: pId,
          score: player ? player.score : 0
        };
      });
      
      broadcastToLobby(lobbyId, {
        type: 'score_sync',
        playerScores
      });
    }
  }, 2000); // Update every 2 seconds
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
    questionId,
    answer: parseInt(answer),
    isCorrect,
    score: player.score
  });
  
  // Send real-time score update
  broadcastToLobby(lobbyId, {
    type: 'score_update',
    playerId,
    score: player.score,
    isCorrect
  });
  
  // Check if all questions answered
  const allAnswered = lobby.players.every(pId => {
    const p = players.get(pId);
    return p && p.answers.length >= lobby.questions.length;
  });
  
  if (allAnswered) {
    // Game finished
    const results = lobby.players.map(pId => {
      const p = players.get(pId);
      return {
        playerId: pId,
        score: p.score,
        answers: p.answers
      };
    });
    
    broadcastToLobby(lobbyId, {
      type: 'game_finished',
      results,
      winner: results[0].score > results[1].score ? results[0].playerId : 
              results[1].score > results[0].score ? results[1].playerId : null
    });
    
    lobby.status = 'finished';
    
    // Clear the score update interval
    if (lobby.scoreUpdateInterval) {
      clearInterval(lobby.scoreUpdateInterval);
      lobby.scoreUpdateInterval = null;
    }
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
  if (!lobby) return;
  
  lobby.players.forEach(playerId => {
    const player = players.get(playerId);
    if (player && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
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
