const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const matches = new Map(); // matchId -> match data
const players = new Map(); // playerAddress -> matchId
const websockets = new Map(); // playerAddress -> WebSocket

// Contract configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x..."; // Will be set after deployment
const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

// Initialize provider and contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
let wallet = null;

// Only create wallet if private key is provided
if (PRIVATE_KEY && PRIVATE_KEY !== "your_private_key_here") {
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log("Wallet initialized for contract interactions");
} else {
  console.log("No private key provided - running in demo mode");
}

// Contract ABI (minimal for our needs)
const CONTRACT_ABI = [
  "function finalizeDuel(uint256 duelId, address winner) external",
  "function getDuel(uint256 duelId) external view returns (tuple(address playerA, address playerB, uint256 stakeAmount, bool isActive, bool isCompleted))",
  "event DuelCreated(uint256 indexed duelId, address indexed playerA, uint256 stakeAmount)",
  "event DuelJoined(uint256 indexed duelId, address indexed playerB)",
  "event DuelFinalized(uint256 indexed duelId, address indexed winner, uint256 payout)"
];

let contract;

// Initialize contract when address is available
function initializeContract(address) {
  if (address && address !== "0x..." && wallet) {
    contract = new ethers.Contract(address, CONTRACT_ABI, wallet);
    console.log("Contract initialized at:", address);
  } else if (address && address !== "0x...") {
    console.log("Contract address provided but no wallet - running in demo mode");
  }
}

// Math question generator
function generateMathQuestion() {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1, num2, answer;
  
  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 + num2;
      break;
    case '-':
      num1 = Math.floor(Math.random() * 50) + 25;
      num2 = Math.floor(Math.random() * 25) + 1;
      answer = num1 - num2;
      break;
    case '*':
      num1 = Math.floor(Math.random() * 12) + 1;
      num2 = Math.floor(Math.random() * 12) + 1;
      answer = num1 * num2;
      break;
  }
  
  return {
    question: `${num1} ${operation} ${num2} = ?`,
    answer: answer,
    id: uuidv4()
  };
}

// REST API Routes
app.post('/match', (req, res) => {
  const { playerAddress } = req.body;
  
  if (!playerAddress) {
    return res.status(400).json({ error: 'Player address required' });
  }
  
  // Check if player is already in a match
  if (players.has(playerAddress)) {
    return res.status(400).json({ error: 'Player already in a match' });
  }
  
  // Look for available match or create new one
  let matchId = null;
  for (const [id, match] of matches) {
    if (match.players.length === 1 && !match.players.includes(playerAddress)) {
      matchId = id;
      break;
    }
  }
  
  if (!matchId) {
    // Create new match
    matchId = uuidv4();
    matches.set(matchId, {
      id: matchId,
      players: [playerAddress],
      questions: [],
      answers: new Map(),
      status: 'waiting',
      createdAt: Date.now()
    });
  } else {
    // Join existing match
    const match = matches.get(matchId);
    match.players.push(playerAddress);
    match.status = 'ready';
  }
  
  players.set(playerAddress, matchId);
  
  res.json({ 
    matchId, 
    status: matches.get(matchId).status,
    players: matches.get(matchId).players.length 
  });
});

app.get('/match/:matchId', (req, res) => {
  const { matchId } = req.params;
  const match = matches.get(matchId);
  
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }
  
  res.json(match);
});

// WebSocket handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      const { type, playerAddress, matchId, answer, questionId } = message;
      
      switch (type) {
        case 'join':
          websockets.set(playerAddress, ws);
          ws.send(JSON.stringify({ type: 'joined', playerAddress }));
          break;
          
        case 'start_duel':
          const match = matches.get(matchId);
          if (match && match.status === 'ready') {
            // Generate 3 math questions
            const questions = Array.from({ length: 3 }, () => generateMathQuestion());
            match.questions = questions;
            match.status = 'active';
            match.startTime = Date.now();
            
            // Send questions to both players
            match.players.forEach(playerAddr => {
              const playerWs = websockets.get(playerAddr);
              if (playerWs) {
                playerWs.send(JSON.stringify({
                  type: 'questions',
                  questions: questions
                }));
              }
            });
          }
          break;
          
        case 'submit_answer':
          const currentMatch = matches.get(matchId);
          if (currentMatch && currentMatch.status === 'active') {
            if (!currentMatch.answers.has(playerAddress)) {
              currentMatch.answers.set(playerAddress, []);
            }
            
            const playerAnswers = currentMatch.answers.get(playerAddress);
            playerAnswers.push({
              questionId,
              answer,
              timestamp: Date.now()
            });
            
            // Check if both players have answered all questions
            if (playerAnswers.length === 3 && currentMatch.answers.size === 2) {
              await finalizeMatch(matchId);
            }
          }
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Finalize match and determine winner
async function finalizeMatch(matchId) {
  const match = matches.get(matchId);
  if (!match) return;
  
  match.status = 'completed';
  
  // Calculate scores
  const scores = new Map();
  let winner = null;
  let maxScore = 0;
  
  for (const [playerAddress, answers] of match.answers) {
    let score = 0;
    let totalTime = 0;
    
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const question = match.questions[i];
      
      if (answer.answer === question.answer) {
        score += 1;
        totalTime += answer.timestamp - match.startTime;
      }
    }
    
    // Bonus for speed (lower time = higher bonus)
    const speedBonus = Math.max(0, 1 - (totalTime / 30000)); // 30 second max
    score += speedBonus;
    
    scores.set(playerAddress, { score, totalTime });
    
    if (score > maxScore) {
      maxScore = score;
      winner = playerAddress;
    }
  }
  
  match.winner = winner;
  match.scores = Object.fromEntries(scores);
  
  // Notify players of results
  match.players.forEach(playerAddr => {
    const playerWs = websockets.get(playerAddr);
    if (playerWs) {
      playerWs.send(JSON.stringify({
        type: 'match_completed',
        winner,
        scores: match.scores,
        questions: match.questions
      }));
    }
  });
  
  // Call smart contract to finalize duel
  if (contract && match.duelId) {
    try {
      const tx = await contract.finalizeDuel(match.duelId, winner);
      await tx.wait();
      console.log(`Duel ${match.duelId} finalized, winner: ${winner}`);
    } catch (error) {
      console.error('Error finalizing duel:', error);
    }
  } else {
    console.log(`Demo mode: Duel would be finalized, winner: ${winner}`);
  }
  
  // Clean up
  match.players.forEach(playerAddr => {
    players.delete(playerAddr);
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    activeMatches: matches.size,
    connectedPlayers: websockets.size 
  });
});

// Set contract address endpoint (for deployment)
app.post('/set-contract', (req, res) => {
  const { address } = req.body;
  if (address) {
    initializeContract(address);
    res.json({ success: true, contractAddress: address });
  } else {
    res.status(400).json({ error: 'Contract address required' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Math Duel Backend running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`Contract address: ${CONTRACT_ADDRESS}`);
});
