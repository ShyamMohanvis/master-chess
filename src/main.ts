import './styles/board.css';
import { ChessBoardUI } from './ui/ChessBoard';
import { GameController } from './game/GameController';

// Initialize promotion SVGs (now images)
const setPromoPiece = (id: string, pieceKey: string) => {
  const el = document.getElementById(id);
  if (el) {
    const baseUrl = import.meta.env.BASE_URL;
    el.style.backgroundImage = `url('${baseUrl}assets/sprites/pieces/white_${pieceKey}.png')`;
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

// New Menu Elements
const panelVsPc = document.getElementById('panel-vs-pc');
const panelVsMan = document.getElementById('panel-vs-man');
const diffEasy = document.getElementById('btn-vs-computer-easy');
const diffMedium = document.getElementById('btn-vs-computer-medium');
const diffHard = document.getElementById('btn-vs-computer-hard');
const btnPlay = document.getElementById('btn-play');

const btnMenu = document.getElementById('btn-menu');
const btnUndo = document.getElementById('btn-undo');
const btnRestart = document.getElementById('btn-restart');
const btnRematch = document.getElementById('btn-rematch');

let selectedMode: 'pc' | 'local' = 'pc';
let selectedDifficulty: 'easy' | 'medium' | 'hard' = 'easy';

function updateMenuUI() {
  if (panelVsPc) panelVsPc.classList.toggle('selected', selectedMode === 'pc');
  if (panelVsMan) panelVsMan.classList.toggle('selected', selectedMode === 'local');
  
  if (diffEasy) diffEasy.classList.toggle('active', selectedDifficulty === 'easy');
  if (diffMedium) diffMedium.classList.toggle('active', selectedDifficulty === 'medium');
  if (diffHard) diffHard.classList.toggle('active', selectedDifficulty === 'hard');
}

if (panelVsPc) panelVsPc.addEventListener('click', () => { selectedMode = 'pc'; updateMenuUI(); });
if (panelVsMan) panelVsMan.addEventListener('click', () => { selectedMode = 'local'; updateMenuUI(); });

if (diffEasy) diffEasy.addEventListener('click', (e) => { e.stopPropagation(); selectedMode = 'pc'; selectedDifficulty = 'easy'; updateMenuUI(); });
if (diffMedium) diffMedium.addEventListener('click', (e) => { e.stopPropagation(); selectedMode = 'pc'; selectedDifficulty = 'medium'; updateMenuUI(); });
if (diffHard) diffHard.addEventListener('click', (e) => { e.stopPropagation(); selectedMode = 'pc'; selectedDifficulty = 'hard'; updateMenuUI(); });

function showGame() {
  if (mainMenu) mainMenu.style.display = 'none';
  if (gameContainer) gameContainer.style.display = 'flex';
}

function showMenu() {
  if (mainMenu) mainMenu.style.display = 'flex';
  if (gameContainer) gameContainer.style.display = 'none';
  updateMenuUI();
}

// Start Game Handlers
if (btnPlay) {
  btnPlay.addEventListener('click', () => {
    if (selectedMode === 'pc') {
      gameController.setAIMode(selectedDifficulty);
    } else {
      gameController.setAIMode('none');
    }
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
