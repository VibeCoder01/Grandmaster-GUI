import { Chess } from 'chess.js';
import { findBestMove } from '@/ai/flows/find-best-move';

export async function getBestMove(fen: string, depth: number): Promise<string | null> {
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
    const result = await findBestMove({
      boardStateFen: fen,
      legalMoves: moves,
      depth,
    });
    
    if (result && moves.includes(result.bestMove)) {
      return result.bestMove;
    } else {
       console.warn(`AI returned an invalid move: '${result?.bestMove}'. Falling back to random.`);
    }
  } catch (e) {
    console.error("AI engine failed, falling back to random move:", e);
  }

  // Fallback to a random move if AI fails or returns an invalid move.
  return moves[Math.floor(Math.random() * moves.length)];
}
