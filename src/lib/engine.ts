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
        const moves = game.moves();
        const move = moves[Math.floor(Math.random() * moves.length)];
        resolve(move);
      } catch (e) {
        console.error("Error in mock engine:", e);
        resolve(null);
      }
    }, 500 + Math.random() * 1000); // Simulate thinking time
  });
}
