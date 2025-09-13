import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (in production, use a database)
let matches = new Map();
let players = new Map();

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
    default:
      num1 = 1;
      num2 = 1;
      answer = 2;
  }
  
  return {
    question: `${num1} ${operation} ${num2} = ?`,
    answer: answer,
    id: uuidv4()
  };
}

// Simplified finalize function (no contract interaction for now)
async function finalizeMatch(matchId: string) {
  const match = matches.get(matchId);
  if (!match) return;
  
  // Calculate scores
  const player1Address = match.players[0];
  const player2Address = match.players[1];
  
  const player1Answers = match.answers.get(player1Address) || [];
  const player2Answers = match.answers.get(player2Address) || [];
  
  const player1Score = player1Answers.filter((answer: any) => answer.isCorrect).length;
  const player2Score = player2Answers.filter((answer: any) => answer.isCorrect).length;
  
  // Determine winner
  let winner = null;
  if (player1Score > player2Score) {
    winner = player1Address;
  } else if (player2Score > player1Score) {
    winner = player2Address;
  }
  
  match.status = 'completed';
  match.winner = winner;
  match.scores = {
    [player1Address]: player1Score,
    [player2Address]: player2Score
  };
  
  return {
    winner,
    scores: match.scores,
    questions: match.questions
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  
  if (!matchId) {
    return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
  }
  
  const match = matches.get(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    status: match.status,
    players: match.players,
    answers: Object.fromEntries(match.answers),
    winner: match.winner,
    scores: match.scores,
    questions: match.questions
  });
}

export async function POST(request: NextRequest) {
  try {
    const { matchId, playerAddress, action, answer, questionId, currentQuestion } = await request.json();
    
    if (!matchId || !playerAddress || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const match = matches.get(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    if (action === 'start') {
      // Generate questions for the match
      const questions = Array.from({ length: 3 }, () => generateMathQuestion());
      match.questions = questions;
      match.status = 'active';
      
      return NextResponse.json({
        status: 'active',
        questions: questions,
        players: match.players
      });
    }
    
    if (action === 'submit') {
      if (!answer || !questionId) {
        return NextResponse.json({ error: 'Answer and question ID required' }, { status: 400 });
      }
      
      // Get the question to check the answer
      const question = match.questions.find((q: any) => q.id === questionId);
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }
      
      const isCorrect = parseInt(answer) === question.answer;
      
      // Store the answer
      if (!match.answers.has(playerAddress)) {
        match.answers.set(playerAddress, []);
      }
      
      const playerAnswers = match.answers.get(playerAddress);
      playerAnswers.push({
        questionId,
        answer: parseInt(answer),
        isCorrect,
        timestamp: Date.now()
      });
      
      // Check if both players have answered all questions
      const allPlayersAnswered = match.players.every((player: string) => {
        const answers = match.answers.get(player) || [];
        return answers.length >= match.questions.length;
      });
      
      if (allPlayersAnswered) {
        // Finalize the match
        const result = await finalizeMatch(matchId);
        return NextResponse.json({
          status: 'completed',
          result: result
        });
      }
      
      return NextResponse.json({
        status: 'active',
        currentQuestion: currentQuestion + 1,
        totalQuestions: match.questions.length
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
