import { generateLegalMoves } from "./LegalMoveGenerator";
import { makeMove } from "./Rules";
import type {  Position  } from "./Types";

export function perft(position: Position, depth: number): number {
  if (depth === 0) return 1;

  const moves = generateLegalMoves(position);
  if (depth === 1) return moves.length;

  let nodes = 0;
  for (const move of moves) {
    const nextPosition = makeMove(position, move);
    nodes += perft(nextPosition, depth - 1);
  }
  return nodes;
}
