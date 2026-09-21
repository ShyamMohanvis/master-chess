import { getFile, getRank, getSquare } from "../chess/Board";
import type { Position } from "../chess/Types";

const PIECE_VALUES: Record<string, number> = {
  'pawn': 100,
  'knight': 320,
  'bishop': 330,
  'rook': 500,
  'queen': 900,
  'king': 20000
};

// Simplified piece-square tables (PSTs). Positive is good for white.
// For black, we mirror the ranks.
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
 50, 50, 50, 50, 50, 50, 50, 50,
 10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_PST = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5, 10, 10,  5,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -20,-10,-10,-10,-10,-10,-10,-20
];

export function evaluate(position: Position): number {
  let score = 0;

  for (let i = 0; i < 64; i++) {
    const piece = position.board[i];
    if (!piece) continue;

    const isWhite = piece.color === 'white';
    const sign = isWhite ? 1 : -1;
    let value = PIECE_VALUES[piece.type];

    // PST lookup
    const rank = getRank(i);
    const file = getFile(i);
    // Mirror for black
    const pstIdx = isWhite ? i : getSquare(file, 7 - rank);

    let pstVal = 0;
    if (piece.type === 'pawn') pstVal = PAWN_PST[pstIdx];
    else if (piece.type === 'knight') pstVal = KNIGHT_PST[pstIdx];
    else if (piece.type === 'bishop') pstVal = BISHOP_PST[pstIdx];

    score += sign * (value + pstVal);
  }

  // Perspective: positive score is good for the side to move
  return position.sideToMove === 'white' ? score : -score;
}

export function getPieceValue(pieceType: string): number {
  return PIECE_VALUES[pieceType] || 0;
}
