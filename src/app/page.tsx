
"use client";

import Chessboard from "@/components/Chessboard";
import SidePanel from "@/components/SidePanel";
import { useChessGame } from "@/hooks/useChessGame";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Chess, type Move } from "chess.js";

export default function GrandmasterGuiPage() {
  const [timeControl, setTimeControl] = useState(300);
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
    capturedByWhite,
    capturedByBlack,
    makeMove,
    resetGame,
    setMoveHistoryIndex,
  } = useChessGame(timeControl);

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

  const handleResetGame = useCallback(() => {
    resetGame(timeControl);
  }, [resetGame, timeControl]);

  useEffect(() => {
    const worker = new Worker(new URL('../lib/engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{id: number, move?: string | null, variation?: string[], type: string, progress?: number}>) => {
        const { id, move, variation, type, progress: newProgress } = e.data;
        
        const request = pendingRequests.current.get(id);
        if (!request) return;

        if (type === 'progress') {
            if (id === currentSearchId.current && !request.options.isPonder) {
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
                   setBestVariation(moveObjects);
                 } else {
                   if (isPonderingAnimationEnabled && (isPonder || id === currentSearchId.current)) {
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

    if (!options.isPonder) {
      setBestVariation(null);
      setExploredVariation(null);
      
      if (currentSearchId.current !== null && pendingRequests.current.has(currentSearchId.current)) {
          const oldRequest = pendingRequests.current.get(currentSearchId.current)!;
          oldRequest.resolve(null); 
          pendingRequests.current.delete(currentSearchId.current);
      }
      currentSearchId.current = id;
    }

    const promise = new Promise<string | null>((resolve) => {
        pendingRequests.current.set(id, { resolve, options });
    });

    worker.postMessage({ id, fen, depth, isPonder: options.isPonder });

    return promise;
  }, []);

  useEffect(() => {
    if (turn === 'b' && !isGameOver && !isViewingHistory) {
      const fenAfterPlayerMove = new Chess(fen).fen();
      const cachedMove = ponderCache.current.get(fenAfterPlayerMove);
      
      if (isPonderingEnabled && cachedMove) {
          makeMove(cachedMove);
      } else {
        setIsPondering(false);
        const makeEngineMove = async () => {
          setIsThinking(true);
          setProgress(0);
          const bestMove = await requestBestMove(fen, depth, { isPonder: false });
          if (currentSearchId.current === null && bestMove) {
            makeMove(bestMove);
          }
          setIsThinking(false);
          setProgress(0);
          setBestVariation(null);
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
            
            const counterMove = await requestBestMove(fenAfterMove, depth, { isPonder: true });
            
            if (isCancelled) break;
            ponderCache.current.set(fenAfterMove, counterMove);
            
            const progress = Math.round(((legalMoves.indexOf(move) + 1) / legalMoves.length) * 100);
            if (!isCancelled) {
              setProgress(progress);
            }
        }

        if (!isCancelled) {
          setIsPondering(false);
          setExploredVariation(null);
          setProgress(0);
          setBestVariation(null);
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
      setBestVariation(null);
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
        resetGame={handleResetGame}
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
        whiteTime={whiteTime}
        blackTime={blackTime}
        timeControl={timeControl}
        onTimeControlChange={setTimeControl}
        capturedByWhite={capturedByWhite}
        capturedByBlack={capturedByBlack}
      />
    </main>
  );
}
