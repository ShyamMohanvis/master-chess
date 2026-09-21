import { createStartingPosition, toFEN } from "../chess/Fen";
import { getGameStatus } from "../chess/GameStatus";
import { generateLegalMoves, isInCheck } from "../chess/LegalMoveGenerator";
import { makeMove } from "../chess/Rules";
import type { Move, Position, PieceType } from "../chess/Types";
import { ChessBoardUI } from "../ui/ChessBoard";

/* ═══════════════════════════════════════════
   Interfaces
   ═══════════════════════════════════════════ */

export interface SFXPlayer {
  move(): void;
  capture(): void;
  check(): void;
  gameOver(): void;
  illegal(): void;
}

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const AI_DELAY_MS = 800;
const INITIAL_TIME_MS = 10 * 60 * 1000; // 10 minutes

/* ═══════════════════════════════════════════
   GameController
   ═══════════════════════════════════════════ */

export class GameController {
  // ── Core chess state ──
  private position: Position;
  private history: Position[] = [];
  private fenHistory: string[] = [];

  // ── UI state ──
  private selectedSquare: number | null = null;
  private legalMovesForSelected: Move[] = [];
  private lastMove: Move | null = null;
  private checkSquare: number | null = null;
  private statusText: string = "White's turn";
  private isGameOver: boolean = false;
  private isPromotionOpen: boolean = false;

  // ── Input & AI ──
  private inputLocked: boolean = false;
  private isAIThinking: boolean = false;
  private aiWorker: Worker;
  private aiMode: 'none' | 'easy' | 'medium' | 'hard' = 'none';
  private aiTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // ── Timer ──
  private whiteTimeMs: number = INITIAL_TIME_MS;
  private blackTimeMs: number = INITIAL_TIME_MS;
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastTimerTick: number = 0;
  private activeTimerColor: 'white' | 'black' | null = null;

  // ── References ──
  private boardUI: ChessBoardUI;
  private sfx: SFXPlayer | null = null;

  constructor(boardUI: ChessBoardUI) {
    this.boardUI = boardUI;
    this.boardUI.setOnSquareClick(this.handleSquareClick.bind(this));

    this.position = createStartingPosition();
    this.saveHistory();
    this.updateStatus();
    this.render();

    this.aiWorker = new Worker(new URL('../ai/ai.worker.ts', import.meta.url), { type: 'module' });
    this.aiWorker.onmessage = this.handleAIResponse.bind(this);
  }

  public setSFX(sfx: SFXPlayer) { this.sfx = sfx; }

  public setAIMode(mode: 'none' | 'easy' | 'medium' | 'hard') {
    this.aiMode = mode;
  }

  /* ═══════════════════════════════════════
     Timer System
     ═══════════════════════════════════════ */

  private startTimer(color: 'white' | 'black') {
    this.stopTimer();
    this.activeTimerColor = color;
    this.lastTimerTick = Date.now();
    this.timerIntervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastTimerTick;
      this.lastTimerTick = now;

      if (this.activeTimerColor === 'white') {
        this.whiteTimeMs = Math.max(0, this.whiteTimeMs - elapsed);
        if (this.whiteTimeMs <= 0) {
          this.whiteTimeMs = 0;
          this.endGameByTimeout('black');
          return;
        }
      } else {
        this.blackTimeMs = Math.max(0, this.blackTimeMs - elapsed);
        if (this.blackTimeMs <= 0) {
          this.blackTimeMs = 0;
          this.endGameByTimeout('white');
          return;
        }
      }

      this.updateTimerDisplay();
    }, 100);
  }

  private stopTimer() {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    this.activeTimerColor = null;
  }

  private endGameByTimeout(winner: 'white' | 'black') {
    this.stopTimer();
    this.isGameOver = true;
    this.inputLocked = true;
    this.statusText = `Time out! ${winner === 'white' ? 'White' : 'Black'} wins.`;
    this.updateTimerDisplay();
    this.updateStatusDisplay();
    this.showGameOver(this.statusText);
    if (this.sfx) this.sfx.gameOver();
  }

  private updateTimerDisplay() {
    const fmt = (ms: number) => {
      const totalSec = Math.ceil(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const wEl = document.getElementById('timer-white');
    const bEl = document.getElementById('timer-black');
    if (wEl) {
      wEl.textContent = fmt(this.whiteTimeMs);
      wEl.classList.toggle('active', this.activeTimerColor === 'white');
      wEl.classList.toggle('danger', this.whiteTimeMs < 60000);
    }
    if (bEl) {
      bEl.textContent = fmt(this.blackTimeMs);
      bEl.classList.toggle('active', this.activeTimerColor === 'black');
      bEl.classList.toggle('danger', this.blackTimeMs < 60000);
    }
  }

  /* ═══════════════════════════════════════
     History
     ═══════════════════════════════════════ */

  private saveHistory() {
    this.history.push(this.position);
    this.fenHistory.push(toFEN(this.position));
  }

  /* ═══════════════════════════════════════
     Square Click Handler
     ═══════════════════════════════════════ */

  private handleSquareClick(squareIndex: number) {
    // Block all input when locked
    if (this.inputLocked || this.isGameOver || this.isPromotionOpen || this.isAIThinking) return;

    // Block if it's AI's turn
    if (this.aiMode !== 'none' && this.position.sideToMove === 'black') return;

    const piece = this.position.board[squareIndex];

    // If a piece is selected, try to move
    if (this.selectedSquare !== null) {
      // Check if clicking a different own piece → reselect
      if (piece && piece.color === this.position.sideToMove && squareIndex !== this.selectedSquare) {
        this.selectPiece(squareIndex);
        return;
      }

      // Find matching legal move to this square
      const matchingMoves = this.legalMovesForSelected.filter(m => m.to === squareIndex);

      if (matchingMoves.length > 0) {
        // Check if this is a promotion (multiple moves for same square)
        if (matchingMoves[0].promotion) {
          this.showPromotionUI(matchingMoves[0].from, matchingMoves[0].to);
          return;
        }

        // Execute the move
        this.executePlayerMove(matchingMoves[0]);
        return;
      }

      // Clicked an invalid square: deselect
      this.deselectPiece();
      return;
    }

    // No piece selected: select a friendly piece
    if (piece && piece.color === this.position.sideToMove) {
      this.selectPiece(squareIndex);
    }
  }

  private selectPiece(squareIndex: number) {
    this.selectedSquare = squareIndex;
    const allLegalMoves = generateLegalMoves(this.position);
    this.legalMovesForSelected = allLegalMoves.filter(m => m.from === squareIndex);
    this.render();
  }

  private deselectPiece() {
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.render();
  }

  /* ═══════════════════════════════════════
     Execute Player Move
     ═══════════════════════════════════════ */

  private executePlayerMove(move: Move) {
    const isCapture = !!this.position.board[move.to] || !!(move.captured);

    this.position = makeMove(this.position, move);
    this.saveHistory();

    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.lastMove = move;

    this.updateStatus();
    this.render();
    this.playMoveSFX(isCapture);

    if (this.isGameOver) return;

    // Start AI turn
    if (this.aiMode !== 'none' && this.position.sideToMove === 'black') {
      this.startAITurn();
    } else {
      // In non-AI mode, switch timer
      this.startTimer(this.position.sideToMove);
    }
  }

  /* ═══════════════════════════════════════
     AI Turn Pipeline
     ═══════════════════════════════════════ */

  private startAITurn() {
    this.inputLocked = true;
    this.isAIThinking = true;
    this.statusText = "AI Thinking...";
    this.updateStatusDisplay();

    // Switch timer to black
    this.startTimer('black');

    // Delay before AI calculation
    this.aiTimeoutId = setTimeout(() => {
      this.aiTimeoutId = null;

      let depth = 4;
      if (this.aiMode === 'easy') depth = 2;
      else if (this.aiMode === 'medium') depth = 3;

      this.aiWorker.postMessage({ position: this.position, depth });
    }, AI_DELAY_MS);
  }

  private handleAIResponse(e: MessageEvent) {
    if (!this.isAIThinking) return; // Ignore stale responses

    this.isAIThinking = false;

    if (e.data.type === 'SUCCESS' && e.data.result.move) {
      const move: Move = e.data.result.move;
      const isCapture = !!this.position.board[move.to] || !!(move.captured);

      this.position = makeMove(this.position, move);
      this.saveHistory();

      this.lastMove = move;
      this.updateStatus();
      this.render();
      this.playMoveSFX(isCapture);

      if (!this.isGameOver) {
        // Switch timer to white
        this.startTimer('white');
      }
    }

    // Unlock input
    this.inputLocked = false;
    this.updateStatusDisplay();
  }

  /* ═══════════════════════════════════════
     Promotion
     ═══════════════════════════════════════ */

  private showPromotionUI(from: number, to: number) {
    this.isPromotionOpen = true;
    const modal = document.getElementById('promotion-modal');
    if (!modal) return;

    // Set promotion piece images
    const color = this.position.sideToMove;
    const baseUrl = import.meta.env.BASE_URL;
    const types: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
    types.forEach(type => {
      const el = document.getElementById(`promo-${type}`);
      if (el) {
        el.style.backgroundImage = `url('${baseUrl}assets/sprites/pieces/${color}_${type}.png')`;
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundPosition = 'center';

        el.onclick = () => {
          modal.style.display = 'none';
          this.isPromotionOpen = false;

          // Find exact promotion move
          const allLegalMoves = generateLegalMoves(this.position);
          const exactMove = allLegalMoves.find(m => m.from === from && m.to === to && m.promotion === type);
          if (exactMove) {
            this.executePlayerMove(exactMove);
          }
        };
      }
    });

    modal.style.display = 'flex';
  }

  /* ═══════════════════════════════════════
     Status Updates
     ═══════════════════════════════════════ */

  private updateStatus() {
    const status = getGameStatus(this.position, this.fenHistory);

    // Find king in check
    let checkSq: number | null = null;
    if (isInCheck(this.position, this.position.sideToMove)) {
      for (let i = 0; i < 64; i++) {
        const p = this.position.board[i];
        if (p && p.type === 'king' && p.color === this.position.sideToMove) {
          checkSq = i;
          break;
        }
      }
    }
    this.checkSquare = checkSq;

    if (status.status === 'active') {
      this.isGameOver = false;
      const turnName = this.position.sideToMove === 'white' ? 'White' : 'Black';
      this.statusText = `${turnName}'s turn${checkSq !== null ? ' (Check)' : ''}`;
    } else {
      this.isGameOver = true;
      this.inputLocked = true;
      this.stopTimer();

      if (status.status === 'checkmate') {
        this.statusText = `Checkmate! ${status.winner === 'white' ? 'White' : 'Black'} wins.`;
      } else {
        const reasonMap: Record<string, string> = {
          stalemate: 'Stalemate',
          insufficient_material: 'Insufficient Material',
          fifty_move_rule: 'Fifty-Move Rule',
          threefold_repetition: 'Threefold Repetition',
        };
        this.statusText = `Draw: ${reasonMap[status.reason] || status.reason}`;
      }
      this.showGameOver(this.statusText);
    }

    this.updateStatusDisplay();
  }

  private updateStatusDisplay() {
    const statusEl = document.getElementById('status-text');
    if (statusEl) {
      statusEl.textContent = this.statusText;
      statusEl.classList.toggle('thinking', this.isAIThinking);
    }
  }

  private showGameOver(text: string) {
    const modal = document.getElementById('game-over-modal');
    if (modal) {
      modal.style.display = 'flex';
      const textEl = document.getElementById('game-over-text');
      if (textEl) textEl.textContent = text;
    }
    if (this.sfx) this.sfx.gameOver();
  }

  /* ═══════════════════════════════════════
     Sound Effects
     ═══════════════════════════════════════ */

  private playMoveSFX(isCapture: boolean) {
    if (!this.sfx) return;
    if (this.isGameOver) {
      // gameOver SFX is played from showGameOver
      return;
    }
    if (this.checkSquare !== null) {
      this.sfx.check();
    } else if (isCapture) {
      this.sfx.capture();
    } else {
      this.sfx.move();
    }
  }

  /* ═══════════════════════════════════════
     Undo
     ═══════════════════════════════════════ */

  public undo() {
    if (this.isAIThinking || this.isGameOver) return;
    if (this.history.length <= 1) return;

    // Cancel pending AI
    if (this.aiTimeoutId !== null) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
    }

    // In AI mode, undo both AI + player move
    if (this.aiMode !== 'none') {
      // Undo AI move
      if (this.history.length > 1) {
        this.history.pop();
        this.fenHistory.pop();
      }
      // Undo player move
      if (this.history.length > 1) {
        this.history.pop();
        this.fenHistory.pop();
      }
    } else {
      // Non-AI: undo single move
      this.history.pop();
      this.fenHistory.pop();
    }

    this.position = this.history[this.history.length - 1];
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.lastMove = null;
    this.isAIThinking = false;
    this.inputLocked = false;

    // Close modals
    this.hideModal('game-over-modal');
    this.hideModal('promotion-modal');
    this.isPromotionOpen = false;

    this.updateStatus();
    this.render();

    // Restart timer for current player
    if (!this.isGameOver) {
      this.startTimer(this.position.sideToMove);
    }
  }

  /* ═══════════════════════════════════════
     Restart
     ═══════════════════════════════════════ */

  public restart() {
    // Cancel pending AI
    if (this.aiTimeoutId !== null) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
    }

    this.stopTimer();

    this.position = createStartingPosition();
    this.history = [];
    this.fenHistory = [];
    this.saveHistory();

    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.lastMove = null;
    this.checkSquare = null;
    this.isGameOver = false;
    this.isPromotionOpen = false;
    this.inputLocked = false;
    this.isAIThinking = false;
    this.statusText = "White's turn";

    // Reset timers
    this.whiteTimeMs = INITIAL_TIME_MS;
    this.blackTimeMs = INITIAL_TIME_MS;

    // Close modals
    this.hideModal('game-over-modal');
    this.hideModal('promotion-modal');
    this.hideModal('ingame-menu-modal');

    this.updateStatus();
    this.updateTimerDisplay();
    this.render();

    // Start White's timer
    this.startTimer('white');
  }

  /* ═══════════════════════════════════════
     Render
     ═══════════════════════════════════════ */

  private render() {
    this.boardUI.render(
      this.position,
      this.selectedSquare,
      this.legalMovesForSelected,
      this.lastMove,
      this.checkSquare
    );
  }

  /* ═══════════════════════════════════════
     Helpers
     ═══════════════════════════════════════ */

  private hideModal(id: string) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
}
