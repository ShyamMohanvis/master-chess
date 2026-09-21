import type {  Color, Piece, Position  } from "./Types";
import { createEmptyBoard, getSquareIndex, START_FEN } from "./Board";

const charToPiece: Record<string, Piece> = {
  'p': { type: 'pawn', color: 'black' },
  'n': { type: 'knight', color: 'black' },
  'b': { type: 'bishop', color: 'black' },
  'r': { type: 'rook', color: 'black' },
  'q': { type: 'queen', color: 'black' },
  'k': { type: 'king', color: 'black' },
  'P': { type: 'pawn', color: 'white' },
  'N': { type: 'knight', color: 'white' },
  'B': { type: 'bishop', color: 'white' },
  'R': { type: 'rook', color: 'white' },
  'Q': { type: 'queen', color: 'white' },
  'K': { type: 'king', color: 'white' },
};

export function parseFEN(fen: string): Position {
  const parts = fen.split(' ');
  if (parts.length < 4) throw new Error("Invalid FEN");

  const [boardPart, colorPart, castlingPart, enPassantPart, halfmovePart, fullmovePart] = parts;
  
  const board = createEmptyBoard();
  
  let index = 0;
  for (let i = 0; i < boardPart.length; i++) {
    const char = boardPart[i];
    if (char === '/') {
      continue;
    }
    if (char >= '1' && char <= '8') {
      index += parseInt(char, 10);
    } else if (charToPiece[char]) {
      board[index] = charToPiece[char];
      index++;
    } else {
      throw new Error("Invalid FEN character: " + char);
    }
  }

  const sideToMove: Color = colorPart === 'w' ? 'white' : 'black';

  let castlingRights = 0;
  if (castlingPart.includes('K')) castlingRights |= 1;
  if (castlingPart.includes('Q')) castlingRights |= 2;
  if (castlingPart.includes('k')) castlingRights |= 4;
  if (castlingPart.includes('q')) castlingRights |= 8;

  const enPassantSquare = getSquareIndex(enPassantPart);

  const halfmoveClock = halfmovePart ? parseInt(halfmovePart, 10) : 0;
  const fullmoveNumber = fullmovePart ? parseInt(fullmovePart, 10) : 1;

  return {
    board,
    sideToMove,
    castlingRights,
    enPassantSquare: enPassantSquare >= 0 ? enPassantSquare : null,
    halfmoveClock,
    fullmoveNumber,
  };
}

export function createStartingPosition(): Position {
  return parseFEN(START_FEN);
}

const pieceToChar: Record<string, string> = {
  'pawn-white': 'P',
  'knight-white': 'N',
  'bishop-white': 'B',
  'rook-white': 'R',
  'queen-white': 'Q',
  'king-white': 'K',
  'pawn-black': 'p',
  'knight-black': 'n',
  'bishop-black': 'b',
  'rook-black': 'r',
  'queen-black': 'q',
  'king-black': 'k',
};

export function toFEN(position: Position): string {
  let fen = '';
  
  for (let rank = 0; rank < 8; rank++) {
    let emptyCount = 0;
    for (let file = 0; file < 8; file++) {
      const idx = rank * 8 + file;
      const piece = position.board[idx];
      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount.toString();
          emptyCount = 0;
        }
        fen += pieceToChar[`${piece.type}-${piece.color}`];
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) {
      fen += emptyCount.toString();
    }
    if (rank < 7) fen += '/';
  }

  fen += position.sideToMove === 'white' ? ' w ' : ' b ';

  let castlingStr = '';
  if (position.castlingRights & 1) castlingStr += 'K';
  if (position.castlingRights & 2) castlingStr += 'Q';
  if (position.castlingRights & 4) castlingStr += 'k';
  if (position.castlingRights & 8) castlingStr += 'q';
  
  fen += castlingStr === '' ? '-' : castlingStr;

  fen += ' ';
  
  if (position.enPassantSquare !== null) {
    const file = position.enPassantSquare % 8;
    const r = Math.floor(position.enPassantSquare / 8);
    fen += `${String.fromCharCode('a'.charCodeAt(0) + file)}${8 - r}`;
  } else {
    fen += '-';
  }

  fen += ` ${position.halfmoveClock} ${position.fullmoveNumber}`;
  
  return fen;
}
