
import { Chess } from 'chess.js';

// --- Engine Logic (moved from engine.ts) ---

const pieceValue = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-Square Tables (from White's perspective)
const pawnEvalWhite = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
const pawnEvalBlack = pawnEvalWhite.slice().reverse();

const knightEval = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const bishopEvalWhite = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];
const bishopEvalBlack = bishopEvalWhite.slice().reverse();

const rookEvalWhite = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];
const rookEvalBlack = rookEvalWhite.slice().reverse();

const queenEval = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const kingEvalWhite = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];
const kingEvalBlack = kingEvalWhite.slice().reverse();

const pst = {
    w: { p: pawnEvalWhite, n: knightEval, b: bishopEvalWhite, r: rookEvalWhite, q: queenEval, k: kingEvalWhite },
    b: { p: pawnEvalBlack, n: knightEval, b: bishopEvalBlack, r: rookEvalBlack, q: queenEval, k: kingEvalBlack }
};

const evaluateBoard = (game: Chess) => {
    if (game.isCheckmate()) return game.turn() === 'w' ? -Infinity : Infinity;
    if (game.isDraw()) return 0;

    let totalEvaluation = 0;
    const board = game.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const value = pieceValue[piece.type] + pst[piece.color][piece.type][i][j];
                totalEvaluation += (piece.color === 'w' ? 1 : -1) * value;
            }
        }
    }
    return totalEvaluation;
};

const minimax = (game: Chess, depth: number, alpha: number, beta: number, isMaximizingPlayer: boolean): { score: number, pv: string[] } => {
    if (depth === 0 || game.isGameOver()) {
        return { score: evaluateBoard(game), pv: [] };
    }

    const moves = game.moves();
    moves.sort((a, b) => (game.get(b.slice(2,4) as any) ? 1 : 0) - (game.get(a.slice(2,4) as any) ? 1 : 0));

    let bestPV: string[] = [];
    let bestScore = isMaximizingPlayer ? -Infinity : Infinity;

    for (const move of moves) {
        game.move(move);
        const result = minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer);
        game.undo();

        if (isMaximizingPlayer) {
            if (result.score > bestScore) {
                bestScore = result.score;
                bestPV = [move, ...result.pv];
            }
            alpha = Math.max(alpha, result.score);
        } else { // Minimizing player
            if (result.score < bestScore) {
                bestScore = result.score;
                bestPV = [move, ...result.pv];
            }
            beta = Math.min(beta, result.score);
        }

        if (beta <= alpha) break;
    }

    return { score: bestScore, pv: bestPV };
};

const findBestMove = (fen: string, depth: number, id: number, isPonder: boolean) => {
    const game = new Chess(fen);
    if (game.isGameOver()) {
        self.postMessage({ type: 'final', id, move: null });
        return;
    }

    const moves = game.moves();
    if (moves.length === 0) {
        self.postMessage({ type: 'final', id, move: null });
        return;
    }
    if (moves.length === 1) {
        if (!isPonder) {
            self.postMessage({ type: 'progress', id, progress: 100 });
        }
        self.postMessage({ type: 'interim', id, variation: [moves[0]] });
        self.postMessage({ type: 'final', id, move: moves[0] });
        return;
    }

    let bestMove: string | null = null;
    const isMaximizingPlayer = game.turn() === 'w';

    for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
        let bestValue = isMaximizingPlayer ? -Infinity : Infinity;
        let currentBestMoveForDepth: string | null = null;
        let bestVariationForDepth: string[] = [];
        
        const moveCount = moves.length;
        let movesAnalyzed = 0;

        for (const move of moves) {
            game.move(move);
            const result = minimax(game, currentDepth - 1, -Infinity, Infinity, !isMaximizingPlayer);
            game.undo();

            const exploredVariation = [move, ...result.pv];
            self.postMessage({ type: 'exploring', id, variation: exploredVariation });

            const boardValue = result.score;
            
            if (isMaximizingPlayer) {
                if (boardValue > bestValue) {
                    bestValue = boardValue;
                    currentBestMoveForDepth = move;
                    bestVariationForDepth = [move, ...result.pv];
                }
            } else {
                if (boardValue < bestValue) {
                    bestValue = boardValue;
                    currentBestMoveForDepth = move;
                    bestVariationForDepth = [move, ...result.pv];
                }
            }

            movesAnalyzed++;
            if (!isPonder) {
                const overallProgress = Math.round((((currentDepth - 1) / depth) + (movesAnalyzed / moveCount / depth)) * 100);
                self.postMessage({ type: 'progress', id, progress: overallProgress });
            }
        }
        
        if (currentBestMoveForDepth) {
            bestMove = currentBestMoveForDepth;
            self.postMessage({ type: 'interim', id, variation: bestVariationForDepth });
        }
    }
    
    const finalMove = bestMove || moves[Math.floor(Math.random() * moves.length)];
    self.postMessage({ type: 'final', id, move: finalMove });
};


// --- Worker Listener ---

self.onmessage = (e: MessageEvent<{ id: number, fen: string, depth: number, isPonder: boolean }>) => {
    const { id, fen, depth, isPonder } = e.data;
    findBestMove(fen, depth, id, isPonder);
};
