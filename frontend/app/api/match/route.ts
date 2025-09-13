import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (in production, use a database)
let matches = new Map();
let players = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  
  if (matchId) {
    // Get specific match
    const match = matches.get(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    return NextResponse.json(match);
  } else {
    // Get all waiting players (global queue status)
    const waitingPlayers = Array.from(matches.values())
      .filter(match => match.status === 'waiting')
      .flatMap(match => match.players.map(address => ({
        address,
        joinedAt: match.createdAt
      })));
    
    return NextResponse.json({ 
      waitingPlayers,
      totalWaiting: waitingPlayers.length
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { playerAddress } = await request.json();
    
    if (!playerAddress) {
      return NextResponse.json({ error: 'Player address required' }, { status: 400 });
    }
    
    // Check if player is already in a match
    if (players.has(playerAddress)) {
      return NextResponse.json({ error: 'Player already in a match' }, { status: 400 });
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
    
    // Get all waiting players (players in matches with status 'waiting')
    const waitingPlayers = Array.from(matches.values())
      .filter(match => match.status === 'waiting')
      .flatMap(match => match.players.map(address => ({
        address,
        joinedAt: match.createdAt
      })));

    return NextResponse.json({ 
      matchId, 
      status: matches.get(matchId).status,
      players: matches.get(matchId).players.length,
      waitingPlayers
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
