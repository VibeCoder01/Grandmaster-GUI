"use client";

import Chessboard from "@/components/Chessboard";
import SidePanel from "@/components/SidePanel";
import { useChessGame } from "@/hooks/useChessGame";
import { getBestMove } from "@/lib/engine";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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

  const lastMove = moveHistoryIndex > 0 ? history[moveHistoryIndex - 1] : undefined;

  useEffect(() => {
    if (turn === 'b' && !isGameOver && !isViewingHistory) {
      const makeEngineMove = async () => {
        const bestMove = await getBestMove(fen);
        if (bestMove) {
          makeMove(bestMove);
        }
      };
      // Add a slight delay to make the engine's move feel more natural
      const timeoutId = setTimeout(makeEngineMove, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [turn, isGameOver, fen, makeMove, isViewingHistory]);

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
      />
    </main>
  );
}
