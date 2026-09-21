import { MoveFlags } from "./Types";
import type { Move, Position } from "./Types";


export function makeMove(position: Position, move: Move): Position {
  const newBoard = [...position.board];
  
  newBoard[move.to] = move.promotion ? { type: move.promotion, color: move.piece.color } : move.piece;
  newBoard[move.from] = null;

  let enPassantSquare: number | null = null;
  let castlingRights = position.castlingRights;

  // Handle special moves
  if (move.flags & MoveFlags.EN_PASSANT) {
    const captureDir = move.piece.color === 'white' ? 1 : -1;
    newBoard[move.to + 8 * captureDir] = null; // Remove the captured pawn
  } else if (move.flags & MoveFlags.KING_CASTLE) {
    if (move.piece.color === 'white') {
      newBoard[61] = newBoard[63];
      newBoard[63] = null;
    } else {
      newBoard[5] = newBoard[7];
      newBoard[7] = null;
    }
  } else if (move.flags & MoveFlags.QUEEN_CASTLE) {
    if (move.piece.color === 'white') {
      newBoard[59] = newBoard[56];
      newBoard[56] = null;
    } else {
      newBoard[3] = newBoard[0];
      newBoard[0] = null;
    }
  } else if (move.flags & MoveFlags.DOUBLE_PAWN) {
    const dir = move.piece.color === 'white' ? 1 : -1;
    enPassantSquare = move.to + 8 * dir;
  }

  // Update castling rights
  if (move.piece.type === 'king') {
    if (move.piece.color === 'white') castlingRights &= ~3; // Remove K and Q
    else castlingRights &= ~12; // Remove k and q
  } else if (move.piece.type === 'rook') {
    if (move.from === 63) castlingRights &= ~1;
    else if (move.from === 56) castlingRights &= ~2;
    else if (move.from === 7) castlingRights &= ~4;
    else if (move.from === 0) castlingRights &= ~8;
  }

  // If a rook is captured, remove its castling right
  if (move.to === 63) castlingRights &= ~1;
  else if (move.to === 56) castlingRights &= ~2;
  else if (move.to === 7) castlingRights &= ~4;
  else if (move.to === 0) castlingRights &= ~8;

  let halfmoveClock = position.halfmoveClock + 1;
  if (move.piece.type === 'pawn' || (move.flags & MoveFlags.CAPTURE)) {
    halfmoveClock = 0;
  }

  let fullmoveNumber = position.fullmoveNumber;
  if (position.sideToMove === 'black') {
    fullmoveNumber++;
  }

  return {
    board: newBoard,
    sideToMove: position.sideToMove === 'white' ? 'black' : 'white',
    castlingRights,
    enPassantSquare,
    halfmoveClock,
    fullmoveNumber
  };
}
