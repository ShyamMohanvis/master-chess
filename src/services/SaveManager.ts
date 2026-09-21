const SAVE_KEY = "chess_master_save_v1";

export interface SaveData {
  fen: string;
  aiMode: 'none' | 'easy' | 'hard';
  settings: {
    sound: boolean;
    animations: boolean;
    legalMoves: boolean;
    coordinates: boolean;
  };
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  };
}

const DEFAULT_SAVE: SaveData = {
  fen: "",
  aiMode: 'hard',
  settings: {
    sound: true,
    animations: true,
    legalMoves: true,
    coordinates: true
  },
  stats: {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0
  }
};

export class SaveManager {
  static load(): SaveData {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (data) {
        return { ...DEFAULT_SAVE, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error("Failed to load save", e);
    }
    return { ...DEFAULT_SAVE };
  }

  static save(data: SaveData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save", e);
    }
  }
}
