# Chess Master — Technical Requirements Document (TRD)

**Version:** 1.0  
**Target:** HTML5 browser  
**Reference:** Poki Master Chess

## 1. Stack

Recommended:

```text
TypeScript
Vite
HTML5
CSS3
SVG
Web Workers
LocalStorage
Vitest
Playwright
ESLint
Prettier
```

No backend is required for MVP.

## 2. Architecture

```text
UI / Input
    ↓
Game Controller
    ↓
Chess Engine ───── Save Manager
    ↓
AI Request
    ↓
Web Worker
    ↓
Search / Evaluation
    ↓
Best Move
    ↓
Game Controller
    ↓
UI
```

Critical rule:

> The chess engine must have zero dependency on DOM/CSS/UI.

## 3. Project Structure

```text
src/
├── main.ts
├── app/
├── chess/
│   ├── Board.ts
│   ├── Piece.ts
│   ├── Position.ts
│   ├── Move.ts
│   ├── MoveGenerator.ts
│   ├── LegalMoveGenerator.ts
│   ├── AttackMap.ts
│   ├── CheckDetector.ts
│   ├── GameStatus.ts
│   ├── Rules.ts
│   ├── Fen.ts
│   └── San.ts
├── ai/
│   ├── Search.ts
│   ├── Evaluation.ts
│   ├── MoveOrdering.ts
│   ├── TranspositionTable.ts
│   ├── Quiescence.ts
│   └── ai.worker.ts
├── game/
│   ├── GameController.ts
│   ├── TurnManager.ts
│   ├── HistoryManager.ts
│   └── GameSession.ts
├── ui/
│   ├── ChessBoard.ts
│   ├── Square.ts
│   ├── PieceView.ts
│   ├── MainMenu.ts
│   ├── GameOverModal.ts
│   ├── PromotionModal.ts
│   └── SettingsModal.ts
├── input/
│   ├── MouseInput.ts
│   ├── TouchInput.ts
│   └── KeyboardInput.ts
├── services/
│   ├── SaveManager.ts
│   ├── SettingsManager.ts
│   ├── StatisticsManager.ts
│   └── AudioManager.ts
├── styles/
└── tests/
```

## 4. Board Representation

Use a flat 64-square array.

```ts
type Color = "white" | "black";

type PieceType =
  | "pawn" | "knight" | "bishop"
  | "rook" | "queen" | "king";

type Piece = {
  type: PieceType;
  color: Color;
};

type Board = (Piece | null)[];
```

Suggested indexing:

```text
a8 = 0
...
h8 = 7
a7 = 8
...
h1 = 63
```

## 5. Position

```ts
interface Position {
  board: Board;
  sideToMove: Color;

  castlingRights: number;
  enPassantSquare: number | null;

  halfmoveClock: number;
  fullmoveNumber: number;
}
```

Castling flags:

```text
1 = White O-O
2 = White O-O-O
4 = Black O-O
8 = Black O-O-O
```

## 6. Move

```ts
interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  flags: number;
}
```

Flags:

```text
CAPTURE
DOUBLE_PAWN
EN_PASSANT
KING_CASTLE
QUEEN_CASTLE
PROMOTION
```

## 7. Move Generation

Pipeline:

```text
position
 ↓
pseudo-legal moves
 ↓
make move
 ↓
find own king
 ↓
attack test
 ↓
keep only king-safe moves
 ↓
legal moves
```

Implement direct attack detection for:
- Pawns.
- Knights.
- Bishops.
- Rooks.
- Queens.
- King.

## 8. Check / Mate

```ts
isInCheck(position, color)
```

uses:

```text
find king
→ isSquareAttacked(king, opponent)
```

Checkmate:

```text
inCheck && legalMoves.length === 0
```

Stalemate:

```text
!inCheck && legalMoves.length === 0
```

## 9. Castling

Validate:
- King/rook unmoved.
- Empty path.
- King not currently in check.
- Transit square not attacked.
- Destination not attacked.

Execute king and rook atomically.

## 10. En Passant

On a pawn double-step:

```text
enPassantSquare = passed square
```

Clear it after the next turn unless immediately used.

## 11. Promotion

At final rank:

```text
Queen
Rook
Bishop
Knight
```

Promotion is mandatory.

## 12. Draw Detection

Implement:
- Stalemate.
- Insufficient material.
- Fifty-move rule.
- Threefold repetition.

Use a position hash containing:

```text
board
side
castling rights
en-passant state
```

## 13. Zobrist Hashing

Use:
```text
pieceSquare[12][64]
side
castling[16]
enPassant[64]
```

A 64-bit `BigInt` hash or two 32-bit values may be used.

## 14. FEN

Implement:

```ts
parseFEN(fen): Position
toFEN(position): string
```

Use FEN for:
- Testing.
- Save/resume.
- Debugging.
- AI test positions.

## 15. AI

Architecture:

```text
GameController
      ↓
AI Worker
      ↓
Negamax
      ↓
Alpha-Beta
      ↓
Move Ordering
      ↓
Evaluation
```

### Easy

```text
depth 1–2
small controlled randomness
```

### Hard

```text
iterative deepening
alpha-beta
transposition table
quiescence
move ordering
piece-square tables
```

Initial hard depth target:

```text
4–6
```

Benchmark before locking the value.

## 16. Search

Use negamax:

```ts
function search(position, depth, alpha, beta) {
  if (depth === 0) {
    return quiescence(position, alpha, beta);
  }

  let best = -Infinity;

  for (const move of orderedMoves(position)) {
    makeMove(position, move);

    const score = -search(
      position,
      depth - 1,
      -beta,
      -alpha
    );

    unmakeMove(position, move);

    best = Math.max(best, score);
    alpha = Math.max(alpha, score);

    if (alpha >= beta) break;
  }

  return best;
}
```

## 17. Evaluation

Starting material values:

```text
Pawn 100
Knight 320
Bishop 330
Rook 500
Queen 900
King 20000
```

Add:
- Piece-square tables.
- Mobility.
- Center control.
- King safety.
- Pawn structure.

Keep evaluation perspective consistent.

## 18. Move Ordering

Priority:

```text
1. Hash move
2. Winning captures
3. Promotions
4. Killer moves
5. History heuristic
6. Quiet moves
```

## 19. Quiescence

At depth zero, continue tactical moves such as:
- Captures.
- Promotions.
- Necessary check responses.

This reduces horizon-effect mistakes.

## 20. Transposition Table

```ts
type TTEntry = {
  hash: bigint;
  depth: number;
  score: number;
  flag: "EXACT" | "LOWER" | "UPPER";
  bestMove?: Move;
};
```

## 21. Web Worker

`ai.worker.ts` receives:

```ts
{
  position,
  difficulty,
  timeLimitMs
}
```

and returns:

```ts
{
  move,
  depth,
  score,
  nodes
}
```

AI must not mutate main-thread UI state.

## 22. UI Rendering

Use:

```text
HTML
CSS Grid
SVG
```

Board:

```css
display: grid;
grid-template-columns: repeat(8, 1fr);
aspect-ratio: 1;
```

SVG pieces are preferred for clean scaling.

## 23. Input

All inputs call one API:

```text
Mouse → Input Adapter
Touch → Input Adapter
Keyboard → Input Adapter
                  ↓
       GameController.selectSquare()
```

Do not duplicate chess rules in input handlers.

## 24. Game Controller

Responsibilities:

```text
startGame()
selectSquare()
attemptMove()
handlePromotion()
requestAIMove()
restart()
undo()
endGame()
```

It coordinates engine/UI but contains no move-generation implementation.

## 25. UI State

```ts
interface UIState {
  selectedSquare: number | null;
  legalMoves: Move[];
  lastMove: Move | null;
  checkSquare: number | null;
  isPromotionOpen: boolean;
  isGameOver: boolean;
  statusText: string;
}
```

## 26. Save System

Key:

```text
chess_master_save_v1
```

Store:
- Settings.
- Statistics.
- Last mode.
- Difficulty.
- Unfinished position/FEN.

Validate every loaded value.

## 27. Testing

### Unit
Test:
- Every piece.
- Captures.
- Pins.
- Checks.
- Checkmate.
- Stalemate.
- Castling.
- En passant.
- Promotion.
- Draws.
- FEN.
- Hashing.

### E2E
Use Playwright for:
- Desktop.
- Mobile viewport.
- Tablet viewport.
- Touch.
- Keyboard.
- Restart/rematch.
- Promotion.

## 28. Perft Validation

Initial chess position expected move counts:

```text
Depth 1 = 20
Depth 2 = 400
Depth 3 = 8,902
Depth 4 = 197,281
Depth 5 = 4,865,609
```

Use these to validate legal move generation before building the AI.

Also test special positions for castling, en passant, promotions, pins and discovered checks.

## 29. Performance Targets

```text
Initial load: <2s target
UI response: <50ms target
Legal move generation: typically <1ms
AI response: <2s target
Move animation: 120–220ms
```

Profile on real mobile hardware.

## 30. Responsive Layout

```css
--mobile: 480px;
--tablet: 768px;
--desktop: 1024px;
```

Board:

```css
width: min(92vw, 640px);
aspect-ratio: 1;
```

Mobile:
```text
Header
Status
Board
Captured pieces
Controls
```

Desktop may place information beside the board.

## 31. Build Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

## 32. Milestones

### M1
Chess engine + move generation.

### M2
Complete rules + draw detection + FEN/hash.

### M3
Board UI + interaction.

### M4
Local 2-player.

### M5
Easy AI + worker.

### M6
Hard AI + search optimization.

### M7
Menus/settings/tutorial/responsive polish.

### M8
Perft + unit + E2E + performance + accessibility.

## 33. Engineering Rule

Maintain strict separation:

```text
CHESS ENGINE
     ↓
GAME CONTROLLER
     ↓
UI
```

The engine must be browser-UI independent.

## 34. Definition of Done

- [ ] Perft validated.
- [ ] Complete chess rules.
- [ ] Check/checkmate/draw correct.
- [ ] Local 2-player.
- [ ] Easy AI.
- [ ] Hard AI.
- [ ] Web Worker AI.
- [ ] Mouse/touch/keyboard.
- [ ] Responsive board.
- [ ] Promotion UI.
- [ ] Restart/rematch.
- [ ] Save/resume.
- [ ] Accessibility basics.
- [ ] Performance tested.
- [ ] Original/licensed assets only.
