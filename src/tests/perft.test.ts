import { describe, it, expect } from 'vitest';
import { createStartingPosition } from '../chess/Fen';
import { perft } from '../chess/Perft';

describe('Perft', () => {
  it('should match known node counts for the starting position', () => {
    const pos = createStartingPosition();
    
    // Depth 1 = 20
    expect(perft(pos, 1)).toBe(20);
    
    // Depth 2 = 400
    expect(perft(pos, 2)).toBe(400);
    
    // Depth 3 = 8,902
    expect(perft(pos, 3)).toBe(8902);
    
    // Depth 4 = 197,281
    // Disable in normal fast tests or increase timeout, it might take a moment but should be < 1s usually.
    expect(perft(pos, 4)).toBe(197281);
  });
});
