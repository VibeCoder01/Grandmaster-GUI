"use client";

import React, { useState, useMemo } from 'react';
import type { Square, Piece as PieceInfo, Move } from 'chess.js';
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
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function Chessboard({ board, onMove, turn, isGameOver, isViewingHistory, lastMove }: ChessboardProps) {
  const [draggedPiece, setDraggedPiece] = useState<Piece | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, piece: Piece) => {
    if (piece.color !== turn || isGameOver || isViewingHistory) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    const img = new Image();
    e.dataTransfer.setDragImage(img, 0, 0);
    setDraggedPiece(piece);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toSquare: Square) => {
    e.preventDefault();
    if (draggedPiece && draggedPiece.square !== toSquare) {
      onMove({ from: draggedPiece.square, to: toSquare, promotion: 'q' });
    }
    setDraggedPiece(null);
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

  const squareSize = 64;

  return (
    <div
      className="grid grid-cols-8 grid-rows-8 border-4 border-card shadow-2xl rounded-lg aspect-square"
      style={{ width: 'clamp(320px, 90vmin, 512px)', height: 'clamp(320px, 90vmin, 512px)' }}
    >
      {ranks.map((rank, rowIndex) =>
        files.map((file, colIndex) => {
          const square = `${file}${rank}` as Square;
          const piece = boardPieces.find(p => p.square === square);
          const isLight = (rowIndex + colIndex) % 2 !== 0;
          const isLastMoveSquare = lastMove?.from === square || lastMove?.to === square;
          const isDraggedOverSquare = draggedPiece?.square === square;

          return (
            <div
              key={square}
              onDrop={(e) => handleDrop(e, square)}
              onDragOver={handleDragOver}
              className={cn(
                'w-full h-full flex items-center justify-center relative transition-colors duration-200',
                isLight ? 'bg-foreground/5' : 'bg-primary/20',
                isLastMoveSquare && 'bg-accent/40',
                draggedPiece && 'transition-none'
              )}
            >
              {piece && (
                <div
                  style={{
                    opacity: isDraggedOverSquare ? 0.25 : 1,
                    transition: 'opacity 0.1s ease-in-out',
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <PieceComponent
                    piece={piece}
                    size={squareSize}
                    onDragStart={(e) => handleDragStart(e, piece)}
                  />
                </div>
              )}
               <span className="absolute bottom-1 left-1 text-xs font-bold text-primary/50 select-none">
                {colIndex === 0 && rank}
              </span>
              <span className="absolute top-1 right-1 text-xs font-bold text-primary/50 select-none">
                {rowIndex === 7 && file}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
