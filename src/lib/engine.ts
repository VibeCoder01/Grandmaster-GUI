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
        
        // 1. Prioritize Captures
        const captureMoves = moves.filter(move => move.flags.includes('c'));
        if (captureMoves.length > 0) {
          const bestMove = captureMoves[Math.floor(Math.random() * captureMoves.length)].san;
          resolve(bestMove);
          return;
        }

        // 2. Develop Knights (engine is always black)
        const knightMoves = moves.filter(move => 
            move.piece === 'n' && 
            (move.from === 'b8' || move.from === 'g8')
        );
        if (knightMoves.length > 0) {
            const bestMove = knightMoves[Math.floor(Math.random() * knightMoves.length)].san;
            resolve(bestMove);
            return;
        }

        // 3. Develop Bishops (engine is always black)
        const bishopMoves = moves.filter(move => 
            move.piece === 'b' && 
            (move.from === 'c8' || move.from === 'f8')
        );
        if (bishopMoves.length > 0) {
            const bestMove = bishopMoves[Math.floor(Math.random() * bishopMoves.length)].san;
            resolve(bestMove);
            return;
        }
        
        // 4. Castle for King Safety (prioritizing kingside)
        const kingsideCastle = moves.find(move => move.flags.includes('k'));
        if (kingsideCastle) {
            resolve(kingsideCastle.san);
            return;
        }
        const queensideCastle = moves.find(move => move.flags.includes('q'));
        if (queensideCastle) {
            resolve(queensideCastle.san);
            return;
        }

        // 5. Control the Center
        const centerSquares: Square[] = ['e4', 'd4', 'e5', 'd5'];
        const centerMoves = moves.filter(move => centerSquares.includes(move.to));
        if (centerMoves.length > 0) {
          const bestMove = centerMoves[Math.floor(Math.random() * centerMoves.length)].san;
          resolve(bestMove);
          return;
        }

        // 6. Fallback to any random move
        const bestMove = moves[Math.floor(Math.random() * moves.length)].san;
        resolve(bestMove);
      } catch (e) {
        console.error("Error in mock engine:", e);
        resolve(null);
      }
    }, 500 + Math.random() * 1000); // Simulate thinking time
  });
}
