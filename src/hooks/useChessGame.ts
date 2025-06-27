
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
  forcedStatus?: string;
};

type Action =
  | { type: 'MOVE'; move: string | { from: Square; to: Square; promotion?: string } }
  | { type: 'SET_HISTORY_INDEX'; index: number }
  | { type: 'RESET'; timeControl: number }
  | { type: 'TICK' }
  | { type: 'FORCE_END'; status: string };

function getStatus(game: Chess): string {
  if (game.isCheckmate()) return `Checkmate - ${game.turn() === 'w' ? 'Black' : 'White'} wins`;

  // Handle specific draw conditions first for clearer messaging.
  if (game.isStalemate()) return 'Draw by Stalemate';
  if (game.isThreefoldRepetition()) return 'Draw by Threefold Repetition';
  if (game.isInsufficientMaterial()) return 'Draw by Insufficient Material';
  
  // chess.js's isDraw() will be true for the above conditions, but also for the 50-move rule.
  // By placing this check last, we can infer it's the 50-move rule if the others haven't been met.
  if (game.isDraw()) return 'Draw by 50-move Rule';

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
        forcedStatus: undefined,
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
    case 'FORCE_END':
      return {
        ...state,
        isGameOver: true,
        forcedStatus: action.status,
      };
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
  
  const forceEndGame = useCallback((status: string) => {
    dispatch({ type: 'FORCE_END', status });
  }, []);

  const game = useMemo(() => new Chess(state.fen), [state.fen]);

  const status = useMemo(() => {
    if (state.forcedStatus) return state.forcedStatus;
    if (state.whiteTime <= 0) return 'Black wins on time';
    if (state.blackTime <= 0) return 'White wins on time';
    return getStatus(game);
  }, [state.whiteTime, state.blackTime, game, state.forcedStatus]);

  const lastMove = useMemo(() => {
    if (state.moveHistoryIndex > 0) {
      return state.history[state.moveHistoryIndex - 1];
    }
    return undefined;
  }, [state.history, state.moveHistoryIndex]);

  return {
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
    makeMove,
    resetGame,
    setMoveHistoryIndex,
    forceEndGame,
  };
}
