
"use client";

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { Chess, type Square, type PieceSymbol, type Move } from 'chess.js';

type GameState = {
  fen: string;
  history: Move[];
  isGameOver: boolean;
  moveHistoryIndex: number;
  whiteTime: number; // in seconds
  blackTime: number; // in seconds
};

type Action =
  | { type: 'MOVE'; move: string | { from: Square; to: Square; promotion?: string } }
  | { type: 'SET_HISTORY_INDEX'; index: number }
  | { type: 'RESET'; timeControl: number }
  | { type: 'TICK' }
  | { type: 'LOAD_GAME'; state: GameState };

function getStatus(game: Chess): string {
  if (game.isCheckmate()) return `Checkmate - ${game.turn() === 'w' ? 'Black' : 'White'} wins`;
  if (game.isDraw()) return 'Draw';
  if (game.isStalemate()) return 'Stalemate';
  if (game.isThreefoldRepetition()) return 'Threefold Repetition';
  if (game.isInsufficientMaterial()) return 'Insufficient Material';
  if (game.isCheck()) return 'Check';
  return 'In Progress';
}

function createInitialState(timeControl: number): GameState {
    const game = new Chess();
    return {
        fen: game.fen(),
        history: [],
        isGameOver: false,
        moveHistoryIndex: 0,
        whiteTime: timeControl,
        blackTime: timeControl,
    };
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'MOVE': {
      if (state.moveHistoryIndex !== state.history.length) return state;

      const game = new Chess(state.fen);
      try {
        const moveResult = game.move(action.move);
        if (!moveResult) return state; // Illegal move
        
        const newHistory = [...state.history, moveResult];
        const isTimeout = state.whiteTime <= 0 || state.blackTime <= 0;
        
        return {
          ...state,
          fen: game.fen(),
          history: newHistory,
          isGameOver: game.isGameOver() || isTimeout,
          moveHistoryIndex: newHistory.length,
        };
      } catch (e) {
        return state;
      }
    }
    case 'SET_HISTORY_INDEX': {
      const newIndex = Math.max(0, Math.min(action.index, state.history.length));
      if (newIndex === state.moveHistoryIndex) return state;

      const tempGame = new Chess();
      for(let i = 0; i < newIndex; i++) {
        tempGame.move(state.history[i]);
      }
      
      return {
        ...state,
        fen: tempGame.fen(),
        moveHistoryIndex: newIndex,
      };
    }
    case 'RESET':
      return createInitialState(action.timeControl);
      
    case 'TICK': {
      if (state.isGameOver || state.moveHistoryIndex < state.history.length) return state;
      
      const game = new Chess(state.fen);
      const turn = game.turn();

      const newWhiteTime = turn === 'w' ? state.whiteTime - 1 : state.whiteTime;
      const newBlackTime = turn === 'b' ? state.blackTime - 1 : state.blackTime;
      
      const isTimeout = newWhiteTime < 0 || newBlackTime < 0;

      return {
        ...state,
        whiteTime: Math.max(0, newWhiteTime),
        blackTime: Math.max(0, newBlackTime),
        isGameOver: state.isGameOver || isTimeout,
      };
    }
    case 'LOAD_GAME':
      return action.state;
    default:
      return state;
  }
}

export function useChessGame(initialTimeControl: number = 600) {
  const [state, dispatch] = useReducer(gameReducer, initialTimeControl, createInitialState);

  useEffect(() => {
    if (state.isGameOver || state.moveHistoryIndex < state.history.length) {
      return;
    }

    const timer = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isGameOver, state.moveHistoryIndex, state.history.length, state.fen]);


  const makeMove = useCallback((move: string | { from: Square; to: Square; promotion?: string }) => {
    dispatch({ type: 'MOVE', move });
  }, []);

  const resetGame = useCallback((timeControl: number) => {
    dispatch({ type: 'RESET', timeControl });
  }, []);

  const setMoveHistoryIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_HISTORY_INDEX', index });
  }, []);

  const loadGame = useCallback((newState: GameState) => {
    dispatch({ type: 'LOAD_GAME', state: newState });
  }, []);
  
  const game = useMemo(() => {
    // When loading a game, fen might be out of sync with history momentarily.
    // Reconstruct game from history for consistency.
    const g = new Chess();
    try {
      state.history.slice(0, state.moveHistoryIndex).forEach(m => g.move(m.san));
    } catch(e) {
      console.error("Error replaying history", e);
      // Fallback to FEN if history is broken
      return new Chess(state.fen);
    }
    return g;
  }, [state.fen, state.history, state.moveHistoryIndex]);

  const status = useMemo(() => {
    if (state.whiteTime <= 0) return 'Black wins on time';
    if (state.blackTime <= 0) return 'White wins on time';
    const g = new Chess(state.fen);
    return getStatus(g);
  }, [state.whiteTime, state.blackTime, state.fen]);

  const lastMove = useMemo(() => {
    if (state.moveHistoryIndex > 0) {
      return state.history[state.moveHistoryIndex - 1];
    }
    return undefined;
  }, [state.history, state.moveHistoryIndex]);

  const { capturedByWhite, capturedByBlack } = useMemo(() => {
    const capturedByWhite: PieceSymbol[] = [];
    const capturedByBlack: PieceSymbol[] = [];
    state.history.forEach(move => {
        if (move.captured) {
            if (move.color === 'w') { // White made the move, captured a black piece
                capturedByWhite.push(move.captured);
            } else { // Black made the move, captured a white piece
                capturedByBlack.push(move.captured);
            }
        }
    });
    
    const pieceOrder: Record<PieceSymbol, number> = { q: 1, r: 2, b: 3, n: 4, p: 5, k: 0 };
    capturedByWhite.sort((a, b) => pieceOrder[a] - pieceOrder[b]);
    capturedByBlack.sort((a, b) => pieceOrder[a] - pieceOrder[b]);

    return { capturedByWhite, capturedByBlack };
  }, [state.history]);

  return {
    gameState: state,
    fen: game.fen(),
    board: game.board(),
    turn: game.turn(),
    status,
    isGameOver: state.isGameOver,
    history: state.history,
    moveHistoryIndex: state.moveHistoryIndex,
    isViewingHistory: state.moveHistoryIndex < state.history.length,
    lastMove,
    whiteTime: state.whiteTime,
    blackTime: state.blackTime,
    capturedByWhite,
    capturedByBlack,
    makeMove,
    resetGame,
    setMoveHistoryIndex,
    loadGame,
  };
}
