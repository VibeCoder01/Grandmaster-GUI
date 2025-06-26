
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
  const [isPonderingEnabled, setIsPonderingEnabled] = useState(true);
  const [isPonderingAnimationEnabled, setIsPonderingAnimationEnabled] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const nextRequestId = useRef(0);
  const pendingRequests = useRef(new Map<number, (value: string | null) => void>());

  // Refs to hold the latest state for the worker's onmessage handler
  const fenRef = useRef(fen);
  const isPonderingRef = useRef(isPondering);
  const isPonderingAnimationEnabledRef = useRef(isPonderingAnimationEnabled);

  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  useEffect(() => {
    isPonderingRef.current = isPondering;
  }, [isPondering]);
  
  useEffect(() => {
    isPonderingAnimationEnabledRef.current = isPonderingAnimationEnabled;
  }, [isPonderingAnimationEnabled]);

  useEffect(() => {
    if (!isPonderingAnimationEnabled) {
      setVisualizedVariation(null);
    }
  }, [isPonderingAnimationEnabled]);


  const lastMove = moveHistoryIndex > 0 && history.length >= moveHistoryIndex ? history[moveHistoryIndex - 1] : undefined;

  useEffect(() => {
    const worker = new Worker(new URL('../lib/engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{id: number, move?: string | null, variation?: string[], type: 'interim' | 'final'}>) => {
        const { id, move, variation, type } = e.data;
        if (type === 'interim') {
            if (variation && variation.length > 0) {
                const tempGame = new Chess(fenRef.current);
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
                    if(isPonderingAnimationEnabledRef.current) {
                      setVisualizedVariation(moveObjects);
                    }
                    setConsideredMove(moveObjects[0]?.san || null);
                }
            }
        } else if (type === 'final') {
            const resolve = pendingRequests.current.get(id);
            if (resolve) {
                resolve(move ?? null);
                pendingRequests.current.delete(id);
            }
            // Only clear visuals if the engine was NOT pondering.
            // When pondering, we want the last considered line to stay on the board until the user moves.
            if (!isPonderingRef.current) {
                setConsideredMove(null);
                setVisualizedVariation(null);
            }
        }
    };
    
    return () => {
        worker.terminate();
    }
  }, []); // Run only once on mount

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
    if (isPonderingEnabled && turn === 'w' && !isGameOver && !isViewingHistory) {
      let isCancelled = false;
      const ponderTimeout = setTimeout(() => {
        if (workerRef.current && new Chess(fen).turn() === 'w' && !isCancelled) {
          setIsPondering(true);
          // Start a search for the best move. When it completes, the engine
          // is no longer pondering, but waiting for the user's move.
          requestBestMove(fen, depth).then(() => {
            if (!isCancelled) {
              setIsPondering(false);
            }
          });
        }
      }, 500); // 500ms delay before pondering starts

      return () => {
        isCancelled = true;
        clearTimeout(ponderTimeout);
        setIsPondering(false);
      };
    } else {
      setIsPondering(false);
    }
  }, [turn, fen, isGameOver, isViewingHistory, depth, requestBestMove, isPonderingEnabled]);


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
        isThinking={isThinking}
        isPondering={isPondering}
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
        isPonderingEnabled={isPonderingEnabled}
        onPonderingEnabledChange={setIsPonderingEnabled}
        isPonderingAnimationEnabled={isPonderingAnimationEnabled}
        onPonderingAnimationEnabledChange={setIsPonderingAnimationEnabled}
      />
    </main>
  );
}
