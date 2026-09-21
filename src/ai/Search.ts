import { generateLegalMoves, isInCheck } from "../chess/LegalMoveGenerator";
import { generatePseudoLegalMoves } from "../chess/MoveGenerator";
import { makeMove } from "../chess/Rules";
import type {  Move, Position  } from "../chess/Types";
import { evaluate } from "./Evaluation";
import { orderMoves } from "./MoveOrdering";

let nodes = 0;

export function searchBestMove(position: Position, depth: number): { move: Move | null, score: number, nodes: number } {
  nodes = 0;
  
  const moves = generateLegalMoves(position);
  if (moves.length === 0) {
    return { move: null, score: evaluate(position), nodes };
  }

  let bestMove: Move | null = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  const orderedMoves = orderMoves(moves);

  for (const move of orderedMoves) {
    const nextPos = makeMove(position, move);
    // Negamax: score of next position from opponent's view is negated
    const score = -negamax(nextPos, depth - 1, -beta, -alpha);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    
    if (score > alpha) {
      alpha = score;
    }
  }

  return { move: bestMove, score: bestScore, nodes };
}

function negamax(position: Position, depth: number, alpha: number, beta: number): number {
  nodes++;
  
  if (depth === 0) {
    return quiescence(position, alpha, beta);
  }

  const moves = generateLegalMoves(position);
  if (moves.length === 0) {
    if (isInCheck(position, position.sideToMove)) {
      // Checkmate. Prefer faster mates by adding depth to score.
      return -100000 + depth;
    }
    // Stalemate
    return 0;
  }

  let max = -Infinity;
  const orderedMoves = orderMoves(moves);

  for (const move of orderedMoves) {
    const nextPos = makeMove(position, move);
    const score = -negamax(nextPos, depth - 1, -beta, -alpha);
    
    if (score > max) {
      max = score;
    }
    if (score > alpha) {
      alpha = score;
    }
    if (alpha >= beta) {
      break; // Alpha-beta cutoff
    }
  }

  return max;
}

function quiescence(position: Position, alpha: number, beta: number): number {
  nodes++;
  
  const standPat = evaluate(position);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  // Only consider captures and promotions in Q-search
  const pseudoMoves = generatePseudoLegalMoves(position);
  const qMoves = pseudoMoves.filter(m => m.captured || m.promotion);
  
  // We should ideally filter legal moves here, but for speed we just make move, check if king is in check
  const orderedMoves = orderMoves(qMoves);

  for (const move of orderedMoves) {
    const nextPos = makeMove(position, move);
    
    // Check if the move was illegal (king in check)
    // nextPos.sideToMove is the opponent, so we check if the side that just moved (position.sideToMove) is in check
    if (isInCheck(nextPos, position.sideToMove)) {
      continue;
    }

    const score = -quiescence(nextPos, -beta, -alpha);

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}
