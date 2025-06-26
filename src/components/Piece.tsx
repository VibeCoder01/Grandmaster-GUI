"use client";

import type { FC } from 'react';
import type { Piece as PieceType } from '@/types';
import type { PieceSymbol } from 'chess.js';
import Image from 'next/image';

const pieceImages: Record<PieceType['color'], Record<PieceSymbol, string>> = {
  w: {
    p: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    n: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    b: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rlt45.svg',
    q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    k: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  },
  b: {
    p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    r: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Chess_rdt45.svg',
    q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
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
}> = ({ piece, size, onDragStart }) => {
  const pieceSymbol = piece.type.toLowerCase() as PieceSymbol;
  const imageUrl = pieceImages[piece.color][pieceSymbol];
  const altText = `${piece.color === 'w' ? 'White' : 'Black'} ${pieceNames[pieceSymbol]}`;

  return (
    <div
      draggable="true"
      onDragStart={(e) => onDragStart(e, piece)}
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
