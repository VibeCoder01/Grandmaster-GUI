
"use client";

import Chessboard from "@/components/Chessboard";
import SidePanel from "@/components/SidePanel";
import { useChessGame } from "@/hooks/useChessGame";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Chess, type Move } from "chess.js";

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
  const [isThinking, setIsThinking] = useState(false);
  const [isPondering, setIsPondering] = useState(false);
  const [consideredMove, setConsideredMove] = useState<string | null>(null);
  const [visualizedVariation, setVisualizedVariation] = useState<Move[] | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const nextRequestId = useRef(0);
  const pendingRequests = useRef(new Map<number, (value: string | null) => void>());

  const lastMove = moveHistoryIndex > 0 && history.length >= moveHistoryIndex ? history[moveHistoryIndex - 1] : undefined;

  useEffect(() => {
    const worker = new Worker(new URL('../lib/engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{id: number, move?: string | null, variation?: string[], type: 'interim' | 'final'}>) => {
        const { id, move, variation, type } = e.data;
        if (type === 'interim') {
            if (variation && variation.length > 0) {
                const tempGame = new Chess(fen);
                const moveObjects: Move[] = [];
                let validVariation = true;
                for (const moveStr of variation) {
                    try {
                        const moveObj = tempGame.move(moveStr, { sloppy: true });
                        if (moveObj) {
                            moveObjects.push(moveObj);
                        } else {
                            validVariation = false;
                            break;
                        }
                    } catch (err) {
                        validVariation = false;
                        break;
                    }
                }

                if (validVariation) {
                    setVisualizedVariation(moveObjects);
                    setConsideredMove(moveObjects[0]?.san || null);
                }
            }
        } else if (type === 'final') {
            const resolve = pendingRequests.current.get(id);
            if (resolve) {
                resolve(move ?? null);
                pendingRequests.current.delete(id);
            }
            setConsideredMove(null);
            setVisualizedVariation(null);
        }
    };
    
    return () => {
        worker.terminate();
    }
  }, [fen]); // fen is a dependency now

  const requestBestMove = useCallback((fen: string, depth: number): Promise<string | null> => {
    const worker = workerRef.current;
    if (!worker) {
        console.error("Engine worker not available.");
        return Promise.resolve(null);
    }
    
    setConsideredMove(null); 
    setVisualizedVariation(null);

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
      setIsPondering(false); // Stop pondering when it's our turn to think for real
      const makeEngineMove = async () => {
        setIsThinking(true);
        const bestMove = await requestBestMove(fen, depth);
        if (bestMove) {
          makeMove(bestMove);
        }
        setIsThinking(false);
      };
      makeEngineMove();
    } else {
        setIsThinking(false);
    }
  }, [turn, isGameOver, fen, makeMove, isViewingHistory, depth, requestBestMove]);

  // Effect for pondering on the user's turn
  useEffect(() => {
    if (turn === 'w' && !isGameOver && !isViewingHistory) {
      // Don't ponder immediately, give the UI a moment to settle
      const ponderTimeout = setTimeout(() => {
        if (workerRef.current && new Chess(fen).turn() === 'w') {
            setIsPondering(true);
            // Start a search for the best move. We don't care about the final
            // result, only the 'interim' messages that update the 'consideredMove' state.
            requestBestMove(fen, depth);
        }
      }, 500); // 500ms delay before pondering starts

      return () => {
        clearTimeout(ponderTimeout);
        setIsPondering(false);
      }
    } else {
      setIsPondering(false);
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
        visualizedVariation={visualizedVariation}
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
        isThinking={isThinking}
        isPondering={isPondering}
        consideredMove={consideredMove}
        requestBestMove={requestBestMove}
      />
    </main>
  );
}
