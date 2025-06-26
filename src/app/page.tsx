
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
  const [bestVariation, setBestVariation] = useState<Move[] | null>(null);
  const [exploredVariation, setExploredVariation] = useState<Move[] | null>(null);
  const [isPonderingEnabled, setIsPonderingEnabled] = useState(true);
  const [isPonderingAnimationEnabled, setIsPonderingAnimationEnabled] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const nextRequestId = useRef(0);
  const pendingRequests = useRef(new Map<number, (value: string | null) => void>());
  const currentSearchId = useRef<number | null>(null);
  const searchFenMapRef = useRef(new Map<number, string>());

  useEffect(() => {
    const worker = new Worker(new URL('../lib/engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{id: number, move?: string | null, variation?: string[], type: 'interim' | 'final' | 'exploring'}>) => {
        const { id, move, variation, type } = e.data;
        
        if (id !== currentSearchId.current) {
            return;
        }

        const handleVariation = (variationData: string[], isBest: boolean) => {
             if (variationData && variationData.length > 0) {
                const searchFen = searchFenMapRef.current.get(id);
                if (!searchFen) return;

                const tempGame = new Chess(searchFen);
                const moveObjects: Move[] = [];
                let validVariation = true;
                for (const moveStr of variationData) {
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
                    if (isBest) {
                      setBestVariation(moveObjects);
                    } else {
                      setExploredVariation(moveObjects);
                    }
                }
            }
        }

        if (type === 'exploring') {
          handleVariation(variation!, false);
        } else if (type === 'interim') {
          handleVariation(variation!, true);
        } else if (type === 'final') {
            setExploredVariation(null);
            const resolve = pendingRequests.current.get(id);
            if (resolve) {
                resolve(move ?? null);
                pendingRequests.current.delete(id);
            }
            searchFenMapRef.current.delete(id);
            currentSearchId.current = null;
        }
    };
    
    return () => {
        worker.terminate();
        currentSearchId.current = null;
    }
  }, []);

  const requestBestMove = useCallback((fen: string, depth: number): Promise<string | null> => {
    const worker = workerRef.current;
    if (!worker) {
        return Promise.resolve(null);
    }
    
    setBestVariation(null);
    setExploredVariation(null);
    pendingRequests.current.clear();

    const id = nextRequestId.current++;
    currentSearchId.current = id;
    searchFenMapRef.current.set(id, fen);

    const promise = new Promise<string | null>((resolve) => {
        pendingRequests.current.set(id, resolve);
    });

    worker.postMessage({ id, fen, depth });

    return promise;
  }, []);


  useEffect(() => {
    if (turn === 'b' && !isGameOver && !isViewingHistory) {
      setIsPondering(false);
      const makeEngineMove = async () => {
        setIsThinking(true);
        const bestMove = await requestBestMove(fen, depth);
        if (currentSearchId.current === null && bestMove) {
          makeMove(bestMove);
        }
        setIsThinking(false);
      };
      makeEngineMove();
    } else {
        setIsThinking(false);
    }
  }, [turn, isGameOver, fen, makeMove, isViewingHistory, depth, requestBestMove]);

  useEffect(() => {
    if (isPonderingEnabled && turn === 'w' && !isGameOver && !isViewingHistory) {
      let isCancelled = false;
      const ponderTimeout = setTimeout(() => {
        if (workerRef.current && new Chess(fen).turn() === 'w' && !isCancelled) {
          setIsPondering(true);
          requestBestMove(fen, depth).then(() => {
            if (!isCancelled) {
              setIsPondering(false);
            }
          });
        }
      }, 500);

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

  const lastMove = moveHistoryIndex > 0 && history.length >= moveHistoryIndex ? history[moveHistoryIndex - 1] : undefined;

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
        visualizedVariation={isPonderingAnimationEnabled ? exploredVariation : null}
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
        bestVariation={bestVariation}
        isPonderingEnabled={isPonderingEnabled}
        onPonderingEnabledChange={setIsPonderingEnabled}
        isPonderingAnimationEnabled={isPonderingAnimationEnabled}
        onPonderingAnimationEnabledChange={setIsPonderingAnimationEnabled}
      />
    </main>
  );
}
