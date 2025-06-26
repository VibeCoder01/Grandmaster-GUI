
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
  const [dizzyVariation, setDizzyVariation] = useState<Move[] | null>(null);
  const [isPonderingEnabled, setIsPonderingEnabled] = useState(true);
  const [isPonderingAnimationEnabled, setIsPonderingAnimationEnabled] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const nextRequestId = useRef(0);
  const pendingRequests = useRef(new Map<number, (value: string | null) => void>());
  const currentSearchId = useRef<number | null>(null);
  const dizzyIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchFenMapRef = useRef(new Map<number, string>());

  const fenRef = useRef(fen);

  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  useEffect(() => {
    const worker = new Worker(new URL('../lib/engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{id: number, move?: string | null, variation?: string[], type: 'interim' | 'final'}>) => {
        const { id, move, variation, type } = e.data;
        
        if (id !== currentSearchId.current) {
            return;
        }

        if (type === 'interim') {
            if (variation && variation.length > 0) {
                const searchFen = searchFenMapRef.current.get(id);
                if (!searchFen) return;

                const tempGame = new Chess(searchFen);
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
                    setBestVariation(moveObjects);
                }
            }
        } else if (type === 'final') {
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
    const isAnimating = (isThinking || isPondering) && isPonderingAnimationEnabled;

    if (isAnimating) {
        if (dizzyIntervalRef.current) {
            clearInterval(dizzyIntervalRef.current);
        }
        dizzyIntervalRef.current = setInterval(() => {
            const tempGame = new Chess(fenRef.current);
            const moves = tempGame.moves({ verbose: true });
            if (moves.length === 0) {
                setDizzyVariation(null);
                return;
            }
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            
            try {
                tempGame.move(randomMove.san);
                const responses = tempGame.moves({ verbose: true });
                if (responses.length > 0) {
                    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                    setDizzyVariation([randomMove, randomResponse]);
                } else {
                    setDizzyVariation([randomMove]);
                }
            } catch (e) {
                setDizzyVariation([randomMove]);
            }
        }, 300);

    } else {
        if (dizzyIntervalRef.current) {
            clearInterval(dizzyIntervalRef.current);
            dizzyIntervalRef.current = null;
        }
        setDizzyVariation(null);
    }

    return () => {
        if (dizzyIntervalRef.current) {
            clearInterval(dizzyIntervalRef.current);
        }
    }
  }, [isThinking, isPondering, isPonderingAnimationEnabled]);


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
        visualizedVariation={dizzyVariation}
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
