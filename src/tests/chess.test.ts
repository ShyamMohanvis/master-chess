import { describe, it, expect } from 'vitest';
import { createStartingPosition, parseFEN, toFEN } from '../chess/Fen';
import { generateLegalMoves, isInCheck } from '../chess/LegalMoveGenerator';
import { makeMove } from '../chess/Rules';
import { getGameStatus } from '../chess/GameStatus';
import { perft } from '../chess/Perft';
import type { Move, Position } from '../chess/Types';
import { getSquareIndex, getSquareName } from '../chess/Board';

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

/** Find a legal move from algebraic notation like "e2" -> "e4" */
function findMove(pos: Position, fromSq: string, toSq: string, promotion?: string): Move | undefined {
  const from = getSquareIndex(fromSq);
  const to = getSquareIndex(toSq);
  const moves = generateLegalMoves(pos);
  return moves.find(m => m.from === from && m.to === to && (promotion ? m.promotion === promotion : !m.promotion));
}

/** Make a sequence of moves from algebraic notation */
function playMoves(pos: Position, moves: [string, string, string?][]): Position {
  let current = pos;
  for (const [from, to, promo] of moves) {
    const move = findMove(current, from, to, promo);
    if (!move) throw new Error(`No legal move found: ${from} -> ${to}${promo ? ` (${promo})` : ''} in FEN: ${toFEN(current)}`);
    current = makeMove(current, move);
  }
  return current;
}

/** Count legal moves from a specific square */
function countMovesFrom(pos: Position, sq: string): number {
  const idx = getSquareIndex(sq);
  return generateLegalMoves(pos).filter(m => m.from === idx).length;
}

/** Get all legal target squares from a specific square */
function getTargetSquares(pos: Position, sq: string): string[] {
  const idx = getSquareIndex(sq);
  return generateLegalMoves(pos)
    .filter(m => m.from === idx)
    .map(m => getSquareName(m.to))
    .sort();
}

/* ═══════════════════════════════════════════
   1. PERFT — Engine correctness baseline
   ═══════════════════════════════════════════ */

describe('Perft — Starting position', () => {
  it('depth 1 = 20', () => {
    expect(perft(createStartingPosition(), 1)).toBe(20);
  });

  it('depth 2 = 400', () => {
    expect(perft(createStartingPosition(), 2)).toBe(400);
  });

  it('depth 3 = 8902', () => {
    expect(perft(createStartingPosition(), 3)).toBe(8902);
  });

  it('depth 4 = 197281', () => {
    expect(perft(createStartingPosition(), 4)).toBe(197281);
  });
});

/* ═══════════════════════════════════════════
   2. PAWN VALIDATION
   ═══════════════════════════════════════════ */

describe('Pawn', () => {
  it('can move one square forward', () => {
    const pos = createStartingPosition();
    const move = findMove(pos, 'e2', 'e3');
    expect(move).toBeDefined();
  });

  it('can move two squares from starting rank', () => {
    const pos = createStartingPosition();
    const move = findMove(pos, 'e2', 'e4');
    expect(move).toBeDefined();
  });

  it('cannot move two squares after having moved', () => {
    let pos = createStartingPosition();
    pos = playMoves(pos, [['e2', 'e3'], ['e7', 'e6']]);
    const move = findMove(pos, 'e3', 'e5');
    expect(move).toBeUndefined();
  });

  it('cannot move through an occupied square', () => {
    // Put a piece in front of the pawn
    const pos = parseFEN('rnbqkbnr/pppppppp/8/8/8/4P3/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    // e2 pawn is gone, but e3 has a pawn — can't double push from non-start rank anyway
    // Instead test: place a pawn at e4 and try e2-e4 with blocker
    const pos2 = parseFEN('rnbqkbnr/pppppppp/8/8/4p3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const move = findMove(pos2, 'e2', 'e4');
    expect(move).toBeUndefined();
  });

  it('can capture diagonally', () => {
    const pos = parseFEN('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
    const move = findMove(pos, 'e4', 'd5');
    expect(move).toBeDefined();
    expect(move!.captured).toBeDefined();
  });

  it('cannot capture straight ahead', () => {
    const pos = parseFEN('rnbqkbnr/pppppppp/8/8/4p3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const move = findMove(pos, 'e2', 'e3');
    // e3 is empty, should be able to move there (not a capture issue)
    // The real test: pawn blocked directly
    const pos2 = parseFEN('rnbqkbnr/pppp1ppp/8/8/8/4p3/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const move2 = findMove(pos2, 'e2', 'e3');
    expect(move2).toBeUndefined();
  });

  it('black pawn moves forward (down the board)', () => {
    let pos = createStartingPosition();
    pos = playMoves(pos, [['e2', 'e4']]); // white moves, now black's turn
    const move = findMove(pos, 'e7', 'e5');
    expect(move).toBeDefined();
  });
});

/* ═══════════════════════════════════════════
   3. EN PASSANT
   ═══════════════════════════════════════════ */

describe('En Passant', () => {
  it('white can en passant', () => {
    // Standard en passant setup: White pawn on e5, black plays d7-d5
    const pos = parseFEN('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
    const move = findMove(pos, 'e5', 'd6');
    expect(move).toBeDefined();
    expect(move!.captured).toBeDefined();
    expect(move!.captured!.type).toBe('pawn');
  });

  it('black can en passant', () => {
    const pos = parseFEN('rnbqkbnr/pppp1ppp/8/8/3Pp3/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 3');
    const move = findMove(pos, 'e4', 'd3');
    expect(move).toBeDefined();
    expect(move!.captured).toBeDefined();
  });

  it('en passant is not available on subsequent turns', () => {
    let pos = parseFEN('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
    // White plays a different move instead of en passant
    pos = playMoves(pos, [['a2', 'a3'], ['a7', 'a6']]);
    // Now try en passant — should NOT be available
    const move = findMove(pos, 'e5', 'd6');
    expect(move).toBeUndefined();
  });

  it('en passant removes the captured pawn', () => {
    const pos = parseFEN('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
    const move = findMove(pos, 'e5', 'd6')!;
    const after = makeMove(pos, move);
    // The pawn on d5 should be gone
    const d5 = getSquareIndex('d5');
    expect(after.board[d5]).toBeNull();
    // The pawn should be on d6
    const d6 = getSquareIndex('d6');
    expect(after.board[d6]).toBeDefined();
    expect(after.board[d6]!.type).toBe('pawn');
    expect(after.board[d6]!.color).toBe('white');
  });
});

/* ═══════════════════════════════════════════
   4. PROMOTION
   ═══════════════════════════════════════════ */

describe('Promotion', () => {
  it('generates promotion moves for all 4 piece types', () => {
    const pos = parseFEN('8/4P3/8/8/8/8/8/K6k w - - 0 1');
    const moves = generateLegalMoves(pos).filter(m => m.from === getSquareIndex('e7'));
    const promoMoves = moves.filter(m => m.promotion);
    expect(promoMoves.length).toBe(4);
    const types = promoMoves.map(m => m.promotion).sort();
    expect(types).toEqual(['bishop', 'knight', 'queen', 'rook']);
  });

  it('promotion to queen works correctly', () => {
    const pos = parseFEN('8/4P3/8/8/8/8/8/K6k w - - 0 1');
    const move = findMove(pos, 'e7', 'e8', 'queen')!;
    const after = makeMove(pos, move);
    const e8 = getSquareIndex('e8');
    expect(after.board[e8]!.type).toBe('queen');
    expect(after.board[e8]!.color).toBe('white');
  });

  it('promotion to knight works correctly', () => {
    const pos = parseFEN('8/4P3/8/8/8/8/8/K6k w - - 0 1');
    const move = findMove(pos, 'e7', 'e8', 'knight')!;
    const after = makeMove(pos, move);
    expect(after.board[getSquareIndex('e8')]!.type).toBe('knight');
  });

  it('black pawn promotes', () => {
    const pos = parseFEN('8/8/8/8/8/8/4p3/K6k b - - 0 1');
    const moves = generateLegalMoves(pos).filter(m => m.from === getSquareIndex('e2') && m.promotion);
    expect(moves.length).toBe(4);
  });
});

/* ═══════════════════════════════════════════
   5. KNIGHT VALIDATION
   ═══════════════════════════════════════════ */

describe('Knight', () => {
  it('has 8 possible moves from center of empty board', () => {
    const pos = parseFEN('8/8/8/8/4N3/8/8/4K2k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).toEqual(['c3', 'c5', 'd2', 'd6', 'f2', 'f6', 'g3', 'g5']);
  });

  it('can jump over pieces', () => {
    // Knight on b1 with pawns blocking — should still reach a3 and c3
    const pos = createStartingPosition();
    const targets = getTargetSquares(pos, 'b1');
    expect(targets).toContain('a3');
    expect(targets).toContain('c3');
  });

  it('cannot land on friendly piece', () => {
    const pos = createStartingPosition();
    const targets = getTargetSquares(pos, 'b1');
    expect(targets).not.toContain('d2'); // d2 is occupied by pawn
  });

  it('can capture enemy piece', () => {
    const pos = parseFEN('8/8/3p4/8/4N3/8/8/4K2k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).toContain('d6');
  });
});

/* ═══════════════════════════════════════════
   6. BISHOP VALIDATION
   ═══════════════════════════════════════════ */

describe('Bishop', () => {
  it('moves diagonally on empty board', () => {
    const pos = parseFEN('8/8/8/8/4B3/8/8/4K2k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    // All four diagonals
    expect(targets).toContain('d3');
    expect(targets).toContain('c2');
    expect(targets).toContain('b1');
    expect(targets).toContain('f5');
    expect(targets).toContain('g6');
    expect(targets).toContain('h7');
    expect(targets).toContain('d5');
    expect(targets).toContain('f3');
  });

  it('is blocked by friendly pieces', () => {
    const pos = parseFEN('8/8/8/3P4/4B3/8/8/4K2k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).not.toContain('d5'); // blocked by own pawn
    expect(targets).not.toContain('c6'); // behind blocked square
  });

  it('can capture enemy piece but stops there', () => {
    const pos = parseFEN('8/8/8/3p4/4B3/8/8/4K2k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).toContain('d5'); // can capture
    expect(targets).not.toContain('c6'); // blocked after capture
  });
});

/* ═══════════════════════════════════════════
   7. ROOK VALIDATION
   ═══════════════════════════════════════════ */

describe('Rook', () => {
  it('moves in straight lines on empty board', () => {
    const pos = parseFEN('8/8/8/8/4R3/8/8/K6k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    // Horizontal
    expect(targets).toContain('a4');
    expect(targets).toContain('h4');
    // Vertical
    expect(targets).toContain('e1');
    expect(targets).toContain('e8');
  });

  it('is blocked by pieces', () => {
    const pos = parseFEN('8/8/8/4P3/4R3/8/8/K6k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).not.toContain('e5'); // blocked by own pawn
    expect(targets).not.toContain('e6');
  });

  it('cannot move diagonally', () => {
    const pos = parseFEN('8/8/8/8/4R3/8/8/K6k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).not.toContain('d5');
    expect(targets).not.toContain('f5');
  });
});

/* ═══════════════════════════════════════════
   8. QUEEN VALIDATION
   ═══════════════════════════════════════════ */

describe('Queen', () => {
  it('moves both diagonally and in straight lines', () => {
    const pos = parseFEN('8/8/8/8/4Q3/8/8/4K2k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    // Diagonal
    expect(targets).toContain('d5');
    expect(targets).toContain('f5');
    expect(targets).toContain('d3');
    expect(targets).toContain('f3');
    // Straight
    expect(targets).toContain('e8');
    expect(targets).toContain('a4');
    expect(targets).toContain('h4');
  });
});

/* ═══════════════════════════════════════════
   9. KING VALIDATION
   ═══════════════════════════════════════════ */

describe('King', () => {
  it('moves one square in all directions', () => {
    const pos = parseFEN('8/8/8/8/4K3/8/8/7k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets.length).toBe(8);
  });

  it('cannot move onto friendly piece', () => {
    const pos = parseFEN('8/8/8/3P4/4K3/8/8/7k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).not.toContain('d5');
  });

  it('can capture enemy piece', () => {
    const pos = parseFEN('8/8/8/3p4/4K3/8/8/7k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).toContain('d5');
  });

  it('cannot move into check', () => {
    // Black rook controls the e-file
    const pos = parseFEN('4r3/8/8/8/4K3/8/8/7k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).not.toContain('e5');
    expect(targets).not.toContain('e3');
  });

  it('cannot capture a protected piece', () => {
    // Black pawn on d5 protected by pawn on e6
    const pos = parseFEN('8/8/4p3/3p4/4K3/8/8/7k w - - 0 1');
    const targets = getTargetSquares(pos, 'e4');
    expect(targets).not.toContain('d5'); // d5 pawn is protected by e6 pawn
  });
});

/* ═══════════════════════════════════════════
   10. CHECK DETECTION
   ═══════════════════════════════════════════ */

describe('Check detection', () => {
  it('detects check', () => {
    const pos = parseFEN('4k3/8/8/8/4R3/8/8/4K3 b - - 0 1');
    expect(isInCheck(pos, 'black')).toBe(true);
  });

  it('detects no check', () => {
    expect(isInCheck(createStartingPosition(), 'white')).toBe(false);
  });

  it('a move that leaves own king in check is illegal', () => {
    // White king on e1, black rook on a1, white bishop on b1
    // Moving bishop off the first rank exposes king on e1 to rook on a1
    const pos = parseFEN('8/8/8/8/8/8/7k/r1B1K3 w - - 0 1');
    const bishopMoves = generateLegalMoves(pos).filter(m => m.from === getSquareIndex('c1'));
    // Bishop can only move along the first rank (staying between rook and king)
    // c1 bishop pinned to e1 king by a1 rook — can only move to b1 or d1
    for (const m of bishopMoves) {
      // After each bishop move, king must NOT be in check
      const after = makeMove(pos, m);
      expect(isInCheck(after, 'white')).toBe(false);
    }
  });
});

/* ═══════════════════════════════════════════
   11. CHECKMATE
   ═══════════════════════════════════════════ */

describe('Checkmate', () => {
  it('detects checkmate (back rank)', () => {
    // Black king on g8, pawns on f7,g7,h7, white rook on a8 delivers mate
    const pos = parseFEN('R5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1');
    const status = getGameStatus(pos);
    expect(status.status).toBe('checkmate');
    expect((status as any).winner).toBe('white');
  });

  it('scholar\'s mate', () => {
    let pos = createStartingPosition();
    pos = playMoves(pos, [
      ['e2', 'e4'], ['e7', 'e5'],
      ['f1', 'c4'], ['b8', 'c6'],
      ['d1', 'h5'], ['g8', 'f6'],
      ['h5', 'f7'],
    ]);
    const status = getGameStatus(pos);
    expect(status.status).toBe('checkmate');
    expect((status as any).winner).toBe('white');
  });
});

/* ═══════════════════════════════════════════
   12. STALEMATE
   ═══════════════════════════════════════════ */

describe('Stalemate', () => {
  it('detects stalemate', () => {
    // King in corner, no legal moves, not in check
    const pos = parseFEN('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1');
    const status = getGameStatus(pos);
    expect(status.status).toBe('draw');
    expect((status as any).reason).toBe('stalemate');
  });

  it('does not confuse stalemate with checkmate', () => {
    const pos = parseFEN('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1');
    expect(isInCheck(pos, 'black')).toBe(false);
  });
});

/* ═══════════════════════════════════════════
   13. DRAW CONDITIONS
   ═══════════════════════════════════════════ */

describe('Draw conditions', () => {
  it('insufficient material: K vs K', () => {
    const pos = parseFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const status = getGameStatus(pos);
    expect(status.status).toBe('draw');
    expect((status as any).reason).toBe('insufficient_material');
  });

  it('insufficient material: K+B vs K', () => {
    const pos = parseFEN('4k3/8/8/8/8/8/8/4KB2 w - - 0 1');
    const status = getGameStatus(pos);
    expect(status.status).toBe('draw');
    expect((status as any).reason).toBe('insufficient_material');
  });

  it('insufficient material: K+N vs K', () => {
    const pos = parseFEN('4k3/8/8/8/8/8/8/4KN2 w - - 0 1');
    const status = getGameStatus(pos);
    expect(status.status).toBe('draw');
    expect((status as any).reason).toBe('insufficient_material');
  });

  it('50-move rule', () => {
    const pos = parseFEN('4k3/8/8/8/8/8/8/4K3 w - - 100 50');
    const status = getGameStatus(pos);
    expect(status.status).toBe('draw');
    expect((status as any).reason).toBe('fifty_move_rule');
  });

  it('threefold repetition', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const history = [fen, 'other', fen, 'other2', fen];
    const pos = parseFEN(fen);
    const status = getGameStatus(pos, history);
    expect(status.status).toBe('draw');
    expect((status as any).reason).toBe('threefold_repetition');
  });
});

/* ═══════════════════════════════════════════
   14. CASTLING
   ═══════════════════════════════════════════ */

describe('Castling', () => {
  it('white kingside castling', () => {
    const pos = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const move = findMove(pos, 'e1', 'g1');
    expect(move).toBeDefined();
    const after = makeMove(pos, move!);
    expect(after.board[getSquareIndex('g1')]!.type).toBe('king');
    expect(after.board[getSquareIndex('f1')]!.type).toBe('rook');
  });

  it('white queenside castling', () => {
    const pos = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const move = findMove(pos, 'e1', 'c1');
    expect(move).toBeDefined();
    const after = makeMove(pos, move!);
    expect(after.board[getSquareIndex('c1')]!.type).toBe('king');
    expect(after.board[getSquareIndex('d1')]!.type).toBe('rook');
  });

  it('black kingside castling', () => {
    const pos = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1');
    const move = findMove(pos, 'e8', 'g8');
    expect(move).toBeDefined();
    const after = makeMove(pos, move!);
    expect(after.board[getSquareIndex('g8')]!.type).toBe('king');
    expect(after.board[getSquareIndex('f8')]!.type).toBe('rook');
  });

  it('black queenside castling', () => {
    const pos = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1');
    const move = findMove(pos, 'e8', 'c8');
    expect(move).toBeDefined();
    const after = makeMove(pos, move!);
    expect(after.board[getSquareIndex('c8')]!.type).toBe('king');
    expect(after.board[getSquareIndex('d8')]!.type).toBe('rook');
  });

  it('cannot castle when king has moved', () => {
    const pos = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w - - 0 1'); // No castling rights
    const move = findMove(pos, 'e1', 'g1');
    expect(move).toBeUndefined();
  });

  it('cannot castle through occupied squares', () => {
    const pos = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R2QK2R w KQkq - 0 1');
    const move = findMove(pos, 'e1', 'c1');
    expect(move).toBeUndefined(); // d1 is occupied by queen
  });

  it('cannot castle while in check', () => {
    const pos = parseFEN('r3k2r/pppp1ppp/8/4q3/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
    // Black queen gives check on e5 -> e1 line
    const castleKS = findMove(pos, 'e1', 'g1');
    const castleQS = findMove(pos, 'e1', 'c1');
    expect(castleKS).toBeUndefined();
    expect(castleQS).toBeUndefined();
  });

  it('cannot castle through attacked square', () => {
    // Black rook attacks f1 — white cannot castle kingside
    const pos = parseFEN('5r1k/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    const move = findMove(pos, 'e1', 'g1');
    expect(move).toBeUndefined();
  });

  it('castling rights are updated after king moves', () => {
    // No pawns blocking king
    const pos = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
    const after = playMoves(pos, [['e1', 'e2']]);
    // White should lose both castling rights
    expect(after.castlingRights & 3).toBe(0);
  });

  it('castling rights are updated after rook moves', () => {
    // No pawn blocking h1 rook from going to h2
    const pos = parseFEN('r3k2r/pppppppp/8/8/8/8/PPPPPP1P/R3K2R w KQkq - 0 1');
    const after = playMoves(pos, [['h1', 'g1']]);
    // White should lose kingside castling
    expect(after.castlingRights & 1).toBe(0);
    // White should keep queenside
    expect(after.castlingRights & 2).toBe(2);
  });
});

/* ═══════════════════════════════════════════
   15. FEN ROUNDTRIP
   ═══════════════════════════════════════════ */

describe('FEN', () => {
  it('roundtrips starting position', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const pos = parseFEN(startFen);
    expect(toFEN(pos)).toBe(startFen);
  });

  it('roundtrips arbitrary position', () => {
    const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
    const pos = parseFEN(fen);
    expect(toFEN(pos)).toBe(fen);
  });
});

/* ═══════════════════════════════════════════
   16. PERFT — Kiwipete position (complex)
   ═══════════════════════════════════════════ */

describe('Perft — Kiwipete', () => {
  it('depth 1 = 48', () => {
    const pos = parseFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect(perft(pos, 1)).toBe(48);
  });

  it('depth 2 = 2039', () => {
    const pos = parseFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect(perft(pos, 2)).toBe(2039);
  });
});

/* ═══════════════════════════════════════════
   17. AI uses legal move engine
   ═══════════════════════════════════════════ */

describe('AI legality', () => {
  it('every generated legal move results in the moving side\'s king not being in check', () => {
    const positions = [
      createStartingPosition(),
      parseFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'),
      parseFEN('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8'),
    ];

    for (const pos of positions) {
      const moves = generateLegalMoves(pos);
      for (const move of moves) {
        const after = makeMove(pos, move);
        expect(isInCheck(after, pos.sideToMove)).toBe(false);
      }
    }
  });
});

/* ═══════════════════════════════════════════
   18. GAME STATE — restart and undo
   ═══════════════════════════════════════════ */

describe('Game state integrity', () => {
  it('makeMove does not mutate the original position', () => {
    const pos = createStartingPosition();
    const fenBefore = toFEN(pos);
    const moves = generateLegalMoves(pos);
    for (const move of moves) {
      makeMove(pos, move);
    }
    expect(toFEN(pos)).toBe(fenBefore);
  });

  it('halfmove clock increments on non-pawn non-capture moves', () => {
    const pos = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const after = playMoves(pos, [['b1', 'c3']]);
    expect(after.halfmoveClock).toBe(1);
  });

  it('halfmove clock resets on pawn moves', () => {
    const pos = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 5 1');
    const after = playMoves(pos, [['e2', 'e4']]);
    expect(after.halfmoveClock).toBe(0);
  });

  it('fullmove number increments after black moves', () => {
    const pos = createStartingPosition();
    const after = playMoves(pos, [['e2', 'e4'], ['e7', 'e5']]);
    expect(after.fullmoveNumber).toBe(2);
  });
});
