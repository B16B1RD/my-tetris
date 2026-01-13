/**
 * 7-bag Randomizer for Tetris Guideline-compliant piece generation
 * @module game/Randomizer
 * @description Implements the 7-bag randomizer system where all 7 tetrominoes
 * appear exactly once before any piece repeats.
 */

import type { TetrominoType } from '../types/index.ts';
import { ALL_TETROMINO_TYPES } from './Tetromino.ts';

/**
 * Fisher-Yates shuffle algorithm for unbiased randomization.
 * @param array - Array to shuffle (mutates in place)
 * @param random - Random number generator function (returns 0-1)
 * @returns The shuffled array
 */
function shuffle<T>(array: T[], random: () => number = Math.random): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = array[i];
    array[i] = array[j] as T;
    array[j] = temp as T;
  }
  return array;
}

/**
 * Simple seeded random number generator (Linear Congruential Generator).
 * Uses the same parameters as glibc for reproducibility.
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0; // Ensure unsigned 32-bit
  }

  /** Generate next random number between 0 and 1 */
  next(): number {
    // LCG parameters (glibc)
    this.seed = (this.seed * 1103515245 + 12345) >>> 0;
    return (this.seed / 0x100000000) >>> 0
      ? this.seed / 0x100000000
      : this.seed / 0xffffffff;
  }

  /** Get current seed (useful for replay) */
  getSeed(): number {
    return this.seed;
  }
}

/**
 * 7-bag Randomizer implementation.
 *
 * The 7-bag system ensures fair piece distribution by:
 * 1. Creating a "bag" containing all 7 tetromino types
 * 2. Shuffling the bag randomly
 * 3. Drawing pieces from the bag one by one
 * 4. When the bag is empty, creating and shuffling a new bag
 *
 * This guarantees that:
 * - Every piece appears at least once in every 7 pieces
 * - No piece appears more than twice in any 14 consecutive pieces
 */
export class Randomizer {
  private bag: TetrominoType[] = [];
  private previewBag: TetrominoType[] = [];
  private random: () => number;
  private initialSeed: number;

  /**
   * Create a new 7-bag randomizer.
   * @param seed - Optional seed for reproducible sequences (for replays)
   */
  constructor(seed?: number) {
    if (seed !== undefined) {
      const seededRandom = new SeededRandom(seed);
      this.random = (): number => seededRandom.next();
      this.initialSeed = seed;
    } else {
      this.random = Math.random;
      this.initialSeed = Math.floor(Math.random() * 0xffffffff);
    }

    // Initialize bags
    this.fillBag();
    this.fillPreviewBag();
  }

  /**
   * Get the initial seed used for this randomizer.
   * Useful for saving replay data.
   */
  getSeed(): number {
    return this.initialSeed;
  }

  /**
   * Fill the current bag with all 7 tetrominoes and shuffle.
   */
  private fillBag(): void {
    this.bag = shuffle([...ALL_TETROMINO_TYPES], this.random);
  }

  /**
   * Fill the preview bag with all 7 tetrominoes and shuffle.
   */
  private fillPreviewBag(): void {
    this.previewBag = shuffle([...ALL_TETROMINO_TYPES], this.random);
  }

  /**
   * Get the next tetromino type from the bag.
   * @returns The next tetromino type
   */
  next(): TetrominoType {
    // If current bag is empty, swap with preview bag and refill preview
    if (this.bag.length === 0) {
      this.bag = this.previewBag;
      this.fillPreviewBag();
    }

    // bag is guaranteed to have items after the check above
    const piece = this.bag.shift();
    if (piece === undefined) {
      throw new Error('Unexpected empty bag');
    }
    return piece;
  }

  /**
   * Peek at upcoming tetromino types without consuming them.
   * @param count - Number of pieces to preview (1-14)
   * @returns Array of upcoming tetromino types
   */
  peek(count: number): TetrominoType[] {
    const maxPeek = Math.min(count, 14); // Max 2 bags worth
    const result: TetrominoType[] = [];

    // Add from current bag
    for (let i = 0; i < Math.min(maxPeek, this.bag.length); i++) {
      const piece = this.bag[i];
      if (piece !== undefined) {
        result.push(piece);
      }
    }

    // Add from preview bag if needed
    const remaining = maxPeek - result.length;
    for (let i = 0; i < Math.min(remaining, this.previewBag.length); i++) {
      const piece = this.previewBag[i];
      if (piece !== undefined) {
        result.push(piece);
      }
    }

    return result;
  }

  /**
   * Reset the randomizer with a new seed.
   * @param seed - New seed value
   */
  reset(seed?: number): void {
    if (seed !== undefined) {
      const seededRandom = new SeededRandom(seed);
      this.random = (): number => seededRandom.next();
      this.initialSeed = seed;
    } else {
      this.random = Math.random;
      this.initialSeed = Math.floor(Math.random() * 0xffffffff);
    }

    this.fillBag();
    this.fillPreviewBag();
  }
}
