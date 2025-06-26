
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
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

type AnimatedPiece = Piece & {
    from: Square;
    to: Square;
};

export default function Chessboard({ board, onMove, turn, isGameOver, isViewingHistory, lastMove, fen }: ChessboardProps) {
  const [draggedPiece, setDraggedPiece] = useState<Piece | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

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
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
          
          const isFromSquare = !animatedPiece && lastMove?.from === square;
          const isToSquare = !animatedPiece && lastMove?.to === square;

          const isLegalMove = legalMoves.includes(square);
          
          const isAnimatingFrom = animatedPiece?.from === square;
          const isAnimatingTo = animatedPiece?.to === square;
          const isPieceHiddenForAnimation = isAnimatingFrom || isAnimatingTo;

          return (
            <div
              key={square}
              onDrop={(e) => handleDrop(e, square)}
              onDragOver={handleDragOver}
              className={cn(
                'w-full h-full flex items-center justify-center relative transition-colors duration-200',
                isLight ? 'bg-secondary' : 'bg-primary',
                draggedPiece && 'transition-none'
              )}
            >
              {isLegalMove && (
                <div className="absolute w-full h-full flex items-center justify-center">
                  {!piece && <div className="w-1/3 h-1/3 bg-accent/50 rounded-full" />}
                  {piece && <div className="absolute inset-1 border-4 border-accent/50 rounded-full" />}
                </div>
              )}
              {isFromSquare && (
                <div className="absolute w-1/3 h-1/3 bg-accent/50 rounded-full" />
              )}
              {isToSquare && (
                <div className="absolute inset-1 border-4 border-accent/50 rounded-full" />
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
