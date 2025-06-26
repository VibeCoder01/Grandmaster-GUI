"use client";

import { useReducer, useCallback, useMemo } from 'react';
import { Chess, type Square, type Piece as PieceInfo, type Move } from 'chess.js';

type GameState = {
  gameInstance: Chess;
  fen: string;
  history: Move[];
  isGameOver: boolean;
  status: string;
  turn: 'w' | 'b';
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
        gameInstance: game,
        fen: game.fen(),
        history: [],
        isGameOver: false,
        status: 'In Progress',
        turn: 'w',
        moveHistoryIndex: 0,
    };
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'MOVE': {
      // To allow making a move, we must be at the latest point in history.
      if (state.moveHistoryIndex !== state.history.length) return state;

      const gameCopy = new Chess(state.fen);
      const result = gameCopy.move(action.move);
      
      if (result === null) {
        return state; // Invalid move
      }
      
      const newHistory = gameCopy.history({ verbose: true });

      return {
        ...state,
        gameInstance: gameCopy,
        fen: gameCopy.fen(),
        history: newHistory,
        isGameOver: gameCopy.isGameOver(),
        status: getStatus(gameCopy),
        turn: gameCopy.turn(),
        moveHistoryIndex: newHistory.length,
      };
    }
    case 'SET_HISTORY_INDEX': {
      const newIndex = Math.max(0, Math.min(action.index, state.history.length));
      return {
        ...state,
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
  
  const { fen, board, turn, status } = useMemo(() => {
    // Determine the FEN for the currently viewed move history index.
    const fenToLoad = state.moveHistoryIndex > 0
      ? state.history[state.moveHistoryIndex - 1].after
      : new Chess().fen(); // Starting FEN for index 0

    const tempGame = new Chess(fenToLoad);

    return {
      fen: tempGame.fen(),
      board: tempGame.board(),
      turn: tempGame.turn(),
      status: getStatus(tempGame),
    };
  }, [state.history, state.moveHistoryIndex]);

  return {
    fen,
    board,
    turn,
    status: state.isGameOver ? getStatus(state.gameInstance) : status,
    isGameOver: state.isGameOver,
    history: state.history,
    moveHistoryIndex: state.moveHistoryIndex,
    isViewingHistory: state.moveHistoryIndex < state.history.length,
    makeMove,
    resetGame,
    setMoveHistoryIndex,
  };
}
