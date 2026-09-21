import './styles/board.css';
import { ChessBoardUI } from './ui/ChessBoard';
import { GameController } from './game/GameController';

// ─────────────────────────────────────────────
// Sound Effects (Web Audio API — no files needed)
// ─────────────────────────────────────────────
const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (_) { /* silently fail if audio blocked */ }
}

export const SFX = {
  move() {
    // Short woody "click" — two quick tones
    playTone(600, 0.06, 'triangle', 0.25);
    setTimeout(() => playTone(500, 0.08, 'triangle', 0.18), 30);
  },
  capture() {
    // Heavier thud
    playTone(220, 0.1, 'sawtooth', 0.3);
    setTimeout(() => playTone(150, 0.2, 'sine', 0.2), 40);
  },
  check() {
    // Alert ding-dong
    playTone(880, 0.15, 'sine', 0.4);
    setTimeout(() => playTone(660, 0.25, 'sine', 0.3), 120);
  },
  gameOver() {
    // Descending fanfare
    [440, 370, 294, 220].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.35, 'sine', 0.35), i * 180);
    });
  },
  illegal() {
    // Low buzzer
    playTone(120, 0.15, 'sawtooth', 0.2);
  },
};

// ─────────────────────────────────────────────
// Promotion piece images
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Board + controller
// ─────────────────────────────────────────────
const boardUI = new ChessBoardUI('board-container');
const gameController = new GameController(boardUI);

// Pass SFX to the controller
gameController.setSFX(SFX);

// ─────────────────────────────────────────────
// UI Elements
// ─────────────────────────────────────────────
const mainMenu = document.getElementById('main-menu');
const gameContainer = document.getElementById('game-container');

const panelVsPc = document.getElementById('panel-vs-pc');
const diffEasy   = document.getElementById('btn-vs-computer-easy');
const diffMedium = document.getElementById('btn-vs-computer-medium');
const diffHard   = document.getElementById('btn-vs-computer-hard');
const btnPlay    = document.getElementById('btn-play');
const btnMenu    = document.getElementById('btn-menu');
const btnUndo    = document.getElementById('btn-undo');
const btnRestart = document.getElementById('btn-restart');
const btnRematch = document.getElementById('btn-rematch');

let selectedDifficulty: 'easy' | 'medium' | 'hard' = 'easy';

function updateMenuUI() {
  if (panelVsPc) panelVsPc.classList.add('selected');
  if (diffEasy)   diffEasy.classList.toggle('active',   selectedDifficulty === 'easy');
  if (diffMedium) diffMedium.classList.toggle('active', selectedDifficulty === 'medium');
  if (diffHard)   diffHard.classList.toggle('active',   selectedDifficulty === 'hard');
}

if (diffEasy)   diffEasy.addEventListener('click',   (e) => { e.stopPropagation(); selectedDifficulty = 'easy';   updateMenuUI(); });
if (diffMedium) diffMedium.addEventListener('click', (e) => { e.stopPropagation(); selectedDifficulty = 'medium'; updateMenuUI(); });
if (diffHard)   diffHard.addEventListener('click',   (e) => { e.stopPropagation(); selectedDifficulty = 'hard';   updateMenuUI(); });

function showGame() {
  if (mainMenu)      mainMenu.style.display      = 'none';
  if (gameContainer) gameContainer.style.display = 'flex';
}

function showMenu() {
  if (mainMenu)      mainMenu.style.display      = 'flex';
  if (gameContainer) gameContainer.style.display = 'none';
  updateMenuUI();
}

if (btnPlay) {
  btnPlay.addEventListener('click', () => {
    gameController.setAIMode(selectedDifficulty);
    gameController.restart();
    showGame();
  });
}

if (btnMenu)    btnMenu.addEventListener('click',    () => showMenu());
if (btnUndo)    btnUndo.addEventListener('click',    () => gameController.undo());
if (btnRestart) btnRestart.addEventListener('click', () => gameController.restart());
if (btnRematch) btnRematch.addEventListener('click', () => gameController.restart());

// Initial state
showMenu();
