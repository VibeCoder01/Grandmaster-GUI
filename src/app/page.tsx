
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
  const [progress, setProgress] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const nextRequestId = useRef(0);
  const pendingRequests = useRef(new Map<number, { resolve: (value: string | null) => void, options: { isPonder: boolean } }>());
  const currentSearchId = useRef<number | null>(null);
  const searchFenMapRef = useRef(new Map<number, string>());
  const ponderCache = useRef(new Map<string, string | null>());

  useEffect(() => {
    const worker = new Worker(new URL('../lib/engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{id: number, move?: string | null, variation?: string[], type: string, progress?: number}>) => {
        const { id, move, variation, type, progress } = e.data;
        
        const request = pendingRequests.current.get(id);
        if (!request) return;

        if (type === 'progress') {
            // Progress is only for the current thinking search, as pondering progress is calculated locally.
            if (!request.options.isPonder && id === currentSearchId.current) {
                setProgress(progress!);
            }
            return;
        }

        const { isPonder } = request.options;

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

        // Update UI for thinking and pondering animations
        if (type === 'exploring') {
            // Animate for both pondering and the current thinking search
            if (isPonderingAnimationEnabled && (isPonder || id === currentSearchId.current)) {
                handleVariation(variation!, false);
            }
        } else if (type === 'interim') {
            // Update best move text only for the current thinking search
            if (!isPonder && id === currentSearchId.current) {
                handleVariation(variation!, true);
            }
        }

        if (type === 'final') {
            if (!isPonder && id === currentSearchId.current) {
                setExploredVariation(null);
                setProgress(100);
            }
            
            const { resolve } = request;
            if (resolve) {
                resolve(move ?? null);
                pendingRequests.current.delete(id);
            }
            searchFenMapRef.current.delete(id);

            if (!isPonder && id === currentSearchId.current) {
                currentSearchId.current = null;
            }
        }
    };
    
    return () => {
        worker.terminate();
        currentSearchId.current = null;
    }
  }, [isPonderingAnimationEnabled]);

  const requestBestMove = useCallback((fen: string, depth: number, options: { isPonder: boolean } = { isPonder: false }): Promise<string | null> => {
    const worker = workerRef.current;
    if (!worker) {
        return Promise.resolve(null);
    }
    
    const id = nextRequestId.current++;
    searchFenMapRef.current.set(id, fen);

    // If it's a "thinking" request, set it as the current one and cancel any previous "thinking" request
    if (!options.isPonder) {
      setBestVariation(null);
      setExploredVariation(null);
      
      if (currentSearchId.current !== null && pendingRequests.current.has(currentSearchId.current)) {
          const oldRequest = pendingRequests.current.get(currentSearchId.current)!;
          oldRequest.resolve(null); // Resolve promise of old request to unblock it
          pendingRequests.current.delete(currentSearchId.current);
      }
      currentSearchId.current = id;
    }

    const promise = new Promise<string | null>((resolve) => {
        pendingRequests.current.set(id, { resolve, options });
    });

    worker.postMessage({ id, fen, depth });

    return promise;
  }, []);


  // This useEffect handles the engine's move (`turn === 'b'`)
  useEffect(() => {
    if (turn === 'b' && !isGameOver && !isViewingHistory) {
      const cachedMove = ponderCache.current.get(fen);
      
      if (isPonderingEnabled && cachedMove) {
          // Move instantly using the cached response
          makeMove(cachedMove);
      } else {
        // Fallback to "thinking" if no cached move is available
        setIsPondering(false); // Ensure pondering UI is off
        const makeEngineMove = async () => {
          setIsThinking(true);
          setProgress(0);
          const bestMove = await requestBestMove(fen, depth, { isPonder: false });
          // Only make the move if the search wasn't cancelled in the meantime
          if (currentSearchId.current === null && bestMove) {
            makeMove(bestMove);
          }
          setIsThinking(false);
          setProgress(0);
        };
        makeEngineMove();
      }
    } else {
        setIsThinking(false);
    }
  }, [turn, isGameOver, fen, makeMove, isViewingHistory, depth, requestBestMove, isPonderingEnabled]);

  // This useEffect handles pondering on the user's turn (`turn === 'w'`)
  useEffect(() => {
    let isCancelled = false;

    if (isPonderingEnabled && turn === 'w' && !isGameOver && !isViewingHistory) {
      const ponder = async () => {
        // A short delay so we don't fire on every minor state change
        await new Promise(resolve => setTimeout(resolve, 200));
        if (isCancelled || new Chess(fen).turn() !== 'w') return;
        
        setIsPondering(true);
        setProgress(0);
        ponderCache.current.clear();

        const rootGame = new Chess(fen);
        const legalMoves = rootGame.moves({ verbose: true });
        let ponderJobsCompleted = 0;

        const ponderJobs = legalMoves.map(async (move) => {
            if (isCancelled) return;
            const gameForMove = new Chess(fen);
            gameForMove.move(move.san);
            const fenAfterMove = gameForMove.fen();
            
            const counterMove = await requestBestMove(fenAfterMove, depth, { isPonder: true });
            
            if (isCancelled) return;
            ponderCache.current.set(fenAfterMove, counterMove);
            
            ponderJobsCompleted++;
            if (!isCancelled) {
              setProgress(Math.round((ponderJobsCompleted / legalMoves.length) * 100));
            }
        });

        await Promise.all(ponderJobs);

        if (!isCancelled) {
          setIsPondering(false);
          setExploredVariation(null);
          setProgress(0);
        }
      };
      
      ponder();
    } else {
      setIsPondering(false);
    }

    return () => {
      isCancelled = true;
      setIsPondering(false);
      setProgress(0);
    };
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
        visualizedVariation={exploredVariation}
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
        progress={progress}
      />
    </main>
  );
}
