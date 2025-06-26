"use client";

import type { FC } from 'react';
import type { Piece as PieceType } from '@/types';
import type { PieceSymbol } from 'chess.js';

const pieceSVGs: Record<PieceSymbol, string> = {
    p: `<path d="M22.5 35.5c-2 0-3.5-1.5-3.5-3.5 0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5-1.5 3.5-3.5 3.5zm0-4.5c-.53 0-1 .47-1 1s.47 1 1 1 1-.47 1-1-.47-1-1-1zm0-17.5s2 1.5 2 3.5c0 2-2 5.5-2 5.5s-2-3.5-2-5.5c0-2 2-3.5 2-3.5z" />`,
    n: `<path d="m22 10c1.5 0 3 1.5 3 3.5 0 1.5-1 2-1 3.5s1.5 2.5 1.5 2.5c0 3.5-2.5 5-2.5 5h-1.5c0 3 2.5 4.5 2.5 4.5s-2 1.5-2.5 1.5-2.5-1-2.5-1l-1.5-1.5-1 1.5-1.5.5-1-2-1-1.5 1-1 1-1-1-1-1-1 1-1 1-1-1-1-1-1 1-1 1-1c0-1.5 0-3.5 0-3.5s1.5-1.5 3-1.5z" />`,
    b: `<path d="m22.5 9c-1.5 0-3 1.5-3 3.5s1 2 1 3.5-1.5 2.5-1.5 2.5-2.5 2.5-4 5s3 2.5 3 2.5-1 1.5-1 1.5 2.5 2.5 2.5 2.5v1.5s3.5 2.5 3.5 2.5v-1.5s2.5-2.5 2.5-2.5-1-1.5-1-1.5 3-2.5 3-2.5-1.5-2.5-4-5c0 0-1.5-1-1.5-2.5s1-2 1-3.5-1.5-3.5-3-3.5z" />`,
    r: `<path d="m14 12h17l-2 2h-13zm0 22h17l-2-2h-13zm2-22h13v22h-13z" />`,
    q: `<path d="m12.5 13.5c2.5-2.5 4.5-5 10-5s7.5 2.5 10 5c-2.5 2.5-4.5 5-10 5s-7.5-2.5-10-5zm9 5c2.5 0 4-.5 4-2s-1.5-2-4-2-4 .5-4 2 1.5 2 4 2zm1 .5h-1c-.5.5-1.5 2-1.5 2l1 1.5 1.5-1 1.5 1 1-1.5c0 0-1-1.5-1.5-2zm-1 1.5v11.5" />`,
    k: `<path d="m22.5 7.5v5m-2.5-2.5h5m-2.5 2.5c2.5 0 4.5 2 4.5 5s-2 5-4.5 5-4.5-2-4.5-5 2-5 4.5-5zm0 10c2.5 0 4.5 2 4.5 5v6h-9v-6c0-3 2-5 4.5-5z" />`
};

const PieceComponent: FC<{
  piece: PieceType;
  size: number;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, piece: PieceType) => void;
}> = ({ piece, size, onDragStart }) => {
  const SvgIcon = () => {
    const fill = piece.color === 'w' ? 'hsl(var(--card-foreground))' : 'hsl(var(--primary))';
    const stroke = piece.color === 'b' ? 'hsl(var(--card-foreground))' : 'hsl(var(--primary))';

    return (
      <svg
        version="1.1"
        width={size}
        height={size}
        viewBox="0 0 45 45"
        className="drop-shadow-md"
      >
        <g 
          fill={fill} 
          fillRule="evenodd" 
          stroke={stroke}
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: pieceSVGs[piece.type.toLowerCase() as PieceSymbol] }}
        />
      </svg>
    );
  };

  return (
    <div
      draggable="true"
      onDragStart={(e) => onDragStart(e, piece)}
      className="flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing"
    >
      <SvgIcon />
    </div>
  );
};

export default PieceComponent;
