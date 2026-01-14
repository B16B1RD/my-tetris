/**
 * Score Manager
 * @module systems/ScoreManager
 * @description Manages scoring, level progression, and fall speed per Tetris Guideline.
 */

import type { GameStats, LineClearResult, TSpinType } from '../types/index.ts';

/**
 * Score values per action type (multiplied by level).
 * Based on Tetris Guideline scoring system.
 */
const BASE_SCORES: Record<string, number> = {
  // Line clears
  single: 100,
  double: 300,
  triple: 500,
  tetris: 800,
  // T-Spin without line clear
  'tspin-mini': 100,
  tspin: 400,
  // T-Spin with line clears
  'tspin-mini-single': 200,
  'tspin-single': 800,
  'tspin-mini-double': 400,
  'tspin-double': 1200,
  'tspin-triple': 1600,
};

/**
 * Actions that qualify as "difficult" for Back-to-Back bonus.
 */
const DIFFICULT_ACTIONS = new Set([
  'tetris',
  'tspin-mini-single',
  'tspin-single',
  'tspin-mini-double',
  'tspin-double',
  'tspin-triple',
]);

/**
 * Fall speed table (frames per row at 60 FPS).
 * Based on modern Tetris games with exponential speed increase.
 * Index = level - 1 (level 1 at index 0).
 * Values represent milliseconds per gravity drop (1 row).
 */
const FALL_SPEEDS: readonly number[] = [
  1000, // Level 1: 1 second per row
  793, // Level 2
  618, // Level 3
  473, // Level 4
  355, // Level 5
  262, // Level 6
  190, // Level 7
  135, // Level 8
  94, // Level 9
  64, // Level 10
  43, // Level 11
  28, // Level 12
  18, // Level 13
  11, // Level 14
  7, // Level 15+
];

/**
 * Lines required to level up (cumulative).
 * Standard Guideline: 10 lines per level.
 */
const LINES_PER_LEVEL = 10;

/**
 * Combo bonus multiplier (50 × combo × level).
 */
const COMBO_BONUS = 50;

/**
 * Back-to-Back multiplier (1.5x for consecutive difficult clears).
 */
const BACK_TO_BACK_MULTIPLIER = 1.5;

/**
 * Soft drop bonus (1 point per cell dropped).
 */
const SOFT_DROP_BONUS = 1;

/**
 * Hard drop bonus (2 points per cell dropped).
 */
const HARD_DROP_BONUS = 2;

/**
 * Manages game scoring, level progression, and fall speed.
 *
 * Implements Tetris Guideline scoring:
 * - Line clear points × level
 * - T-Spin bonuses
 * - Back-to-Back bonus (1.5x for consecutive difficult clears)
 * - Combo bonus (50 × combo × level)
 * - Drop bonuses (soft/hard)
 *
 * @example
 * ```typescript
 * const scoreManager = new ScoreManager();
 *
 * // Process a line clear
 * const result = { linesCleared: 4, tspinType: 'none', description: 'Tetris' };
 * scoreManager.processLineClear(result);
 *
 * // Add drop bonus
 * scoreManager.addSoftDropBonus(10); // 10 cells soft dropped
 *
 * // Get current state
 * console.log(scoreManager.stats);
 * console.log(scoreManager.fallSpeed);
 * ```
 */
export class ScoreManager {
  private _score = 0;
  private _level = 1;
  private _lines = 0;
  private _combo = -1; // -1 means no active combo (first clear starts at 0)
  private _backToBack = false;

  /**
   * Create a new ScoreManager.
   * @param startLevel - Starting level (default: 1)
   */
  constructor(startLevel = 1) {
    this._level = Math.max(1, startLevel);
  }

  /**
   * Get the current score.
   */
  get score(): number {
    return this._score;
  }

  /**
   * Get the current level.
   */
  get level(): number {
    return this._level;
  }

  /**
   * Get the total lines cleared.
   */
  get lines(): number {
    return this._lines;
  }

  /**
   * Get the current combo count.
   * Returns -1 if no active combo.
   */
  get combo(): number {
    return this._combo;
  }

  /**
   * Check if Back-to-Back is active.
   */
  get backToBack(): boolean {
    return this._backToBack;
  }

  /**
   * Get the current game statistics.
   */
  get stats(): GameStats {
    return {
      score: this._score,
      level: this._level,
      lines: this._lines,
      combo: Math.max(0, this._combo),
      backToBack: this._backToBack,
    };
  }

  /**
   * Get the current fall speed in milliseconds.
   * This is the time between automatic gravity drops (1 row).
   */
  get fallSpeed(): number {
    const index = Math.min(this._level - 1, FALL_SPEEDS.length - 1);
    return FALL_SPEEDS[index] ?? FALL_SPEEDS[FALL_SPEEDS.length - 1]!;
  }

  /**
   * Determine the score action key from line clear result.
   */
  private getActionKey(linesCleared: number, tspinType: TSpinType): string {
    if (tspinType === 'none') {
      switch (linesCleared) {
        case 1:
          return 'single';
        case 2:
          return 'double';
        case 3:
          return 'triple';
        case 4:
          return 'tetris';
        default:
          return '';
      }
    }

    // T-Spin actions
    const prefix = tspinType === 'mini' ? 'tspin-mini' : 'tspin';

    switch (linesCleared) {
      case 0:
        return prefix;
      case 1:
        return `${prefix}-single`;
      case 2:
        return `${prefix}-double`;
      case 3:
        return `${prefix}-triple`;
      default:
        return prefix;
    }
  }

  /**
   * Process a line clear and update score, level, and combo.
   * @param result - The line clear result from the board
   * @returns The points earned from this action
   */
  processLineClear(result: LineClearResult): number {
    const { linesCleared, tspinType } = result;
    const actionKey = this.getActionKey(linesCleared, tspinType);

    // No lines cleared and no T-Spin
    if (!actionKey) {
      // Reset combo on piece lock without line clear
      this._combo = -1;
      return 0;
    }

    // Get base score
    let baseScore = BASE_SCORES[actionKey] ?? 0;

    // Check if this is a difficult action (for Back-to-Back)
    const isDifficult = DIFFICULT_ACTIONS.has(actionKey);

    // Apply Back-to-Back bonus
    if (isDifficult && this._backToBack) {
      baseScore = Math.floor(baseScore * BACK_TO_BACK_MULTIPLIER);
    }

    // Calculate score with level multiplier
    let points = baseScore * this._level;

    // Update Back-to-Back status
    if (linesCleared > 0) {
      if (isDifficult) {
        this._backToBack = true;
      } else {
        // Non-difficult line clear breaks Back-to-Back
        this._backToBack = false;
      }
    }
    // T-Spin without lines doesn't affect Back-to-Back status

    // Update combo
    if (linesCleared > 0) {
      this._combo++;
      // Add combo bonus
      if (this._combo > 0) {
        points += COMBO_BONUS * this._combo * this._level;
      }
    } else {
      // T-Spin without lines doesn't break combo (but doesn't add to it either)
      // Actually, in most Guideline games, only line clears affect combo
      // A piece lock without line clear breaks the combo
      // Since we have a T-Spin here (actionKey exists), we don't reset combo
    }

    // Update total score
    this._score += points;

    // Update lines and level
    if (linesCleared > 0) {
      this._lines += linesCleared;
      this.checkLevelUp();
    }

    return points;
  }

  /**
   * Called when a piece locks without clearing lines.
   * Resets the combo counter.
   */
  onPieceLock(): void {
    // Combo is reset when a piece locks without clearing lines
    // This method should be called by the game when a piece locks
    // The actual reset happens in processLineClear when linesCleared is 0
    // and there's no T-Spin
  }

  /**
   * Reset combo counter (called when piece locks without line clear).
   */
  resetCombo(): void {
    this._combo = -1;
  }

  /**
   * Check if level should increase based on lines cleared.
   */
  private checkLevelUp(): void {
    const targetLevel = Math.floor(this._lines / LINES_PER_LEVEL) + 1;
    if (targetLevel > this._level) {
      this._level = targetLevel;
    }
  }

  /**
   * Add soft drop bonus points.
   * @param cells - Number of cells dropped
   */
  addSoftDropBonus(cells: number): void {
    this._score += cells * SOFT_DROP_BONUS;
  }

  /**
   * Add hard drop bonus points.
   * @param cells - Number of cells dropped
   */
  addHardDropBonus(cells: number): void {
    this._score += cells * HARD_DROP_BONUS;
  }

  /**
   * Reset the score manager to initial state.
   * @param startLevel - Starting level for the new game
   */
  reset(startLevel = 1): void {
    this._score = 0;
    this._level = Math.max(1, startLevel);
    this._lines = 0;
    this._combo = -1;
    this._backToBack = false;
  }

  /**
   * Get the lines needed for the next level.
   */
  get linesToNextLevel(): number {
    const nextLevelLines = this._level * LINES_PER_LEVEL;
    return Math.max(0, nextLevelLines - this._lines);
  }
}
