import type { PieceSymbol, Square, Color } from 'chess.js';

export type Piece = {
  square: Square;
  type: PieceSymbol;
  color: Color;
};
