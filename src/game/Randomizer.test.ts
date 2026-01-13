import { describe, it, expect } from 'vitest';
import { Randomizer, SeededRandom } from './Randomizer.ts';
import { ALL_TETROMINO_TYPES } from './Tetromino.ts';
import type { TetrominoType } from '../types/index.ts';

describe('SeededRandom', () => {
  it('should produce deterministic sequence with same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('should produce different sequences with different seeds', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(54321);

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).not.toEqual(seq2);
  });

  it('should produce values between 0 and 1', () => {
    const rng = new SeededRandom(42);

    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('Randomizer', () => {
  describe('7-bag guarantee', () => {
    it('should produce all 7 types in first 7 pieces', () => {
      const randomizer = new Randomizer(42);
      const first7: TetrominoType[] = [];

      for (let i = 0; i < 7; i++) {
        first7.push(randomizer.next());
      }

      // Should contain all 7 types exactly once
      expect(first7.sort()).toEqual([...ALL_TETROMINO_TYPES].sort());
    });

    it('should produce all 7 types in every bag of 7', () => {
      const randomizer = new Randomizer(123);

      // Check multiple bags
      for (let bag = 0; bag < 10; bag++) {
        const bagPieces: TetrominoType[] = [];
        for (let i = 0; i < 7; i++) {
          bagPieces.push(randomizer.next());
        }
        expect(bagPieces.sort()).toEqual([...ALL_TETROMINO_TYPES].sort());
      }
    });

    it('should guarantee each piece appears at least once per 13 pieces', () => {
      // In 7-bag system, maximum gap between same piece is 12 pieces
      // (end of one bag to start of next bag containing same piece)
      const randomizer = new Randomizer(999);
      const pieces: TetrominoType[] = [];

      // Generate 100 pieces
      for (let i = 0; i < 100; i++) {
        pieces.push(randomizer.next());
      }

      // Check that every window of 13 consecutive pieces contains all types
      for (let i = 0; i <= pieces.length - 13; i++) {
        const window = pieces.slice(i, i + 13);
        ALL_TETROMINO_TYPES.forEach((type) => {
          const count = window.filter((p) => p === type).length;
          expect(count).toBeGreaterThanOrEqual(1);
        });
      }
    });
  });

  describe('seeded randomization', () => {
    it('should produce same sequence with same seed', () => {
      const rng1 = new Randomizer(42);
      const rng2 = new Randomizer(42);

      for (let i = 0; i < 50; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new Randomizer(111);
      const rng2 = new Randomizer(222);

      const seq1 = Array.from({ length: 14 }, () => rng1.next());
      const seq2 = Array.from({ length: 14 }, () => rng2.next());

      // Sequences should be different (extremely unlikely to be same)
      expect(seq1.join('')).not.toBe(seq2.join(''));
    });

    it('should return the initial seed', () => {
      const seed = 12345;
      const randomizer = new Randomizer(seed);
      expect(randomizer.getSeed()).toBe(seed);
    });
  });

  describe('peek', () => {
    it('should preview upcoming pieces without consuming them', () => {
      const randomizer = new Randomizer(42);

      const preview = randomizer.peek(6);
      expect(preview).toHaveLength(6);

      // Next 6 pieces should match preview
      for (let i = 0; i < 6; i++) {
        expect(randomizer.next()).toBe(preview[i]);
      }
    });

    it('should be able to peek across bag boundaries', () => {
      const randomizer = new Randomizer(42);

      // Consume 5 pieces from first bag
      for (let i = 0; i < 5; i++) {
        randomizer.next();
      }

      // Peek should include 2 from current bag and 6 from next
      const preview = randomizer.peek(8);
      expect(preview).toHaveLength(8);

      // Verify preview accuracy
      for (let i = 0; i < 8; i++) {
        expect(randomizer.next()).toBe(preview[i]);
      }
    });

    it('should limit peek to 14 pieces (2 bags)', () => {
      const randomizer = new Randomizer(42);
      const preview = randomizer.peek(20);
      expect(preview.length).toBeLessThanOrEqual(14);
    });
  });

  describe('reset', () => {
    it('should restart with new seed', () => {
      const randomizer = new Randomizer(42);

      // Generate some pieces
      const firstRun: TetrominoType[] = [];
      for (let i = 0; i < 14; i++) {
        firstRun.push(randomizer.next());
      }

      // Reset with same seed
      randomizer.reset(42);

      // Should produce same sequence
      for (let i = 0; i < 14; i++) {
        expect(randomizer.next()).toBe(firstRun[i]);
      }
    });

    it('should update seed after reset', () => {
      const randomizer = new Randomizer(42);
      randomizer.reset(999);
      expect(randomizer.getSeed()).toBe(999);
    });
  });

  describe('unseeded randomization', () => {
    it('should work without seed (using Math.random)', () => {
      const randomizer = new Randomizer();

      // Should still produce valid pieces
      for (let i = 0; i < 7; i++) {
        const piece = randomizer.next();
        expect(ALL_TETROMINO_TYPES).toContain(piece);
      }
    });

    it('should generate a seed when not provided', () => {
      const randomizer = new Randomizer();
      const seed = randomizer.getSeed();

      expect(typeof seed).toBe('number');
      expect(seed).toBeGreaterThanOrEqual(0);
    });
  });
});
