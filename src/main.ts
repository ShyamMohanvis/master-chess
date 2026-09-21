import './styles/board.css';
import { ChessBoardUI } from './ui/ChessBoard';
import { GameController } from './game/GameController';

// Initialize promotion SVGs (now images)
const setPromoPiece = (id: string, pieceKey: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.style.backgroundImage = `url('/assets/sprites/pieces/white_${pieceKey}.png')`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
  }
};

setPromoPiece('promo-queen', 'queen');
setPromoPiece('promo-rook', 'rook');
setPromoPiece('promo-bishop', 'bishop');
setPromoPiece('promo-knight', 'knight');

const boardUI = new ChessBoardUI('board-container');
const gameController = new GameController(boardUI);

// UI Elements
const mainMenu = document.getElementById('main-menu');
const gameContainer = document.getElementById('game-container');
const btnVsEasy = document.getElementById('btn-vs-computer-easy');
const btnVsHard = document.getElementById('btn-vs-computer-hard');
const btn2Player = document.getElementById('btn-2-player');
const btnMenu = document.getElementById('btn-menu');
const btnUndo = document.getElementById('btn-undo');
const btnRestart = document.getElementById('btn-restart');
const btnRematch = document.getElementById('btn-rematch');

function showGame() {
  if (mainMenu) mainMenu.style.display = 'none';
  if (gameContainer) gameContainer.style.display = 'flex';
}

function showMenu() {
  if (mainMenu) mainMenu.style.display = 'flex';
  if (gameContainer) gameContainer.style.display = 'none';
}

// Start Game Handlers
if (btnVsEasy) {
  btnVsEasy.addEventListener('click', () => {
    gameController.setAIMode('easy');
    gameController.restart();
    showGame();
  });
}

if (btnVsHard) {
  btnVsHard.addEventListener('click', () => {
    gameController.setAIMode('hard');
    gameController.restart();
    showGame();
  });
}

if (btn2Player) {
  btn2Player.addEventListener('click', () => {
    gameController.setAIMode('none');
    gameController.restart();
    showGame();
  });
}

// Resume?
// In a full implementation, GameController would load the FEN from SaveManager here.
// For now we just implement the UI flow.
if (btnMenu) {
  btnMenu.addEventListener('click', () => {
    showMenu();
  });
}

if (btnUndo) {
  btnUndo.addEventListener('click', () => gameController.undo());
}

if (btnRestart) {
  btnRestart.addEventListener('click', () => gameController.restart());
}

if (btnRematch) {
  btnRematch.addEventListener('click', () => gameController.restart());
}

// Initial show
showMenu();
