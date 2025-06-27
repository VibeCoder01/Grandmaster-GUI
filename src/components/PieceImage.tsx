
"use client";

import type { FC } from 'react';
import type { Color, PieceSymbol } from 'chess.js';
import Image from 'next/image';

const pieceImages: Record<Color, Record<PieceSymbol, string>> = {
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

const PieceImage: FC<{ pieceType: PieceSymbol; color: Color; size?: number; className?: string }> = ({ pieceType, color, size = 16, className }) => {
  const imageUrl = pieceImages[color][pieceType];
  const altText = `${color === 'w' ? 'White' : 'Black'} ${pieceNames[pieceType]}`;

  return (
    <Image
      src={imageUrl}
      alt={altText}
      width={size}
      height={size}
      className={className}
    />
  );
};

export default PieceImage;
