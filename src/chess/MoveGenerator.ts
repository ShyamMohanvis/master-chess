import { getFile, getRank, getSquare } from "./Board";
import { MoveFlags } from "./Types";
import type { Move, Position, PieceType, Piece } from "./Types";


const KNIGHT_OFFSETS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const BISHOP_OFFSETS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_OFFSETS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const QUEEN_OFFSETS = [...BISHOP_OFFSETS, ...ROOK_OFFSETS];
const KING_OFFSETS = [...QUEEN_OFFSETS];

export function generatePseudoLegalMoves(position: Position): Move[] {
  const moves: Move[] = [];
  const { board, sideToMove, castlingRights, enPassantSquare } = position;
  const oppColor = sideToMove === 'white' ? 'black' : 'white';

  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (!piece || piece.color !== sideToMove) continue;

    const file = getFile(i);
    const rank = getRank(i);

    if (piece.type === 'pawn') {
      const dir = sideToMove === 'white' ? -1 : 1; // white pawns go up (rank decreases), black pawns go down (rank increases)
      const startRank = sideToMove === 'white' ? 6 : 1;
      const promotionRank = sideToMove === 'white' ? 0 : 7;

      // Forward move
      const nextRank = rank + dir;
      if (nextRank >= 0 && nextRank < 8) {
        const nextSquare = getSquare(file, nextRank);
        if (!board[nextSquare]) {
          addPawnMoves(moves, i, nextSquare, piece, undefined, nextRank === promotionRank, MoveFlags.QUIET);
          
          // Double forward
          if (rank === startRank) {
            const doubleRank = rank + 2 * dir;
            const doubleSquare = getSquare(file, doubleRank);
            if (!board[doubleSquare]) {
              moves.push({ from: i, to: doubleSquare, piece, flags: MoveFlags.DOUBLE_PAWN });
            }
          }
        }
      }

      // Captures
      const captureFiles = [file - 1, file + 1];
      for (const cf of captureFiles) {
        if (cf >= 0 && cf < 8) {
          const captureSquare = getSquare(cf, nextRank);
          const targetPiece = board[captureSquare];
          
          if (targetPiece && targetPiece.color === oppColor) {
            addPawnMoves(moves, i, captureSquare, piece, targetPiece, nextRank === promotionRank, MoveFlags.CAPTURE);
          } else if (captureSquare === enPassantSquare) {
            moves.push({
              from: i,
              to: captureSquare,
              piece,
              captured: { type: 'pawn', color: oppColor },
              flags: MoveFlags.EN_PASSANT | MoveFlags.CAPTURE
            });
          }
        }
      }
    } else if (piece.type === 'knight') {
      for (const [df, dr] of KNIGHT_OFFSETS) {
        const nf = file + df;
        const nr = rank + dr;
        if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
          const nextSquare = getSquare(nf, nr);
          addStandardMove(moves, board, i, nextSquare, piece, oppColor);
        }
      }
    } else if (piece.type === 'king') {
      for (const [df, dr] of KING_OFFSETS) {
        const nf = file + df;
        const nr = rank + dr;
        if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
          const nextSquare = getSquare(nf, nr);
          addStandardMove(moves, board, i, nextSquare, piece, oppColor);
        }
      }

      // Castling
      if (sideToMove === 'white') {
        if (castlingRights & 1) { // K
          if (!board[61] && !board[62]) moves.push({ from: 60, to: 62, piece, flags: MoveFlags.KING_CASTLE });
        }
        if (castlingRights & 2) { // Q
          if (!board[59] && !board[58] && !board[57]) moves.push({ from: 60, to: 58, piece, flags: MoveFlags.QUEEN_CASTLE });
        }
      } else {
        if (castlingRights & 4) { // k
          if (!board[5] && !board[6]) moves.push({ from: 4, to: 6, piece, flags: MoveFlags.KING_CASTLE });
        }
        if (castlingRights & 8) { // q
          if (!board[3] && !board[2] && !board[1]) moves.push({ from: 4, to: 2, piece, flags: MoveFlags.QUEEN_CASTLE });
        }
      }
    } else {
      // Sliders
      let offsets: number[][] = [];
      if (piece.type === 'bishop') offsets = BISHOP_OFFSETS;
      else if (piece.type === 'rook') offsets = ROOK_OFFSETS;
      else if (piece.type === 'queen') offsets = QUEEN_OFFSETS;

      for (const [df, dr] of offsets) {
        let nf = file + df;
        let nr = rank + dr;
        while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
          const nextSquare = getSquare(nf, nr);
          const targetPiece = board[nextSquare];
          if (targetPiece) {
            if (targetPiece.color === oppColor) {
              moves.push({ from: i, to: nextSquare, piece, captured: targetPiece, flags: MoveFlags.CAPTURE });
            }
            break;
          }
          moves.push({ from: i, to: nextSquare, piece, flags: MoveFlags.QUIET });
          nf += df;
          nr += dr;
        }
      }
    }
  }

  return moves;
}

function addStandardMove(moves: Move[], board: (Piece | null)[], from: number, to: number, piece: Piece, oppColor: string) {
  const targetPiece = board[to];
  if (!targetPiece) {
    moves.push({ from, to, piece, flags: MoveFlags.QUIET });
  } else if (targetPiece.color === oppColor) {
    moves.push({ from, to, piece, captured: targetPiece, flags: MoveFlags.CAPTURE });
  }
}

function addPawnMoves(moves: Move[], from: number, to: number, piece: Piece, captured: Piece | undefined, isPromotion: boolean, baseFlag: number) {
  if (isPromotion) {
    const promoTypes: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
    for (const promo of promoTypes) {
      moves.push({
        from, to, piece, captured, promotion: promo, flags: baseFlag | MoveFlags.PROMOTION
      });
    }
  } else {
    moves.push({ from, to, piece, captured, flags: baseFlag });
  }
}
