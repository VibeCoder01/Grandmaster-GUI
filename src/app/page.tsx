
"use client";

import Chessboard from "@/components/Chessboard";
import SidePanel from "@/components/SidePanel";
import { useChessGame } from "@/hooks/useChessGame";
import { useEffect, useState, useRef, useCallback } from "react";
import { Chess, type Move } from "chess.js";

export default function GrandmasterGuiPage() {
  const [timeControl, setTimeControl] = useState(600);
  const {
    gameState,
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
    loadGame,
  } = useChessGame(timeControl);

  const [depth, setDepth] = useState(2);
  const [isThinking, setIsThinking] = useState(false);
  const [isPondering, setIsPondering] = useState(false);
  const [bestVariation, setBestVariation] = useState<Move[] | null>(null);
  const [exploredVariation, setExploredVariation] = useState<Move[] | null>(null);
  const [isPonderingEnabled, setIsPonderingEnabled] = useState(true);
  const [isPonderingAnimationEnabled, setIsPonderingAnimationEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLegalMoveDots, setShowLegalMoveDots] = useState(false);
  const [showLastMove, setShowLastMove] = useState(true);

  const [scores, setScores] = useState({ human: 0, engine: 0 });
  const [humanPlayerName, setHumanPlayerName] = useState('Human');


  useEffect(() => {
      const savedScores = localStorage.getItem('chessScores');
      if (savedScores) {
          setScores(JSON.parse(savedScores));
      }
      const savedName = localStorage.getItem('chessPlayerName');
      if (savedName) {
          setHumanPlayerName(savedName);
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('chessScores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
      localStorage.setItem('chessPlayerName', humanPlayerName);
  }, [humanPlayerName]);
  
  useEffect(() => {
    if (isGameOver && !isViewingHistory) {
      // isViewingHistory check prevents score change when browsing old games
      if (status.includes('White wins')) {
        setScores(s => ({ ...s, human: s.human + 1 }));
      } else if (status.includes('Black wins')) {
        setScores(s => ({ ...s, engine: s.engine + 1 }));
      }
    }
  }, [isGameOver, status, isViewingHistory]);

  const workerRef = useRef<Worker | null>(null);
  const nextRequestId = useRef(0);
  const pendingRequests = useRef(new Map<number, { resolve: (value: string | null) => void, options: { isPonder: boolean } }>());
  const currentSearchId = useRef<number | null>(null);
  const searchFenMapRef = useRef(new Map<number, string>());
  const ponderCache = useRef(new Map<string, string | null>());

  const handleResetGame = useCallback(() => {
    resetGame(timeControl);
  }, [resetGame, timeControl]);
  
  const handleSaveGame = () => {
    const dataToSave = {
        gameState,
        scores,
        humanPlayerName,
        timeControl,
    };
    const dataStr = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `grandmaster-gui-game-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadGame = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text !== 'string') return;
              const loadedData = JSON.parse(text);

              if (loadedData.gameState && loadedData.scores && loadedData.humanPlayerName && loadedData.timeControl) {
                  setScores(loadedData.scores);
                  setHumanPlayerName(loadedData.humanPlayerName);
                  setTimeControl(loadedData.timeControl);
                  loadGame(loadedData.gameState);
              } else {
                  console.error("Invalid game file format");
                  // Optionally: show a toast notification
              }
          } catch (error) {
              console.error("Error loading game:", error);
              // Optionally: show a toast notification
          }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input to allow loading the same file again
  };


  useEffect(() => {
    const worker = new Worker(new URL('../lib/engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{id: number, move?: string | null, variation?: string[], type: string, progress?: number}>) => {
        const { id, move, variation, type, progress: newProgress } = e.data;
        
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
                    setBestVariation(moveObjects);
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
                resolve(move ?? null);
                pendingRequests.current.delete(id);
            }
            searchFenMapRef.current.delete(id);

            if (!isPonder && id === currentSearchId.current) {
                currentSearchId.current = null;
            } else if (isPonder) {
                if (isPonderingAnimationEnabled) {
                    setExploredVariation(null);
                }
                 if (isPondering) {
                   // Keep best variation during pondering animation
                 } else {
                    setBestVariation(null);
                 }
            }
        }
    };
    
    return () => {
        worker.terminate();
        currentSearchId.current = null;
    }
  }, [isPonderingAnimationEnabled, isPondering]);

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

    worker.postMessage({ type: 'start', id, fen, depth, isPonder: options.isPonder, isPonderingAnimationEnabled });

    return promise;
  }, [isPonderingAnimationEnabled]);

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
          setBestVariation(null);
          const bestMove = await requestBestMove(fen, depth, { isPonder: false });
          if (currentSearchId.current === null && bestMove) { // Ensure search wasn't cancelled
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
        setBestVariation(null);
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
      setExploredVariation(null);
      setBestVariation(null);
    };
  }, [turn, fen, isGameOver, isViewingHistory, depth, requestBestMove, isPonderingEnabled]);

  const lastMove = moveHistoryIndex > 0 && history.length >= moveHistoryIndex ? history[moveHistoryIndex - 1] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center p-4 lg:p-8 bg-background gap-8 flex-col lg:flex-row">
      <div className="flex flex-col gap-4 items-center">
        <div className="text-center">
            <h1 className="text-2xl font-bold">{humanPlayerName} vs. Engine</h1>
            <p className="text-xl font-mono">{scores.human} - {scores.engine}</p>
        </div>
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
        showLegalMoveDots={showLegalMoveDots}
        onShowLegalMoveDotsChange={setShowLegalMoveDots}
        showLastMove={showLastMove}
        onShowLastMoveChange={setShowLastMove}
        humanPlayerName={humanPlayerName}
        onPlayerNameChange={setHumanPlayerName}
        onSaveGame={handleSaveGame}
        onLoadGame={handleLoadGame}
      />
    </main>
  );
}
