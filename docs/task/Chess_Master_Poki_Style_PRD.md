# Chess Master — Poki-Style PRD

**Version:** 1.0  
**Reference:** https://poki.com/en/g/master-chess  
**Target:** HTML5 desktop, mobile and tablet browser

> Build close gameplay/UX parity with the reference while using independent code, branding, UI artwork, chess-piece assets and sounds. Do not copy proprietary source code or protected assets.

## 1. Product Summary

Build a lightweight browser chess game inspired by Poki's **Master Chess**. Poki currently describes the reference as an HTML5 chess game by Codethislab with solo play against the computer, Easy and Hard difficulty, same-device 2-player play, tap/left-click controls, and desktop/phone/tablet support. Poki lists a March 2019 release and December 2025 update. citeturn0search0

## 2. Core Modes

### Solo
- Play against computer.
- Easy AI.
- Hard AI / strong challenge.
- MVP player color: White; P1 adds White/Black/Random.

### Local 2 Player
- Two humans on one device.
- White/Black alternating turns.
- No network required.

## 3. Chess Rules — P0

Implement complete standard chess:
- King, Queen, Rook, Bishop, Knight, Pawn.
- Legal movement and captures.
- Check and checkmate.
- Stalemate.
- Kingside/queenside castling.
- En passant.
- Promotion to Queen/Rook/Bishop/Knight.
- Insufficient-material draw.
- Fifty-move rule.
- Threefold repetition.

## 4. Main Screens

```text
HOME
 ├── VS COMPUTER
 ├── 2 PLAYER
 ├── HOW TO PLAY
 └── SETTINGS

VS COMPUTER
 ├── EASY
 └── HARD

GAMEPLAY
 ├── Board
 ├── Turn/status
 ├── Captured pieces
 ├── Restart
 └── Undo

GAME OVER
 ├── Rematch
 └── Main Menu
```

## 5. Main Menu

Visual hierarchy:

```text
             CHESS MASTER

          [original chess logo]

        [ VS COMPUTER ]

           [ 2 PLAYER ]

        [ HOW TO PLAY ]

               [⚙]
```

Keep the menu minimal and fast.

## 6. Board

8×8 square board.

Desktop target:
- `min(70vh, 640px)`

Mobile target:
- `min(92vw, 430px)`

Recommended starting palette:
- Background: dark neutral
- Light square: warm cream
- Dark square: brown
- Selected square: yellow
- Legal move: green
- Check: red

Use original/licensed SVG chess pieces.

## 7. Interaction

Reference interaction is tap or mouse click to move pieces. citeturn0search0

Preferred universal flow:

```text
select own piece
      ↓
show legal moves
      ↓
select destination
      ↓
validate
      ↓
animate
      ↓
update state
      ↓
switch turn
```

Show:
- Selected square.
- Legal destination dots.
- Capture targets.
- Last move.
- Check state.

## 8. Gameplay Header

```text
[TURN / STATUS]       [RESTART] [SETTINGS]
```

Optional:
- Captured material.
- Move counter.
- Coordinates.

## 9. AI

### Easy
- Minimax/Negamax.
- Depth 1–2 initially.
- Controlled non-optimal choices.
- Fast response.

### Hard
- Negamax.
- Alpha-beta pruning.
- Iterative deepening.
- Move ordering.
- Transposition table.
- Quiescence search.
- Better evaluation.
- Initial target depth 4–6, benchmarked on actual browser hardware.

Use a Web Worker so AI search never freezes the UI.

## 10. Evaluation

Starting material:

```text
Pawn   100
Knight 320
Bishop 330
Rook   500
Queen  900
King   very high
```

Add:
- Piece-square tables.
- Mobility.
- Center control.
- King safety.
- Pawn structure.

## 11. Game Over

Checkmate:

```text
CHECKMATE
White wins

[REMATCH] [MENU]
```

Stalemate/draw:

```text
DRAW
Reason

[REMATCH] [MENU]
```

## 12. Promotion

When a pawn reaches the last rank:

```text
CHOOSE PROMOTION
[Queen] [Rook] [Bishop] [Knight]
```

Block further board input until selected.

## 13. Restart / Undo

Restart:
```text
Restart game?
[Cancel] [Restart]
```

Solo undo:
- Undo player's move + AI response.

Local 2-player:
- Undo one move/ply in MVP.

## 14. Settings

```text
Sound             ON/OFF
Animations        ON/OFF
Legal Moves       ON/OFF
Coordinates       ON/OFF
```

P1:
- Board theme.
- Piece theme.

## 15. How To Play

Explain visually:
- Piece movement.
- Check.
- Checkmate.
- Castling.
- En passant.
- Promotion.
- Draws.

## 16. Responsive Requirements

Desktop:
```text
board + optional side information
```

Mobile:
```text
header
↓
status
↓
board
↓
captured pieces
↓
controls
```

Touch targets: minimum 44×44px.

Do not require drag-and-drop; tap-to-select + tap-to-move must work everywhere.

## 17. Accessibility

- Semantic buttons.
- Visible focus.
- Keyboard support.
- ARIA labels.
- Reduced-motion support.
- Text status for check/checkmate.
- Color must not be the only state indicator.

Keyboard:
```text
Arrow keys = navigate
Enter/Space = select
Esc = cancel
R = restart
U = undo
```

## 18. Persistence

LocalStorage key:

```text
chess_master_save_v1
```

Store:
- Settings.
- Statistics.
- Unfinished local game.
- Last mode/difficulty.

Validate loaded state before restoring.

## 19. Statistics

Track:
- Games played.
- Wins.
- Losses.
- Draws.
- Easy wins.
- Hard wins.
- Local 2-player games.

## 20. QA

### Rules
- [ ] All pieces move correctly.
- [ ] Illegal moves rejected.
- [ ] King cannot enter check.
- [ ] Check/checkmate correct.
- [ ] Stalemate correct.
- [ ] Castling correct.
- [ ] En passant correct.
- [ ] Promotion correct.
- [ ] Draw rules correct.

### AI
- [ ] Never makes illegal move.
- [ ] Easy works.
- [ ] Hard works.
- [ ] AI handles special moves.
- [ ] UI remains responsive.

### UI
- [ ] Desktop.
- [ ] Mobile.
- [ ] Tablet.
- [ ] Mouse.
- [ ] Touch.
- [ ] Keyboard.
- [ ] Restart.
- [ ] Rematch.
- [ ] Promotion modal.

## 21. Development Order

```text
1. Chess rules engine
2. Legal move generation
3. Check/checkmate/draws
4. Board UI
5. Selection + highlights
6. Local 2-player
7. Easy AI
8. Hard AI
9. Menus
10. Settings/tutorial
11. Mobile optimization
12. QA/performance
13. Production build
```

## 22. Feature Matrix

| Feature | Priority |
|---|---:|
| Complete chess rules | P0 |
| 8×8 board | P0 |
| Solo AI | P0 |
| Easy AI | P0 |
| Hard AI | P0 |
| Local 2-player | P0 |
| Tap/click controls | P0 |
| Legal highlights | P0 |
| Check/checkmate | P0 |
| Castling | P0 |
| En passant | P0 |
| Promotion | P0 |
| Draw detection | P0 |
| Restart | P0 |
| Rematch | P0 |
| Mobile/tablet | P0 |
| Settings | P1 |
| Tutorial | P1 |
| Undo | P1 |
| Sound | P1 |
| Statistics | P1 |
| Online multiplayer | P2 |
| Leaderboards | P2 |

## 23. Definition of Done

The game is release-ready when the complete chess rules are correct, local 2-player works, Easy/Hard AI work, desktop/mobile/tablet interaction works, special moves and draws are tested, the UI is responsive, and only original/licensed assets are used.
