import './styles/board.css';
import { ChessBoardUI } from './ui/ChessBoard';
import { GameController } from './game/GameController';

/* ═══════════════════════════════════════════
   Sound Effects (Web Audio API — no files needed)
   ═══════════════════════════════════════════ */

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

const SFX = {
  move() {
    playTone(600, 0.06, 'triangle', 0.25);
    setTimeout(() => playTone(500, 0.08, 'triangle', 0.18), 30);
  },
  capture() {
    playTone(220, 0.1, 'sawtooth', 0.3);
    setTimeout(() => playTone(150, 0.2, 'sine', 0.2), 40);
  },
  check() {
    playTone(880, 0.15, 'sine', 0.4);
    setTimeout(() => playTone(660, 0.25, 'sine', 0.3), 120);
  },
  gameOver() {
    [440, 370, 294, 220].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.35, 'sine', 0.35), i * 180);
    });
  },
  illegal() {
    playTone(120, 0.15, 'sawtooth', 0.2);
  },
};

/* ═══════════════════════════════════════════
   Board + Controller (created once)
   ═══════════════════════════════════════════ */

const boardUI = new ChessBoardUI('board-container');
const gameController = new GameController(boardUI);
gameController.setSFX(SFX);

/* ═══════════════════════════════════════════
   DOM Elements
   ═══════════════════════════════════════════ */

const mainMenu       = document.getElementById('main-menu')!;
const gameContainer   = document.getElementById('game-container')!;
const diffModal       = document.getElementById('difficulty-modal')!;
const ingameMenuModal = document.getElementById('ingame-menu-modal')!;
const howtoplayModal  = document.getElementById('howtoplay-modal')!;
const gameOverModal   = document.getElementById('game-over-modal')!;

// Main menu
const btnPlay = document.getElementById('btn-play')!;

// Difficulty modal
const diffEasy   = document.getElementById('diff-easy')!;
const diffMedium = document.getElementById('diff-medium')!;
const diffHard   = document.getElementById('diff-hard')!;

// Game header
const btnMenu    = document.getElementById('btn-menu')!;
const btnUndo    = document.getElementById('btn-undo')!;
const btnRestart = document.getElementById('btn-restart')!;

// Game over modal
const btnRematch = document.getElementById('btn-rematch')!;
const btnGoMenu  = document.getElementById('btn-go-menu')!;

// In-game menu modal
const igmResume    = document.getElementById('igm-resume')!;
const igmRestart   = document.getElementById('igm-restart')!;
const igmHowToPlay = document.getElementById('igm-howtoplay')!;
const igmMainMenu  = document.getElementById('igm-mainmenu')!;

// How to play modal
const htpBack = document.getElementById('htp-back')!;

/* ═══════════════════════════════════════════
   Navigation Helpers
   ═══════════════════════════════════════════ */

function showMainMenu() {
  mainMenu.style.display      = 'flex';
  gameContainer.style.display  = 'none';
  diffModal.style.display      = 'none';
  ingameMenuModal.style.display = 'none';
  howtoplayModal.style.display = 'none';
  gameOverModal.style.display  = 'none';
}

function showGame() {
  mainMenu.style.display      = 'none';
  gameContainer.style.display  = 'flex';
  diffModal.style.display      = 'none';
  ingameMenuModal.style.display = 'none';
}

function showDifficultyModal() {
  diffModal.style.display = 'flex';
}

function hideDifficultyModal() {
  diffModal.style.display = 'none';
}

function startGameWithDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
  hideDifficultyModal();
  gameController.setAIMode(difficulty);
  gameController.restart();
  showGame();
}

/* ═══════════════════════════════════════════
   Event Listeners — Main Menu
   ═══════════════════════════════════════════ */

btnPlay.addEventListener('click', () => showDifficultyModal());
btnPlay.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    showDifficultyModal();
  }
});

/* ═══════════════════════════════════════════
   Event Listeners — Difficulty Modal
   ═══════════════════════════════════════════ */

diffEasy.addEventListener('click',   () => startGameWithDifficulty('easy'));
diffMedium.addEventListener('click', () => startGameWithDifficulty('medium'));
diffHard.addEventListener('click',   () => startGameWithDifficulty('hard'));

/* ═══════════════════════════════════════════
   Event Listeners — Game Header
   ═══════════════════════════════════════════ */

btnMenu.addEventListener('click', () => {
  ingameMenuModal.style.display = 'flex';
});

btnUndo.addEventListener('click', () => gameController.undo());
btnRestart.addEventListener('click', () => gameController.restart());

/* ═══════════════════════════════════════════
   Event Listeners — Game Over Modal
   ═══════════════════════════════════════════ */

btnRematch.addEventListener('click', () => {
  gameOverModal.style.display = 'none';
  gameController.restart();
});

btnGoMenu.addEventListener('click', () => {
  gameOverModal.style.display = 'none';
  showMainMenu();
});

/* ═══════════════════════════════════════════
   Event Listeners — In-Game Menu Modal
   ═══════════════════════════════════════════ */

igmResume.addEventListener('click', () => {
  ingameMenuModal.style.display = 'none';
});

igmRestart.addEventListener('click', () => {
  ingameMenuModal.style.display = 'none';
  gameController.restart();
});

igmHowToPlay.addEventListener('click', () => {
  ingameMenuModal.style.display = 'none';
  howtoplayModal.style.display = 'flex';
});

igmMainMenu.addEventListener('click', () => {
  ingameMenuModal.style.display = 'none';
  showMainMenu();
});

/* ═══════════════════════════════════════════
   Event Listeners — How to Play Modal
   ═══════════════════════════════════════════ */

htpBack.addEventListener('click', () => {
  howtoplayModal.style.display = 'none';
  ingameMenuModal.style.display = 'flex';
});

/* ═══════════════════════════════════════════
   Event Listeners — Keyboard (Accessibility)
   ═══════════════════════════════════════════ */

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // If difficulty modal is open, close it
    if (diffModal.style.display === 'flex') {
      hideDifficultyModal();
    }
    // If in-game menu is open, resume game
    else if (ingameMenuModal.style.display === 'flex') {
      ingameMenuModal.style.display = 'none';
    }
    // If how-to-play is open via in-game menu, go back to in-game menu
    else if (howtoplayModal.style.display === 'flex') {
      howtoplayModal.style.display = 'none';
      if (gameContainer.style.display === 'flex') {
        ingameMenuModal.style.display = 'flex';
      }
    }
    // If game is active and no modal is open, open in-game menu
    else if (gameContainer.style.display === 'flex' && gameOverModal.style.display !== 'flex') {
      ingameMenuModal.style.display = 'flex';
    }
  }
});

/* ═══════════════════════════════════════════
   Initial State
   ═══════════════════════════════════════════ */

showMainMenu();
