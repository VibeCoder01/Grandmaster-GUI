
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
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

type AnimatedPiece = Piece & {
    from: Square;
    to: Square;
};

export default function Chessboard({ board, onMove, turn, isGameOver, isViewingHistory, lastMove, fen, visualizedVariation, isThinking, isPondering }: ChessboardProps) {
  const [draggedPiece, setDraggedPiece] = useState<Piece | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  const [animatedPiece, setAnimatedPiece] = useState<AnimatedPiece | null>(null);
  const [animatedStyle, setAnimatedStyle] = useState<React.CSSProperties>({});
  const [squareSize, setSquareSize] = useState(64);
  const boardRef = useRef<HTMLDivElement>(null);

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
      square: lastMove.from, // required by Piece type
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
    setSelectedSquare(null); // Clear click selection

    const game = new Chess(fen);
    const moves = game.moves({ square: piece.square, verbose: true });
    setLegalMoves(moves.map(m => m.to));
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
    setLegalMoves([]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toSquare: Square) => {
    e.preventDefault();
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
    setLegalMoves([]); // Clear highlights immediately on drop.
    setSelectedSquare(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleSquareClick = (square: Square) => {
    if (isGameOver || isViewingHistory || draggedPiece) return;

    const game = new Chess(fen);
    
    // If a square is already selected (this is the second click)
    if (selectedSquare) {
        // If we click the same square again, deselect it
        if (square === selectedSquare) {
            setSelectedSquare(null);
            setLegalMoves([]);
            return;
        }

        // Check if the move is legal
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
            // The move is not legal. Let's see if we're clicking another of our own pieces.
            const pieceOnClickedSquare = game.get(square);
            if (pieceOnClickedSquare && pieceOnClickedSquare.color === turn) {
                // It's another of our pieces, so we select it instead.
                setSelectedSquare(square);
                const newMoves = game.moves({ square: square, verbose: true });
                setLegalMoves(newMoves.map(m => m.to));
            } else {
                // Invalid move, so deselect everything.
                setSelectedSquare(null);
                setLegalMoves([]);
            }
        }
    } else { // This is the first click
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
          // A cool, deep blue tint for pondering.
          style.filter = 'sepia(80%) hue-rotate(180deg) saturate(500%) brightness(0.7)';
      } else if (isThinking) {
          // A warm, intense red tint for thinking.
          style.filter = 'sepia(80%) hue-rotate(330deg) saturate(600%) brightness(0.8)';
      }
      
      return style;
  };

  return (
    <div
      ref={boardRef}
      className="grid grid-cols-8 grid-rows-8 border-4 border-card shadow-2xl rounded-lg aspect-square relative"
      style={{ width: 'clamp(320px, 90vmin, 512px)', height: 'clamp(320px, 90vmin, 512px)' }}
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

          return (
            <div
              key={square}
              onClick={() => handleSquareClick(square)}
              onDrop={(e) => handleDrop(e, square)}
              onDragOver={handleDragOver}
              className={cn(
                'w-full h-full flex items-center justify-center relative transition-colors duration-200 cursor-pointer',
                isLight ? 'bg-secondary' : 'bg-primary',
                draggedPiece && 'transition-none',
                isSelectedSquare && 'bg-accent/40'
              )}
            >
              {isLegalMove && (
                <div className="absolute w-full h-full flex items-center justify-center pointer-events-none">
                  {!piece && <div className="w-1/3 h-1/3 bg-accent/50 rounded-full" />}
                  {piece && <div className="absolute inset-1 border-4 border-accent/50 rounded-full" />}
                </div>
              )}
              {isFromSquare && !selectedSquare && (
                <div className="absolute w-1/3 h-1/3 bg-accent/50 rounded-full pointer-events-none" />
              )}
              {isToSquare && !selectedSquare && (
                <div className="absolute inset-1 border-4 border-accent/50 rounded-full pointer-events-none" />
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
