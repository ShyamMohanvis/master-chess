import { getFile, getRank } from "../chess/Board";
import type {  Move, Position, Piece  } from "../chess/Types";

type SquareClickCallback = (squareIndex: number) => void;

export class ChessBoardUI {
  private container: HTMLElement;
  private squaresLayer: HTMLElement;
  private piecesLayer: HTMLElement;
  private squares: HTMLElement[] = [];
  private onSquareClick: SquareClickCallback | null = null;

  private currentBoard: (Piece | null)[] = new Array(64).fill(null);
  private pieceEls: (HTMLElement | null)[] = new Array(64).fill(null);

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = el;
    this.container.classList.add('board');
    
    this.squaresLayer = document.createElement('div');
    this.squaresLayer.className = 'squares-layer';
    
    this.piecesLayer = document.createElement('div');
    this.piecesLayer.className = 'pieces-layer';

    this.container.appendChild(this.squaresLayer);
    this.container.appendChild(this.piecesLayer);

    this.initBoard();
  }

  private initBoard() {
    this.squaresLayer.innerHTML = '';
    this.squares = [];

    for (let i = 0; i < 64; i++) {
      const square = document.createElement('div');
      square.className = 'square';
      
      const file = getFile(i);
      const rank = getRank(i);
      const isLight = (file + rank) % 2 === 0;
      square.classList.add(isLight ? 'light' : 'dark');

      square.addEventListener('click', () => {
        if (this.onSquareClick) this.onSquareClick(i);
      });

      this.squaresLayer.appendChild(square);
      this.squares.push(square);
    }
  }

  public setOnSquareClick(callback: SquareClickCallback) {
    this.onSquareClick = callback;
  }

  private moveElementToSquare(el: HTMLElement, index: number) {
    const file = getFile(index);
    const rank = getRank(index);
    el.style.left = `${file * 12.5}%`;
    el.style.top = `${rank * 12.5}%`;
  }

  private createPieceElement(piece: Piece): HTMLElement {
    const el = document.createElement('div');
    el.className = 'piece';
    const baseUrl = import.meta.env.BASE_URL;
    el.style.backgroundImage = `url('${baseUrl}assets/sprites/pieces/${piece.color}_${piece.type}.png')`;
    return el;
  }

  public render(
    position: Position, 
    selectedSquare: number | null, 
    legalMoves: Move[], 
    lastMove: Move | null,
    inCheckSquare: number | null
  ) {
    // 1. Update squares layer (highlights)
    for (let i = 0; i < 64; i++) {
      const squareEl = this.squares[i];
      const file = getFile(i);
      const rank = getRank(i);
      const isLight = (file + rank) % 2 === 0;
      squareEl.className = `square ${isLight ? 'light' : 'dark'}`;

      if (i === selectedSquare) squareEl.classList.add('selected');
      if (lastMove && (i === lastMove.from || i === lastMove.to)) squareEl.classList.add('last-move');
      if (i === inCheckSquare) squareEl.classList.add('in-check');

      const move = legalMoves.find(m => m.to === i);
      if (move) {
        if (move.captured || position.board[i]) {
          squareEl.classList.add('legal-capture');
        } else {
          squareEl.classList.add('legal-move');
        }
      }
    }

    // 2. Animate pieces layer
    const newBoard = position.board;
    const sources: { index: number, piece: Piece, el: HTMLElement }[] = [];
    const destinations: { index: number, piece: Piece }[] = [];
    const captures: HTMLElement[] = [];

    // Find differences
    for (let i = 0; i < 64; i++) {
      const oldPiece = this.currentBoard[i];
      const newPiece = newBoard[i];
      const el = this.pieceEls[i];
      
      if (oldPiece && !newPiece) {
        sources.push({ index: i, piece: oldPiece, el: el! });
        this.pieceEls[i] = null;
      } else if (!oldPiece && newPiece) {
        destinations.push({ index: i, piece: newPiece });
      } else if (oldPiece && newPiece && (oldPiece.type !== newPiece.type || oldPiece.color !== newPiece.color)) {
        captures.push(el!);
        this.pieceEls[i] = null;
        destinations.push({ index: i, piece: newPiece });
      }
    }

    // Match sources to destinations (animations)
    for (const dest of destinations) {
      let matchIdx = sources.findIndex(s => s.piece.color === dest.piece.color && s.piece.type === dest.piece.type);
      
      // If no exact match, it might be a promotion
      if (matchIdx === -1) {
        matchIdx = sources.findIndex(s => s.piece.color === dest.piece.color && s.piece.type === 'pawn');
      }
      
      if (matchIdx !== -1) {
        const source = sources.splice(matchIdx, 1)[0];
        const el = source.el;
        const baseUrl = import.meta.env.BASE_URL;
        el.style.backgroundImage = `url('${baseUrl}assets/sprites/pieces/${dest.piece.color}_${dest.piece.type}.png')`;
        this.moveElementToSquare(el, dest.index);
        this.pieceEls[dest.index] = el;
      } else {
        // Newly created piece (e.g. init board)
        const el = this.createPieceElement(dest.piece);
        this.moveElementToSquare(el, dest.index);
        this.piecesLayer.appendChild(el);
        this.pieceEls[dest.index] = el;
      }
    }

    // Fade out captured / removed pieces
    for (const source of sources) {
      captures.push(source.el);
    }
    
    for (const el of captures) {
      el.style.opacity = '0';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 200);
    }

    this.currentBoard = [...newBoard];
  }
}
