import type { Move } from "../chess/Types";

import { getPieceValue } from "./Evaluation";

export function orderMoves(moves: Move[]): Move[] {
  // Assign a score to each move for ordering
  const scoredMoves = moves.map(move => {
    let score = 0;

    if (move.captured) {
      // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
      // e.g. P takes Q = 900 - 100 + 1000 = 1800
      // Q takes P = 100 - 900 + 1000 = 200
      score += 1000 + getPieceValue(move.captured.type) - getPieceValue(move.piece.type);
    }

    if (move.promotion) {
      score += 800 + getPieceValue(move.promotion);
    }

    // Punish moving a valuable piece if not capturing
    if (!move.captured) {
       // A small penalty just so captures/promotions are tested first
       // Can add killer moves/history heuristics here
    }

    return { move, score };
  });

  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves.map(sm => sm.move);
}
