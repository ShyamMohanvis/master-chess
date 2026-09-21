import type { Board } from "./Types";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function getRank(index: number): number {
  return Math.floor(index / 8);
}

export function getFile(index: number): number {
  return index % 8;
}

export function getSquare(file: number, rank: number): number {
  return rank * 8 + file;
}

export function isValidSquare(index: number): boolean {
  return index >= 0 && index < 64;
}

export function createEmptyBoard(): Board {
  return new Array(64).fill(null);
}

export function getSquareName(index: number): string {
  if (!isValidSquare(index)) return "-";
  const file = getFile(index);
  const rank = getRank(index);
  return `${String.fromCharCode('a'.charCodeAt(0) + file)}${8 - rank}`;
}

export function getSquareIndex(name: string): number {
  if (name === "-" || name.length !== 2) return -1;
  const file = name.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(name[1], 10);
  return getSquare(file, rank);
}
