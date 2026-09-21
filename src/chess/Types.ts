export type Color = "white" | "black";

export type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";

export type Piece = {
  type: PieceType;
  color: Color;
};

// 64 length array, 0 is a8, 7 is h8, 56 is a1, 63 is h1
export type Board = (Piece | null)[];

export interface Position {
  board: Board;
  sideToMove: Color;

  // 1 = White O-O, 2 = White O-O-O, 4 = Black O-O, 8 = Black O-O-O
  castlingRights: number;
  
  // Square index of the en passant target square
  enPassantSquare: number | null;

  halfmoveClock: number;
  fullmoveNumber: number;
}

export interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  flags: number;
}

export const MoveFlags = {
  QUIET: 0,
  CAPTURE: 1,
  DOUBLE_PAWN: 2,
  EN_PASSANT: 4,
  KING_CASTLE: 8,
  QUEEN_CASTLE: 16,
  PROMOTION: 32,
};
