import { generateLegalMoves, isInCheck } from "./LegalMoveGenerator";
import type {  Position  } from "./Types";

export type GameStatus = 
  | { status: 'active' }
  | { status: 'checkmate', winner: 'white' | 'black' }
  | { status: 'draw', reason: 'stalemate' | 'insufficient_material' | 'fifty_move_rule' | 'threefold_repetition' };

export function getGameStatus(position: Position, positionHistory?: string[]): GameStatus {
  const legalMoves = generateLegalMoves(position);
  
  if (legalMoves.length === 0) {
    if (isInCheck(position, position.sideToMove)) {
      return { status: 'checkmate', winner: position.sideToMove === 'white' ? 'black' : 'white' };
    } else {
      return { status: 'draw', reason: 'stalemate' };
    }
  }

  if (position.halfmoveClock >= 100) {
    return { status: 'draw', reason: 'fifty_move_rule' };
  }

  if (hasInsufficientMaterial(position)) {
    return { status: 'draw', reason: 'insufficient_material' };
  }

  // To check threefold repetition, we need a history of simplified FENs (board + turn + castling + ep)
  if (positionHistory && hasThreefoldRepetition(positionHistory)) {
    return { status: 'draw', reason: 'threefold_repetition' };
  }

  return { status: 'active' };
}

function hasInsufficientMaterial(position: Position): boolean {
  let whiteKnights = 0, blackKnights = 0;
  let whiteBishops = 0, blackBishops = 0;
  let otherPieces = 0;

  for (let i = 0; i < 64; i++) {
    const piece = position.board[i];
    if (!piece || piece.type === 'king') continue;
    
    if (piece.type === 'pawn' || piece.type === 'rook' || piece.type === 'queen') {
      otherPieces++;
      break;
    }
    
    if (piece.type === 'knight') {
      if (piece.color === 'white') whiteKnights++;
      else blackKnights++;
    } else if (piece.type === 'bishop') {
      if (piece.color === 'white') whiteBishops++;
      else blackBishops++;
    }
  }

  if (otherPieces > 0) return false;

  const totalMinor = whiteKnights + blackKnights + whiteBishops + blackBishops;
  
  // K vs K
  if (totalMinor === 0) return true;
  
  // K+N vs K or K+B vs K
  if (totalMinor === 1) return true;

  // We could implement more complex checks (e.g. bishops on same color) but this covers most standard cases
  
  return false;
}

function hasThreefoldRepetition(history: string[]): boolean {
  if (history.length < 5) return false;
  
  const current = history[history.length - 1];
  let count = 0;
  
  for (const pos of history) {
    if (pos === current) {
      count++;
    }
  }
  
  return count >= 3;
}
