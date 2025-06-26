"use client";

import type { FC } from 'react';
import type { Piece as PieceType } from '@/types';
import type { PieceSymbol } from 'chess.js';
import Image from 'next/image';

const pieceImages: Record<PieceType['color'], Record<PieceSymbol, string>> = {
  w: {
    p: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/White_pawn_condal.png',
    n: 'https://upload.wikimedia.org/wikipedia/commons/5/57/White_knight_condal.png',
    b: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/White_bishop_condal.png',
    r: 'https://upload.wikimedia.org/wikipedia/commons/5/58/White_rook_condal.png',
    q: 'https://upload.wikimedia.org/wikipedia/commons/3/33/White_queen_condal.png',
    k: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/White_king_condal.png',
  },
  b: {
    p: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Black_pawn_condal.png',
    n: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Black_knight_condal.png',
    b: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Black_bishop_condal.png',
    r: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Black_rook_condal.png',
    q: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Black_queen_condal.png',
    k: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Black_king_condal.png',
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
