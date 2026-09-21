import { createStartingPosition, toFEN } from "../chess/Fen";
import { getGameStatus } from "../chess/GameStatus";
import { generateLegalMoves, isInCheck } from "../chess/LegalMoveGenerator";
import { makeMove } from "../chess/Rules";
import type {  Move, Position, PieceType  } from "../chess/Types";
import { ChessBoardUI } from "../ui/ChessBoard";

export interface SFXPlayer {
  move(): void;
  capture(): void;
  check(): void;
  gameOver(): void;
  illegal(): void;
}

export interface UIState {
  selectedSquare: number | null;
  legalMoves: Move[];
  lastMove: Move | null;
  checkSquare: number | null;
  isPromotionOpen: boolean;
  isGameOver: boolean;
  statusText: string;
}

export class GameController {
  private position: Position;
  private history: Position[] = [];
  private fenHistory: string[] = [];
  
  private uiState: UIState;
  private boardUI: ChessBoardUI;

  private aiWorker: Worker;
  private aiMode: 'none' | 'easy' | 'medium' | 'hard' = 'hard';
  private isAIThinking: boolean = false;
  private sfx: SFXPlayer | null = null;

  public setSFX(sfx: SFXPlayer) { this.sfx = sfx; }

  // Pending promotion
  // private pendingPromotionMove: Move | null = null;

  constructor(boardUI: ChessBoardUI) {
    this.boardUI = boardUI;
    this.boardUI.setOnSquareClick(this.handleSquareClick.bind(this));
    
    this.position = createStartingPosition();
    this.uiState = {
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      checkSquare: null,
      isPromotionOpen: false,
      isGameOver: false,
      statusText: "White's turn"
    };

    this.saveHistory();
    this.updateStatus();
    this.render();

    this.aiWorker = new Worker(new URL('../ai/ai.worker.ts', import.meta.url), { type: 'module' });
    this.aiWorker.onmessage = this.handleAIResponse.bind(this);
  }

  public setAIMode(mode: 'none' | 'easy' | 'medium' | 'hard') {
    this.aiMode = mode;
    this.checkAITurn();
  }

  private handleAIResponse(e: MessageEvent) {
    this.isAIThinking = false;
    if (e.data.type === 'SUCCESS' && e.data.result.move) {
      this.executeMove(e.data.result.move);
    }
  }

  private checkAITurn() {
    if (this.uiState.isGameOver) return;
    if (this.aiMode !== 'none' && this.position.sideToMove === 'black') {
      this.isAIThinking = true;
      this.uiState.statusText = "AI is thinking...";
      this.render(); // update status text
      const statusEl = document.getElementById('status-text');
      if (statusEl) statusEl.textContent = this.uiState.statusText;

      let depth = 4;
      if (this.aiMode === 'easy') depth = 2;
      else if (this.aiMode === 'medium') depth = 3;

      this.aiWorker.postMessage({ position: this.position, depth });
    }
  }

  private saveHistory() {
    this.history.push(this.position);
    this.fenHistory.push(toFEN(this.position));
  }

  private handleSquareClick(squareIndex: number) {
    if (this.uiState.isGameOver || this.uiState.isPromotionOpen || this.isAIThinking) return;

    // AI controls black if aiMode is not 'none'
    if (this.aiMode !== 'none' && this.position.sideToMove === 'black') return;

    const piece = this.position.board[squareIndex];

    // If a square is already selected, check if we are making a move
    if (this.uiState.selectedSquare !== null) {
      const move = this.uiState.legalMoves.find(m => m.to === squareIndex);
      
      if (move) {
        if (move.promotion && !move.piece.type /* temporary check, actual promotion needs UI */) {
          // In a real UI, we show a modal. Here we'll intercept it.
          // Wait, the MoveGenerator creates 4 moves for promotion (Q, R, B, N).
          // We can show a promotion UI, and wait for user.
          this.uiState.isPromotionOpen = true;
          this.showPromotionUI(move.from, move.to);
          return;
        }

        // Execute move
        this.executeMove(move);
        return;
      }
    }

    // Select a piece of our own color
    if (piece && piece.color === this.position.sideToMove) {
      this.uiState.selectedSquare = squareIndex;
      const allLegalMoves = generateLegalMoves(this.position);
      this.uiState.legalMoves = allLegalMoves.filter(m => m.from === squareIndex);
      
      // If we selected a pawn on the 7th/2nd rank, the generated moves already have `promotion` set.
      // We don't filter them out here, but when clicked, we find the first one and trigger promotion UI.
    } else {
      // Deselect
      this.uiState.selectedSquare = null;
      this.uiState.legalMoves = [];
    }

    this.render();
  }

  private executeMove(move: Move) {
    const isCapture = !!this.position.board[move.to];
    this.position = makeMove(this.position, move);
    this.saveHistory();
    
    this.uiState.selectedSquare = null;
    this.uiState.legalMoves = [];
    this.uiState.lastMove = move;
    
    this.updateStatus();
    this.render();

    // Play sound after status is known
    if (this.sfx) {
      if (this.uiState.isGameOver) {
        this.sfx.gameOver();
      } else if (this.uiState.checkSquare !== null) {
        this.sfx.check();
      } else if (isCapture) {
        this.sfx.capture();
      } else {
        this.sfx.move();
      }
    }

    this.checkAITurn();
  }

  private showPromotionUI(from: number, to: number) {
    const modal = document.getElementById('promotion-modal');
    if (modal) {
      modal.style.display = 'flex';
      
      // Setup click handlers for the options
      const options = ['queen', 'rook', 'bishop', 'knight'] as PieceType[];
      options.forEach(type => {
        const el = document.getElementById(`promo-${type}`);
        if (el) {
          el.onclick = () => {
            modal.style.display = 'none';
            this.uiState.isPromotionOpen = false;
            
            // Find the exact promotion move
            const allLegalMoves = generateLegalMoves(this.history[this.history.length - 1]);
            const exactMove = allLegalMoves.find(m => m.from === from && m.to === to && m.promotion === type);
            if (exactMove) {
              this.executeMove(exactMove);
            }
          };
        }
      });
    }
  }

  private updateStatus() {
    const status = getGameStatus(this.position, this.fenHistory);
    
    let checkSquare = null;
    if (isInCheck(this.position, this.position.sideToMove)) {
      for (let i = 0; i < 64; i++) {
        const p = this.position.board[i];
        if (p && p.type === 'king' && p.color === this.position.sideToMove) {
          checkSquare = i;
          break;
        }
      }
    }
    this.uiState.checkSquare = checkSquare;

    if (status.status === 'active') {
      this.uiState.isGameOver = false;
      this.uiState.statusText = `${this.position.sideToMove === 'white' ? 'White' : 'Black'}'s turn${checkSquare !== null ? ' (Check)' : ''}`;
    } else {
      this.uiState.isGameOver = true;
      if (status.status === 'checkmate') {
        this.uiState.statusText = `Checkmate! ${status.winner === 'white' ? 'White' : 'Black'} wins.`;
      } else {
        this.uiState.statusText = `Draw: ${status.reason}`;
      }
      this.showGameOver(this.uiState.statusText);
    }
    
    const statusEl = document.getElementById('status-text');
    if (statusEl) statusEl.textContent = this.uiState.statusText;
  }

  private showGameOver(text: string) {
    const modal = document.getElementById('game-over-modal');
    if (modal) {
      modal.style.display = 'flex';
      const textEl = document.getElementById('game-over-text');
      if (textEl) textEl.textContent = text;
    }
  }

  public restart() {
    this.position = createStartingPosition();
    this.history = [];
    this.fenHistory = [];
    this.saveHistory();

    this.uiState = {
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      checkSquare: null,
      isPromotionOpen: false,
      isGameOver: false,
      statusText: "White's turn"
    };

    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'none';

    this.isAIThinking = false;
    this.updateStatus();
    this.render();
    this.checkAITurn();
  }

  public undo() {
    if (this.history.length > 1) {
      this.history.pop();
      this.fenHistory.pop();
      this.position = this.history[this.history.length - 1];
      
      this.uiState.selectedSquare = null;
      this.uiState.legalMoves = [];
      this.uiState.lastMove = null; // Ideally track this in history too
      
      const modal = document.getElementById('game-over-modal');
      if (modal) modal.style.display = 'none';
      
      this.isAIThinking = false;
      this.updateStatus();
      this.render();
      
      // If we undo in AI mode, undo twice so it's our turn again
      if (this.aiMode !== 'none' && this.position.sideToMove === 'black') {
        setTimeout(() => this.undo(), 0);
      }
    }
  }

  private render() {
    this.boardUI.render(
      this.position, 
      this.uiState.selectedSquare, 
      this.uiState.legalMoves, 
      this.uiState.lastMove,
      this.uiState.checkSquare
    );
  }
}
