import { Chess } from 'chess.js';

export async function getBestMove(fen: string): Promise<string | null> {
  return new Promise(resolve => {
    setTimeout(() => {
      try {
        const game = new Chess(fen);
        if (game.isGameOver()) {
          resolve(null);
          return;
        }

        // Get all legal moves with details
        const moves = game.moves({ verbose: true });
        
        // Find all moves that are captures
        const captureMoves = moves.filter(move => move.flags.includes('c'));

        let bestMove;
        if (captureMoves.length > 0) {
          // If there are captures, pick a random one
          bestMove = captureMoves[Math.floor(Math.random() * captureMoves.length)].san;
        } else {
          // Otherwise, pick any random legal move
          bestMove = moves[Math.floor(Math.random() * moves.length)].san;
        }
        
        resolve(bestMove);
      } catch (e) {
        console.error("Error in mock engine:", e);
        resolve(null);
      }
    }, 500 + Math.random() * 1000); // Simulate thinking time
  });
}
