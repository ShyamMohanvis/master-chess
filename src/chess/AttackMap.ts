import { getFile, getRank, getSquare } from "./Board";
import type {  Board, Color  } from "./Types";

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1]
];

const BISHOP_OFFSETS = [
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

const ROOK_OFFSETS = [
  [-1, 0], [1, 0], [0, -1], [0, 1]
];

const QUEEN_OFFSETS = [
  ...BISHOP_OFFSETS, ...ROOK_OFFSETS
];

const KING_OFFSETS = [
  ...QUEEN_OFFSETS
];

export function isSquareAttacked(board: Board, square: number, attackerColor: Color): boolean {
  const file = getFile(square);
  const rank = getRank(square);

  // Pawn attacks
  const pawnDir = attackerColor === 'white' ? 1 : -1;
  const pawnRank = rank + pawnDir;
  if (pawnRank >= 0 && pawnRank < 8) {
    if (file > 0) {
      const idx = getSquare(file - 1, pawnRank);
      const piece = board[idx];
      if (piece && piece.color === attackerColor && piece.type === 'pawn') return true;
    }
    if (file < 7) {
      const idx = getSquare(file + 1, pawnRank);
      const piece = board[idx];
      if (piece && piece.color === attackerColor && piece.type === 'pawn') return true;
    }
  }

  // Knight attacks
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const nf = file + df;
    const nr = rank + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      const idx = getSquare(nf, nr);
      const piece = board[idx];
      if (piece && piece.color === attackerColor && piece.type === 'knight') return true;
    }
  }

  // King attacks
  for (const [df, dr] of KING_OFFSETS) {
    const nf = file + df;
    const nr = rank + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      const idx = getSquare(nf, nr);
      const piece = board[idx];
      if (piece && piece.color === attackerColor && piece.type === 'king') return true;
    }
  }

  // Sliding pieces
  if (isAttackedBySlider(board, file, rank, attackerColor, BISHOP_OFFSETS, ['bishop', 'queen'])) return true;
  if (isAttackedBySlider(board, file, rank, attackerColor, ROOK_OFFSETS, ['rook', 'queen'])) return true;

  return false;
}

function isAttackedBySlider(board: Board, file: number, rank: number, attackerColor: Color, offsets: number[][], pieceTypes: string[]): boolean {
  for (const [df, dr] of offsets) {
    let nf = file + df;
    let nr = rank + dr;
    while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      const idx = getSquare(nf, nr);
      const piece = board[idx];
      if (piece) {
        if (piece.color === attackerColor && pieceTypes.includes(piece.type)) {
          return true;
        }
        break; // Blocked by any piece
      }
      nf += df;
      nr += dr;
    }
  }
  return false;
}
