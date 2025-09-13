import { v4 as uuidv4 } from 'uuid';

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
  }
  
  return {
    question: `${num1} ${operation} ${num2} = ?`,
    answer: answer,
    id: uuidv4()
  };
}

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { matchId, playerAddress, action } = req.body;
    
    if (!matchId || !playerAddress) {
      return res.status(400).json({ error: 'Match ID and player address required' });
    }
    
    const match = matches.get(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (action === 'start') {
      if (match.status === 'ready') {
        // Generate 3 math questions
        const questions = Array.from({ length: 3 }, () => generateMathQuestion());
        match.questions = questions;
        match.status = 'active';
        match.startTime = Date.now();
        match.answers = new Map();
        
        res.json({
          success: true,
          questions: questions,
          status: 'active'
        });
      } else {
        res.status(400).json({ error: 'Match not ready' });
      }
    } else if (action === 'submit') {
      const { answer, questionId, currentQuestion } = req.body;
      
      if (!match.answers.has(playerAddress)) {
        match.answers.set(playerAddress, []);
      }
      
      const playerAnswers = match.answers.get(playerAddress);
      playerAnswers.push({
        questionId,
        answer,
        currentQuestion,
        timestamp: Date.now()
      });
      
      // Check if both players have answered all questions
      if (playerAnswers.length === 3 && match.answers.size === 2) {
        // Calculate scores
        const scores = new Map();
        let winner = null;
        let maxScore = 0;
        
        for (const [playerAddr, answers] of match.answers) {
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
          
          scores.set(playerAddr, { score, totalTime });
          
          if (score > maxScore) {
            maxScore = score;
            winner = playerAddr;
          }
        }
        
        match.winner = winner;
        match.scores = Object.fromEntries(scores);
        match.status = 'completed';
        
        res.json({
          success: true,
          match_completed: true,
          winner,
          scores: match.scores,
          questions: match.questions
        });
      } else {
        res.json({
          success: true,
          message: 'Answer recorded'
        });
      }
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
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
