import { isSquareAttacked } from "./AttackMap";
import { generatePseudoLegalMoves } from "./MoveGenerator";
import { makeMove } from "./Rules";
import { MoveFlags } from "./Types";
import type { Move, Position } from "./Types";


export function generateLegalMoves(position: Position): Move[] {
  const pseudoMoves = generatePseudoLegalMoves(position);
  const legalMoves: Move[] = [];
  const color = position.sideToMove;

  for (const move of pseudoMoves) {
    const isCastling = (move.flags & MoveFlags.KING_CASTLE) || (move.flags & MoveFlags.QUEEN_CASTLE);
    
    // Castling has special rules: king cannot be in check, transit square cannot be attacked
    if (isCastling) {
      if (isInCheck(position, color)) continue;
      
      const transitSquare = (move.from + move.to) / 2;
      if (isSquareAttacked(position.board, transitSquare, color === 'white' ? 'black' : 'white')) continue;
    }

    const nextPosition = makeMove(position, move);
    if (!isInCheck(nextPosition, color)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

export function isInCheck(position: Position, color: 'white' | 'black'): boolean {
  let kingSquare = -1;
  for (let i = 0; i < 64; i++) {
    const piece = position.board[i];
    if (piece && piece.type === 'king' && piece.color === color) {
      kingSquare = i;
      break;
    }
  }

  if (kingSquare === -1) return false; // Should not happen in a valid game

  const opponentColor = color === 'white' ? 'black' : 'white';
  // We check if the king is attacked in the given position by the opponent
  // BUT note that `nextPosition` passed from generateLegalMoves has already swapped the sideToMove.
  // We are asking if `color` (the one who just moved) is in check.
  return isSquareAttacked(position.board, kingSquare, opponentColor);
}
