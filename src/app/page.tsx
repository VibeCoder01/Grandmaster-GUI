
"use client";

import Chessboard from "@/components/Chessboard";
import SidePanel from "@/components/SidePanel";
import { useChessGame } from "@/hooks/useChessGame";
import { useEffect, useState, useRef, useCallback } from "react";
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
  const [isThinking, setIsThinking] = useState(false);
  const [consideredMove, setConsideredMove] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const nextRequestId = useRef(0);
  const pendingRequests = useRef(new Map<number, (value: string | null) => void>());
  const ponderResult = useRef<{ fen: string, move: string } | null>(null);

  const lastMove = moveHistoryIndex > 0 && history.length >= moveHistoryIndex ? history[moveHistoryIndex - 1] : undefined;

  useEffect(() => {
    const worker = new Worker(new URL('../lib/engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{id: number, move: string | null, type: 'interim' | 'final'}>) => {
        const { id, move, type } = e.data;
        if (type === 'interim') {
            setConsideredMove(move);
        } else if (type === 'final') {
            const resolve = pendingRequests.current.get(id);
            if (resolve) {
                resolve(move);
                pendingRequests.current.delete(id);
            }
            setConsideredMove(null);
        }
    };
    
    return () => {
        worker.terminate();
    }
  }, []);

  const requestBestMove = useCallback((fen: string, depth: number): Promise<string | null> => {
    const worker = workerRef.current;
    if (!worker) {
        console.error("Engine worker not available.");
        return Promise.resolve(null);
    }
    
    setConsideredMove(null); 

    const id = nextRequestId.current++;
    const promise = new Promise<string | null>((resolve) => {
        pendingRequests.current.set(id, resolve);
    });

    worker.postMessage({ id, fen, depth });

    return promise;
  }, []);


  useEffect(() => {
    // Effect to make the engine's move
    if (turn === 'b' && !isGameOver && !isViewingHistory) {
      const makeEngineMove = async () => {
        setIsThinking(true);
        // Check for a ponder hit
        if (ponderResult.current && ponderResult.current.fen === fen) {
          const move = ponderResult.current.move;
          ponderResult.current = null; // Clear the ponder cache
          makeMove(move);
          setIsThinking(false);
          return;
        }
        
        // Ponder miss, calculate from scratch
        const bestMove = await requestBestMove(fen, depth);
        if (bestMove) {
          makeMove(bestMove);
        }
        setIsThinking(false);
      };
      makeEngineMove();
    } else if (turn === 'w') {
      setIsThinking(false);
      setConsideredMove(null);
    }
  }, [turn, isGameOver, fen, makeMove, isViewingHistory, depth, requestBestMove]);

  useEffect(() => {
    // Effect to handle pondering on the user's turn
    if (turn === 'w' && !isGameOver && !isViewingHistory) {
      const ponder = async () => {
        setIsPondering(true);
        // 1. Predict human's best move with a shallow search
        const predictedHumanMove = await requestBestMove(fen, 1);
        if (!predictedHumanMove) {
          setIsPondering(false);
          return;
        }

        // If the user has already moved while we were predicting, stop.
        if (turn !== 'w') {
          setIsPondering(false);
          setConsideredMove(null);
          return;
        }

        // 2. Create the board state after that predicted move.
        const game = new Chess(fen);
        game.move(predictedHumanMove);
        const futureFen = game.fen();

        // 3. Pre-calculate the engine's response to that future state.
        const engineResponse = await requestBestMove(futureFen, depth);

        // If the user has moved while we were calculating, the result is stale.
        if (turn !== 'w') {
          setIsPondering(false);
          setConsideredMove(null);
          return;
        }

        if (engineResponse) {
          // Cache the result
          ponderResult.current = { fen: futureFen, move: engineResponse };
        }
        setIsPondering(false);
        setConsideredMove(null);
      };
      
      // Start pondering in the background
      ponder();
    } else {
        // Clear ponder result if it's not the user's turn
        ponderResult.current = null;
        setIsPondering(false);
        setConsideredMove(null);
    }
  }, [turn, fen, isGameOver, isViewingHistory, depth, requestBestMove]);

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
        isThinking={isThinking}
        consideredMove={consideredMove}
        requestBestMove={requestBestMove}
      />
    </main>
  );
}
