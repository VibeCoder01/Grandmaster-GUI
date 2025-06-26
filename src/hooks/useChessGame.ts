"use client";

import { useReducer, useCallback, useMemo } from 'react';
import { Chess, type Square, type Piece as PieceInfo, type Move } from 'chess.js';

type GameState = {
  // fen is the single source of truth for the current board state being displayed.
  fen: string;
  // history is the full history of the game.
  history: Move[];
  // isGameOver is true only when the main game line is over.
  isGameOver: boolean;
  // moveHistoryIndex tracks which point in the history we are viewing.
  moveHistoryIndex: number;
};

type Action =
  | { type: 'MOVE'; move: string | { from: Square; to: Square; promotion?: string } }
  | { type: 'SET_HISTORY_INDEX'; index: number }
  | { type: 'RESET' };

function getStatus(game: Chess): string {
  if (game.isCheckmate()) return 'Checkmate';
  if (game.isDraw()) return 'Draw';
  if (game.isStalemate()) return 'Stalemate';
  if (game.isThreefoldRepetition()) return 'Threefold Repetition';
  if (game.isInsufficientMaterial()) return 'Insufficient Material';
  if (game.isCheck()) return 'Check';
  return 'In Progress';
}

function createInitialState(): GameState {
    const game = new Chess();
    return {
        fen: game.fen(),
        history: [],
        isGameOver: false,
        moveHistoryIndex: 0,
    };
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'MOVE': {
      // A move can only be made if we are at the end of the history.
      if (state.moveHistoryIndex !== state.history.length) return state;

      const game = new Chess(state.fen);
      try {
        const moveResult = game.move(action.move);
        const newHistory = [...state.history, moveResult];
        return {
          ...state,
          fen: game.fen(),
          history: newHistory,
          isGameOver: game.isGameOver(),
          moveHistoryIndex: newHistory.length,
        };
      } catch (e) {
        // Invalid move, return current state without crashing.
        return state;
      }
    }
    case 'SET_HISTORY_INDEX': {
      const newIndex = Math.max(0, Math.min(action.index, state.history.length));
      const newFen = newIndex > 0 ? state.history[newIndex - 1].after : new Chess().fen();

      return {
        ...state,
        fen: newFen,
        moveHistoryIndex: newIndex,
      };
    }
    case 'RESET':
      return createInitialState();
    default:
      return state;
  }
}

export function useChessGame() {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());

  const makeMove = useCallback((move: string | { from: Square; to: Square; promotion?: string }) => {
    dispatch({ type: 'MOVE', move });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const setMoveHistoryIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_HISTORY_INDEX', index });
  }, []);
  
  // Create a temporary game instance from the current FEN to derive board state.
  const game = useMemo(() => new Chess(state.fen), [state.fen]);

  const lastMove = useMemo(() => {
    if (state.moveHistoryIndex > 0) {
      return state.history[state.moveHistoryIndex - 1];
    }
    return undefined;
  }, [state.history, state.moveHistoryIndex]);

  return {
    fen: state.fen,
    board: game.board(),
    turn: game.turn(),
    status: getStatus(game),
    // isGameOver should reflect the end of the main game line, not the viewed history state.
    isGameOver: state.isGameOver,
    history: state.history,
    moveHistoryIndex: state.moveHistoryIndex,
    isViewingHistory: state.moveHistoryIndex < state.history.length,
    lastMove,
    makeMove,
    resetGame,
    setMoveHistoryIndex,
  };
}
