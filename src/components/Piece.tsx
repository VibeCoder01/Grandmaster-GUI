"use client";

import type { FC } from 'react';
import type { Piece as PieceType } from '@/types';
import type { PieceSymbol } from 'chess.js';
import Image from 'next/image';

const pieceImages: Record<PieceType['color'], Record<PieceSymbol, string>> = {
  w: {
    p: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png',
    n: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
    b: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',
    r: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',
    q: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png',
    k: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',
  },
  b: {
    p: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
    n: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',
    b: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',
    r: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
    q: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
    k: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png',
  },
};

const pieceNames: Record<PieceSymbol, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};


const PieceComponent: FC<{
  piece: PieceType;
  size: number;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, piece: PieceType) => void;
  onDragEnd?: () => void;
}> = ({ piece, size, onDragStart, onDragEnd }) => {
  const pieceSymbol = piece.type.toLowerCase() as PieceSymbol;
  const imageUrl = pieceImages[piece.color][pieceSymbol];
  const altText = `${piece.color === 'w' ? 'White' : 'Black'} ${pieceNames[pieceSymbol]}`;

  return (
    <div
      draggable="true"
      onDragStart={(e) => onDragStart(e, piece)}
      onDragEnd={onDragEnd}
      className="flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing"
    >
      <Image
        src={imageUrl}
        alt={altText}
        width={size}
        height={size}
        className="drop-shadow-md"
      />
    </div>
  );
};

export default PieceComponent;
