import { Chess, type Square } from 'chess.js';

export async function getBestMove(fen: string): Promise<string | null> {
  return new Promise(resolve => {
    setTimeout(() => {
      try {
        const game = new Chess(fen);
        if (game.isGameOver()) {
          resolve(null);
          return;
        }

        const moves = game.moves({ verbose: true });
        
        const captureMoves = moves.filter(move => move.flags.includes('c'));
        if (captureMoves.length > 0) {
          const bestMove = captureMoves[Math.floor(Math.random() * captureMoves.length)].san;
          resolve(bestMove);
          return;
        }
        
        const centerSquares: Square[] = ['e4', 'd4', 'e5', 'd5'];
        const centerMoves = moves.filter(move => centerSquares.includes(move.to));
        if (centerMoves.length > 0) {
          const bestMove = centerMoves[Math.floor(Math.random() * centerMoves.length)].san;
          resolve(bestMove);
          return;
        }

        const bestMove = moves[Math.floor(Math.random() * moves.length)].san;
        resolve(bestMove);
      } catch (e) {
        console.error("Error in mock engine:", e);
        resolve(null);
      }
    }, 500 + Math.random() * 1000); // Simulate thinking time
  });
}
