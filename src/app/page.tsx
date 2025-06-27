
"use client";

import Chessboard from "@/components/Chessboard";
import SidePanel from "@/components/SidePanel";
import { useChessGame } from "@/hooks/useChessGame";
import { useEffect, useState, useRef, useCallback } from "react";
import { Chess, type Move } from "chess.js";
import { useToast } from "@/hooks/use-toast";

export default function GrandmasterGuiPage() {
  const [timeControl, setTimeControl] = useState(600);
  const {
    board,
    fen,
    turn,
    isGameOver,
    isViewingHistory,
    history,
    status,
    moveHistoryIndex,
    whiteTime,
    blackTime,
    makeMove,
    resetGame,
    setMoveHistoryIndex,
    forceEndGame,
  } = useChessGame(timeControl);

  const { toast } = useToast();
  const [depth, setDepth] = useState(2);
  const [isThinking, setIsThinking] = useState(false);
  const [isPondering, setIsPondering] = useState(false);
  const [isOfferingDraw, setIsOfferingDraw] = useState(false);
  const [bestVariation, setBestVariation] = useState<Move[] | null>(null);
  const [exploredVariation, setExploredVariation] = useState<Move[] | null>(null);
  const [isPonderingEnabled, setIsPonderingEnabled] = useState(true);
  const [isPonderingAnimationEnabled, setIsPonderingAnimationEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLegalMoveDots, setShowLegalMoveDots] = useState(false);
  const [showLastMove, setShowLastMove] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const nextRequestId = useRef(0);
  const pendingRequests = useRef(new Map<number, { resolve: (value: { move: string | null, score: number } | null) => void, options: { isPonder: boolean } }>());
  const currentSearchId = useRef<number | null>(null);
  const searchFenMapRef = useRef(new Map<number, string>());
  const ponderCache = useRef(new Map<string, { move: string | null, score: number } | null>());

  const handleResetGame = useCallback(() => {
    resetGame(timeControl);
    setBestVariation(null);
  }, [resetGame, timeControl]);

  useEffect(() => {
    const worker = new Worker(new URL('../lib/engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{id: number, move?: string | null, score?: number, variation?: string[], type: string, progress?: number}>) => {
        const { id, move, score, variation, type, progress: newProgress } = e.data;
        
        const request = pendingRequests.current.get(id);
        if (!request) return;

        if (type === 'progress') {
            if (id === currentSearchId.current) {
                setProgress(newProgress!);
            }
            return;
        }

        const { isPonder } = request.options;

        const handleVariation = (variationData: string[], isBest: boolean) => {
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
                    if (!isPonder) {
                        setBestVariation(moveObjects);
                    }
                 } else {
                   if (isPonderingAnimationEnabled) {
                     setExploredVariation(moveObjects);
                   }
                 }
             }
        }

        if (type === 'exploring') {
            handleVariation(variation!, false);
        } else if (type === 'interim') {
            handleVariation(variation!, true);
        }

        if (type === 'final') {
            if (!isPonder && id === currentSearchId.current) {
                setExploredVariation(null);
                setProgress(0);
            }
            
            const { resolve } = request;
            if (resolve) {
                resolve({ move: move ?? null, score: score ?? 0 });
                pendingRequests.current.delete(id);
            }
            searchFenMapRef.current.delete(id);

            if (!isPonder && id === currentSearchId.current) {
                currentSearchId.current = null;
            } else if (isPonder) {
                if (isPonderingAnimationEnabled) {
                    setExploredVariation(null);
                }
            }
        }
    };
    
    return () => {
        worker.terminate();
        currentSearchId.current = null;
    }
  }, [isPonderingAnimationEnabled]);

  const requestBestMove = useCallback((fen: string, depth: number, options: { isPonder: boolean } = { isPonder: false }): Promise<{ move: string | null; score: number } | null> => {
    const worker = workerRef.current;
    if (!worker) {
        return Promise.resolve(null);
    }
    
    const id = nextRequestId.current++;
    searchFenMapRef.current.set(id, fen);

    if (!options.isPonder) {
      setExploredVariation(null);
      
      if (currentSearchId.current !== null && pendingRequests.current.has(currentSearchId.current)) {
          const oldRequest = pendingRequests.current.get(currentSearchId.current)!;
          oldRequest.resolve(null); 
          pendingRequests.current.delete(currentSearchId.current);
      }
      currentSearchId.current = id;
    }

    const promise = new Promise<{ move: string | null; score: number } | null>((resolve) => {
        pendingRequests.current.set(id, { resolve, options });
    });

    worker.postMessage({ type: 'start', id, fen, depth, isPonder: options.isPonder, isPonderingAnimationEnabled });

    return promise;
  }, [isPonderingAnimationEnabled]);

  useEffect(() => {
    if (turn === 'b' && !isGameOver && !isViewingHistory) {
      const fenAfterPlayerMove = new Chess(fen).fen();
      const cachedResult = ponderCache.current.get(fenAfterPlayerMove);
      
      if (isPonderingEnabled && cachedResult && cachedResult.move) {
          makeMove(cachedResult.move);
      } else {
        setIsPondering(false);
        const makeEngineMove = async () => {
          setIsThinking(true);
          setProgress(0);
          const result = await requestBestMove(fen, depth, { isPonder: false });
          if (result && result.move) {
            makeMove(result.move);
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

  useEffect(() => {
    let isCancelled = false;

    if (isPonderingEnabled && turn === 'w' && !isGameOver && !isViewingHistory) {
      const ponder = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (isCancelled || new Chess(fen).turn() !== 'w') return;
        
        setIsPondering(true);
        setProgress(0);
        ponderCache.current.clear();

        const rootGame = new Chess(fen);
        const legalMoves = rootGame.moves({ verbose: true });
        
        for (const move of legalMoves) {
            if (isCancelled) break;

            const gameForMove = new Chess(fen);
            gameForMove.move(move.san);
            const fenAfterMove = gameForMove.fen();
            
            const result = await requestBestMove(fenAfterMove, depth, { isPonder: true });
            
            if (isCancelled) break;
            
            if (result) {
              ponderCache.current.set(fenAfterMove, { move: result.move, score: result.score });
            }

            const progress = Math.round(((legalMoves.indexOf(move) + 1) / legalMoves.length) * 100);
            if (!isCancelled) {
              setProgress(progress);
            }
        }

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
      setExploredVariation(null);
    };
  }, [turn, fen, isGameOver, isViewingHistory, depth, requestBestMove, isPonderingEnabled]);
  
  const handleResign = () => {
    forceEndGame("You resigned. Black wins.");
  };

  const handleOfferDraw = async () => {
    if (turn !== 'w') return;
    setIsOfferingDraw(true);
    // The engine (black) wants to minimize the score.
    // A negative score is good for black. We'll say if black's advantage
    // is less than half a pawn, it will accept a draw.
    const result = await requestBestMove(fen, depth, { isPonder: false });

    if (result && result.score >= -50) {
        forceEndGame("Draw by agreement.");
    } else {
        toast({
            title: "Draw Offer Rejected",
            description: "The engine wants to play on.",
        });
    }
    setIsOfferingDraw(false);
  };


  const lastMove = moveHistoryIndex > 0 && history.length >= moveHistoryIndex ? history[moveHistoryIndex - 1] : undefined;

  return (
    <div className="h-full w-full">
      <main className="grid h-full grid-cols-1 lg:grid-cols-[1fr_auto] p-4 lg:p-8 bg-background gap-8">
        <div className="min-w-0 flex items-center justify-center relative">
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
            status={status}
            showLegalMoveDots={showLegalMoveDots}
            showLastMove={showLastMove}
          />
        </div>
        <SidePanel
          status={status}
          turn={turn}
          history={history}
          fen={fen}
          isGameOver={isGameOver}
          isViewingHistory={isViewingHistory}
          moveHistoryIndex={moveHistoryIndex}
          resetGame={handleResetGame}
          setMoveHistoryIndex={setMoveHistoryIndex}
          onResign={handleResign}
          onOfferDraw={handleOfferDraw}
          isOfferingDraw={isOfferingDraw}
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
          whiteTime={whiteTime}
          blackTime={blackTime}
          timeControl={timeControl}
          onTimeControlChange={setTimeControl}
          showLegalMoveDots={showLegalMoveDots}
          onShowLegalMoveDotsChange={setShowLegalMoveDots}
          showLastMove={showLastMove}
          onShowLastMoveChange={setShowLastMove}
        />
      </main>
    </div>
  );
}
