
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Chess, type Square, type Piece as PieceInfo, type Move } from 'chess.js';
import { cn } from '@/lib/utils';
import PieceComponent from '@/components/Piece';
import { type Piece } from '@/types';

interface ChessboardProps {
  board: (PieceInfo | null)[][];
  onMove: (move: { from: Square; to: Square; promotion?: 'q' }) => void;
  turn: 'w' | 'b';
  isGameOver: boolean;
  isViewingHistory: boolean;
  lastMove?: Move;
  fen: string;
  visualizedVariation?: Move[] | null;
  isThinking: boolean;
  isPondering: boolean;
  status: string;
  showLegalMoveDots: boolean;
  showLastMove: boolean;
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

type AnimatedPiece = Piece & {
    from: Square;
    to: Square;
};

export default function Chessboard({ board, onMove, turn, isGameOver, isViewingHistory, lastMove, fen, visualizedVariation, isThinking, isPondering, status, showLegalMoveDots, showLastMove }: ChessboardProps) {
  const [draggedPiece, setDraggedPiece] = useState<Piece | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [animatedPiece, setAnimatedPiece] = useState<AnimatedPiece | null>(null);
  const [animatedStyle, setAnimatedStyle] = useState<React.CSSProperties>({});
  const [squareSize, setSquareSize] = useState(64);
  const boardRef = useRef<HTMLDivElement>(null);
  const [showCheck, setShowCheck] = useState(false);
  const [attackedSquares, setAttackedSquares] = useState<Square[]>([]);

  useEffect(() => {
    if (status === 'Check' && !isGameOver) {
      setShowCheck(true);
      const timer = setTimeout(() => setShowCheck(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowCheck(false);
    }
  }, [status, isGameOver]);

  useEffect(() => {
    function updateSquareSize() {
      if (boardRef.current) {
        setSquareSize(boardRef.current.offsetWidth / 8);
      }
    }
    updateSquareSize();
    window.addEventListener('resize', updateSquareSize);
    return () => window.removeEventListener('resize', updateSquareSize);
  }, []);

  useEffect(() => {
    if (!lastMove || isViewingHistory || !lastMove.from || !lastMove.to) {
      setAnimatedPiece(null);
      return;
    }

    const pieceToAnimate: AnimatedPiece = {
      type: lastMove.piece,
      color: lastMove.color,
      square: lastMove.from,
      from: lastMove.from,
      to: lastMove.to,
    };

    setAnimatedPiece(pieceToAnimate);
    
    const fromCol = files.indexOf(pieceToAnimate.from[0]);
    const fromRow = ranks.indexOf(pieceToAnimate.from[1]);
    
    setAnimatedStyle({
        transform: `translate(${fromCol * squareSize}px, ${fromRow * squareSize}px)`,
        transition: 'transform 0s',
    });

    requestAnimationFrame(() => {
        const toCol = files.indexOf(pieceToAnimate.to[0]);
        const toRow = ranks.indexOf(pieceToAnimate.to[1]);
        setAnimatedStyle({
            transform: `translate(${toCol * squareSize}px, ${toRow * squareSize}px)`,
            transition: 'transform 0.3s ease-in-out',
        });
    });

    const timer = setTimeout(() => {
      setAnimatedPiece(null);
    }, 300);

    return () => clearTimeout(timer);
  }, [lastMove, isViewingHistory, squareSize]);


  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, piece: Piece) => {
    if (piece.color !== turn || isGameOver || isViewingHistory) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    const img = new Image();
    e.dataTransfer.setDragImage(img, 0, 0);
    setDraggedPiece(piece);
    setSelectedSquare(null);

    const game = new Chess(fen);
    const moves = game.moves({ square: piece.square, verbose: true });
    setLegalMoves(moves.map(m => m.to));
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
    setLegalMoves([]);
    setAttackedSquares([]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toSquare: Square) => {
    e.preventDefault();
    setAttackedSquares([]);
    if (!draggedPiece || !legalMoves.includes(toSquare) || draggedPiece.square === toSquare) {
      return;
    }

    const isPromotion =
      draggedPiece.type === 'p' &&
      ((draggedPiece.color === 'w' && toSquare[1] === '8') ||
        (draggedPiece.color === 'b' && toSquare[1] === '1'));

    const move: { from: Square; to: Square; promotion?: 'q' } = {
      from: draggedPiece.square,
      to: toSquare,
    };

    if (isPromotion) {
      move.promotion = 'q';
    }

    onMove(move);
    setLegalMoves([]);
    setSelectedSquare(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, toSquare: Square) => {
    e.preventDefault();
    if (!draggedPiece) {
        if (attackedSquares.length > 0) setAttackedSquares([]);
        return;
    }

    const game = new Chess(fen);
    const isLegal = game.moves({ square: draggedPiece.square, verbose: true }).some(m => m.to === toSquare);
    
    if (isLegal) {
        const tempGame = new Chess(fen);
        tempGame.move({ from: draggedPiece.square, to: toSquare, promotion: 'q' });
        
        const movesFromNewPos = tempGame.moves({ square: toSquare, verbose: true });
        const squaresUnderAttack = movesFromNewPos.filter(m => m.captured).map(m => m.to);
        
        if (attackedSquares.length !== squaresUnderAttack.length || !squaresUnderAttack.every(sq => attackedSquares.includes(sq))) {
            setAttackedSquares(squaresUnderAttack);
        }
    } else {
        if (attackedSquares.length > 0) {
            setAttackedSquares([]);
        }
    }
  };
  
  const handleSquareClick = (square: Square) => {
    if (isGameOver || isViewingHistory || draggedPiece) return;

    const game = new Chess(fen);
    
    if (selectedSquare) {
        if (square === selectedSquare) {
            setSelectedSquare(null);
            setLegalMoves([]);
            return;
        }

        const legalMove = game.moves({ square: selectedSquare, verbose: true }).find(m => m.to === square);

        if (legalMove) {
            const isPromotion =
                legalMove.piece === 'p' &&
                ((legalMove.color === 'w' && square[1] === '8') ||
                 (legalMove.color === 'b' && square[1] === '1'));
            
            const moveData: { from: Square; to: Square; promotion?: 'q' } = {
                from: selectedSquare,
                to: square,
            };
            if (isPromotion) {
                moveData.promotion = 'q';
            }
            onMove(moveData);
            setSelectedSquare(null);
            setLegalMoves([]);
        } else {
            const pieceOnClickedSquare = game.get(square);
            if (pieceOnClickedSquare && pieceOnClickedSquare.color === turn) {
                setSelectedSquare(square);
                const newMoves = game.moves({ square: square, verbose: true });
                setLegalMoves(newMoves.map(m => m.to));
            } else {
                setSelectedSquare(null);
                setLegalMoves([]);
            }
        }
    } else { 
        const piece = game.get(square);
        if (piece && piece.color === turn) {
            setSelectedSquare(square);
            const moves = game.moves({ square: square, verbose: true });
            setLegalMoves(moves.map(m => m.to));
        }
    }
  };

  const boardPieces = useMemo(() => {
    const pieces: Piece[] = [];
    board.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (piece) {
          const square = `${files[colIndex]}${ranks[rowIndex]}` as Square;
          pieces.push({ ...piece, square });
        }
      });
    });
    return pieces;
  }, [board]);
  
  const getGhostStyle = (index: number): React.CSSProperties => {
      const style: React.CSSProperties = {
          opacity: 0.4 - index * 0.08,
          transition: 'opacity 0.2s, filter 0.2s'
      };

      if (isPondering) {
          style.filter = 'sepia(80%) hue-rotate(180deg) saturate(500%) brightness(0.7)';
      } else if (isThinking) {
          style.filter = 'sepia(80%) hue-rotate(330deg) saturate(600%) brightness(0.8)';
      }
      
      return style;
  };

  const isCheckmate = isGameOver && status === 'Checkmate';

  return (
    <div
      ref={boardRef}
      className="grid grid-cols-8 grid-rows-8 border-4 border-card shadow-2xl rounded-lg aspect-square relative"
      style={{ width: 'clamp(320px, 90vmin, 512px)', height: 'clamp(320px, 90vmin, 512px)' }}
      onMouseLeave={() => setAttackedSquares([])}
    >
      {ranks.map((rank, rowIndex) =>
        files.map((file, colIndex) => {
          const square = `${file}${rank}` as Square;
          const piece = boardPieces.find(p => p.square === square);
          const isLight = (rowIndex + colIndex) % 2 !== 0;
          
          const isSelectedSquare = selectedSquare === square;
          const isFromSquare = !animatedPiece && lastMove?.from === square;
          const isToSquare = !animatedPiece && lastMove?.to === square;

          const isLegalMove = legalMoves.includes(square);
          
          const isAnimatingFrom = animatedPiece?.from === square;
          const isAnimatingTo = animatedPiece?.to === square;
          const isPieceHiddenForAnimation = isAnimatingFrom || isAnimatingTo;

          const isAttackedOnHover = attackedSquares.includes(square);

          return (
            <div
              key={square}
              onClick={() => handleSquareClick(square)}
              onDrop={(e) => handleDrop(e, square)}
              onDragOver={(e) => handleDragOver(e, square)}
              className={cn(
                'w-full h-full flex items-center justify-center relative transition-colors duration-200 cursor-pointer',
                isLight ? 'bg-secondary' : 'bg-primary',
                draggedPiece && 'transition-none',
                isSelectedSquare && 'bg-accent/40'
              )}
            >
              {isAttackedOnHover && piece && <div className="absolute inset-0.5 rounded-sm bg-destructive/60 z-10 pointer-events-none" />}
              
              {isLegalMove && showLegalMoveDots && (
                <div className="absolute w-full h-full flex items-center justify-center pointer-events-none">
                  {!piece && <div className="w-1/3 h-1/3 bg-accent/50 rounded-full" />}
                  {piece && <div className="absolute inset-1 border-4 border-accent/50 rounded-sm" />}
                </div>
              )}
              {showLastMove && isFromSquare && !selectedSquare && (
                <div className="absolute w-full h-full bg-accent/30 pointer-events-none" />
              )}
              {showLastMove && isToSquare && !selectedSquare && (
                <div className="absolute w-full h-full bg-accent/40 pointer-events-none" />
              )}
              
              {piece && (
                <div
                  style={{
                    opacity: isPieceHiddenForAnimation ? 0 : (draggedPiece?.square === square ? 0.25 : 1),
                    transition: 'opacity 0.1s ease-in-out',
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <PieceComponent
                    piece={piece}
                    size={squareSize}
                    onDragStart={(e) => handleDragStart(e, piece)}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              )}

              {visualizedVariation?.map((move, index) => {
                  if (move.to === square) {
                      const ghostPiece: Piece = {
                          type: move.piece,
                          color: move.color,
                          square: move.to,
                      };
                      return (
                          <div
                              key={`ghost-${index}`}
                              className="absolute inset-0 z-20 pointer-events-none"
                              style={getGhostStyle(index)}
                          >
                              <PieceComponent
                                  piece={ghostPiece}
                                  size={squareSize}
                                  onDragStart={(e) => e.preventDefault()}
                                  onDragEnd={() => {}}
                              />
                          </div>
                      );
                  }
                  return null;
              })}

               <span className="absolute bottom-1 left-1 text-xs font-bold text-primary-foreground/50 select-none">
                {colIndex === 0 && rank}
              </span>
              <span className="absolute top-1 right-1 text-xs font-bold text-primary-foreground/50 select-none">
                {rowIndex === 7 && file}
              </span>
            </div>
          );
        })
      )}

      {(isCheckmate || showCheck) && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none z-30">
          <div className="text-white text-4xl lg:text-6xl font-bold drop-shadow-lg animate-in fade-in zoom-in-50">
            {isCheckmate ? "Checkmate" : "Check"}
          </div>
        </div>
      )}

      {animatedPiece && squareSize > 0 && (
        <div
            className="absolute top-0 left-0 pointer-events-none z-10"
            style={{
                width: squareSize,
                height: squareSize,
                ...animatedStyle,
            }}
        >
            <PieceComponent
                piece={{type: animatedPiece.type, color: animatedPiece.color, square: animatedPiece.to}}
                size={squareSize}
                onDragStart={(e) => e.preventDefault()}
                onDragEnd={() => {}}
            />
        </div>
      )}
    </div>
  );
}
