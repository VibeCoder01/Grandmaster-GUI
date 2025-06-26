import { Chess, type Square } from 'chess.js';
import { findBestMove } from '@/ai/flows/find-best-move';

async function getFallbackMove(fen: string): Promise<string | null> {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // 1. Prioritize Captures
  const captureMoves = moves.filter(move => move.flags.includes('c'));
  if (captureMoves.length > 0) {
    return captureMoves[Math.floor(Math.random() * captureMoves.length)].san;
  }

  // 2. Develop Knights
  const knightMoves = moves.filter(move => 
      move.piece === 'n' && 
      (move.from === 'b8' || move.from === 'g8')
  );
  if (knightMoves.length > 0) {
      return knightMoves[Math.floor(Math.random() * knightMoves.length)].san;
  }

  // 3. Develop Bishops
  const bishopMoves = moves.filter(move => 
      move.piece === 'b' && 
      (move.from === 'c8' || move.from === 'f8')
  );
  if (bishopMoves.length > 0) {
      return bishopMoves[Math.floor(Math.random() * bishopMoves.length)].san;
  }
  
  // 4. Castle for King Safety
  const kingsideCastle = moves.find(move => move.flags.includes('k'));
  if (kingsideCastle) {
      return kingsideCastle.san;
  }
  const queensideCastle = moves.find(move => move.flags.includes('q'));
  if (queensideCastle) {
      return queensideCastle.san;
  }

  // 5. Control the Center
  const centerSquares: Square[] = ['e4', 'd4', 'e5', 'd5'];
  const centerMoves = moves.filter(move => centerSquares.includes(move.to));
  if (centerMoves.length > 0) {
    return centerMoves[Math.floor(Math.random() * centerMoves.length)].san;
  }

  // 6. Fallback to any random move
  return moves[Math.floor(Math.random() * moves.length)].san;
}

export async function getBestMove(fen: string): Promise<string | null> {
  const game = new Chess(fen);
  if (game.isGameOver()) {
    return null;
  }

  const moves = game.moves();
  if (moves.length === 0) {
    return null;
  }
  if (moves.length === 1) {
    return moves[0];
  }

  try {
    // Add a timeout to prevent waiting forever on the AI
    const aiPromise = findBestMove({
      boardStateFen: fen,
      legalMoves: moves,
    });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)); // 5 second timeout
    
    const result = await Promise.race([aiPromise, timeoutPromise]);
    
    if (result && moves.includes(result.bestMove)) {
      return result.bestMove;
    }
  } catch (e) {
    console.error("AI engine failed, using fallback:", e);
  }

  // If AI fails, times out, or returns an invalid move, use the fallback logic.
  return await getFallbackMove(fen);
}
