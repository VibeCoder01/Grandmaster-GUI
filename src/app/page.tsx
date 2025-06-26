
"use client";

import Chessboard from "@/components/Chessboard";
import SidePanel from "@/components/SidePanel";
import { useChessGame } from "@/hooks/useChessGame";
import { getBestMove } from "@/lib/engine";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Chess } from "chess.js";

export default function GrandmasterGuiPage() {
  const {
    board,
    fen,
    turn,
    isGameOver,
    isViewingHistory,
    history,
    status,
    moveHistoryIndex,
    makeMove,
    resetGame,
    setMoveHistoryIndex,
  } = useChessGame();
  const { toast } = useToast();
  const [depth, setDepth] = useState(2);
  const [isPondering, setIsPondering] = useState(false);
  const ponderResult = useRef<{ fen: string, move: string } | null>(null);

  const lastMove = moveHistoryIndex > 0 && history.length >= moveHistoryIndex ? history[moveHistoryIndex - 1] : undefined;

  useEffect(() => {
    // Effect to make the engine's move
    if (turn === 'b' && !isGameOver && !isViewingHistory) {
      const makeEngineMove = async () => {
        // Check for a ponder hit
        if (ponderResult.current && ponderResult.current.fen === fen) {
          const move = ponderResult.current.move;
          ponderResult.current = null; // Clear the ponder cache
          makeMove(move);
          return;
        }
        
        // Ponder miss, calculate from scratch
        const bestMove = await getBestMove(fen, depth);
        if (bestMove) {
          makeMove(bestMove);
        }
      };
      makeEngineMove();
    }
  }, [turn, isGameOver, fen, makeMove, isViewingHistory, depth]);

  useEffect(() => {
    // Effect to handle pondering on the user's turn
    if (turn === 'w' && !isGameOver && !isViewingHistory) {
      const ponder = async () => {
        setIsPondering(true);
        // 1. Predict human's best move with a shallow search
        const predictedHumanMove = await getBestMove(fen, 1);
        if (!predictedHumanMove) {
          setIsPondering(false);
          return;
        }

        // If the user has already moved while we were predicting, stop.
        if (turn !== 'w') {
          setIsPondering(false);
          return;
        }

        // 2. Create the board state after that predicted move.
        const game = new Chess(fen);
        game.move(predictedHumanMove);
        const futureFen = game.fen();

        // 3. Pre-calculate the engine's response to that future state.
        const engineResponse = await getBestMove(futureFen, depth);

        // If the user has moved while we were calculating, the result is stale.
        if (turn !== 'w') {
          setIsPondering(false);
          return;
        }

        if (engineResponse) {
          // Cache the result
          ponderResult.current = { fen: futureFen, move: engineResponse };
        }
        setIsPondering(false);
      };
      
      // Start pondering in the background
      ponder();
    } else {
        // Clear ponder result if it's not the user's turn
        ponderResult.current = null;
        setIsPondering(false);
    }
  }, [turn, fen, isGameOver, isViewingHistory, depth]);

  useEffect(() => {
    if(isGameOver) {
      toast({
        title: "Game Over",
        description: status,
      })
    }
  }, [isGameOver, status, toast]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4 lg:p-8 bg-background gap-8 flex-col lg:flex-row">
      <Chessboard
        board={board}
        onMove={makeMove}
        turn={turn}
        isGameOver={isGameOver}
        isViewingHistory={isViewingHistory}
        lastMove={lastMove}
        fen={fen}
      />
      <SidePanel
        status={status}
        turn={turn}
        history={history}
        fen={fen}
        isGameOver={isGameOver}
        isViewingHistory={isViewingHistory}
        moveHistoryIndex={moveHistoryIndex}
        resetGame={resetGame}
        setMoveHistoryIndex={setMoveHistoryIndex}
        depth={depth}
        onDepthChange={setDepth}
        isPondering={isPondering}
      />
    </main>
  );
}
