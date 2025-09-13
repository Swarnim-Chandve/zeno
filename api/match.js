const { v4: uuidv4 } = require('uuid');

// In-memory storage (in production, use a database)
let matches = new Map();
let players = new Map();

module.exports = function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
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
  } else if (req.method === 'GET') {
    const { matchId } = req.query;
    const match = matches.get(matchId);
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(match);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
