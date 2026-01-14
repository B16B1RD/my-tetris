/**
 * Storage Manager
 * @module storage/Storage
 * @description Manages localStorage operations with error handling for high scores.
 */

import type { HighScoreEntry } from '../types/index.ts';

/** Storage key for high scores */
const HIGH_SCORES_KEY = 'tetris_high_scores';

/** Maximum number of high score entries to keep */
const MAX_HIGH_SCORES = 10;

/** Default player name */
const DEFAULT_PLAYER_NAME = 'AAA';

/**
 * Storage manager for persisting game data to localStorage.
 * Handles high score management with automatic sorting and size limits.
 */
export class Storage {
  /**
   * Get all high scores sorted by score (highest first).
   * @returns Array of high score entries
   */
  getHighScores(): HighScoreEntry[] {
    try {
      const data = localStorage.getItem(HIGH_SCORES_KEY);
      if (!data) {
        return [];
      }
      const parsed: unknown = JSON.parse(data);
      const scores = this.validateScores(parsed);
      return this.sortScores(scores);
    } catch {
      // Return empty array if parsing fails
      return [];
    }
  }

  /**
   * Validate that parsed data is a valid array of HighScoreEntry.
   * Filters out invalid entries.
   */
  private validateScores(data: unknown): HighScoreEntry[] {
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter((entry): entry is HighScoreEntry => this.isValidEntry(entry));
  }

  /**
   * Type guard to check if an object is a valid HighScoreEntry.
   */
  private isValidEntry(entry: unknown): entry is HighScoreEntry {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }
    const obj = entry as Record<string, unknown>;
    return (
      typeof obj.name === 'string' &&
      typeof obj.score === 'number' &&
      typeof obj.level === 'number' &&
      typeof obj.lines === 'number' &&
      typeof obj.date === 'string' &&
      /^[A-Z]{1,10}$/.test(obj.name) &&
      Number.isFinite(obj.score) &&
      Number.isFinite(obj.level) &&
      Number.isFinite(obj.lines) &&
      obj.score >= 0 &&
      obj.score <= Number.MAX_SAFE_INTEGER &&
      obj.level >= 1 &&
      obj.lines >= 0
    );
  }

  /**
   * Add a new high score entry.
   * Maintains top 10 scores, sorted by score descending.
   * @param entry - The high score entry to add
   * @returns true if saved successfully, false otherwise
   */
  addHighScore(entry: HighScoreEntry): boolean {
    try {
      const scores = this.getHighScores();
      scores.push(entry);
      const sortedScores = this.sortScores(scores).slice(0, MAX_HIGH_SCORES);
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(sortedScores));
      return true;
    } catch (error) {
      // Handle quota exceeded error
      if (this.isQuotaExceededError(error)) {
        return this.handleQuotaExceeded(entry);
      }
      return false;
    }
  }

  /**
   * Check if a score qualifies for the high score list.
   * @param score - The score to check
   * @returns true if the score would make the high score list
   */
  isHighScore(score: number): boolean {
    const scores = this.getHighScores();
    if (scores.length < MAX_HIGH_SCORES) {
      return score > 0;
    }
    const lowestScore = scores[scores.length - 1]?.score ?? 0;
    return score > lowestScore;
  }

  /**
   * Get the rank a score would achieve (1-based).
   * @param score - The score to check
   * @returns The rank (1-10) or null if not a high score
   */
  getScoreRank(score: number): number | null {
    const scores = this.getHighScores();
    for (let i = 0; i < scores.length; i++) {
      if (score > (scores[i]?.score ?? 0)) {
        return i + 1;
      }
    }
    if (scores.length < MAX_HIGH_SCORES) {
      return scores.length + 1;
    }
    return null;
  }

  /**
   * Clear all high scores.
   */
  clearHighScores(): void {
    localStorage.removeItem(HIGH_SCORES_KEY);
  }

  /**
   * Create a high score entry from game stats.
   * @param name - Player name (A-Z only, max 10 chars)
   * @param score - Final score (non-negative)
   * @param level - Final level (positive)
   * @param lines - Total lines cleared (non-negative)
   * @returns A new HighScoreEntry
   */
  createEntry(
    name: string,
    score: number,
    level: number,
    lines: number
  ): HighScoreEntry {
    // Sanitize name: uppercase A-Z only, max 10 chars
    const sanitizedName = name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 10) || DEFAULT_PLAYER_NAME;

    // Ensure numeric values are valid
    const safeScore = Math.max(0, Math.floor(score) || 0);
    const safeLevel = Math.max(1, Math.floor(level) || 1);
    const safeLines = Math.max(0, Math.floor(lines) || 0);

    return {
      name: sanitizedName,
      score: safeScore,
      level: safeLevel,
      lines: safeLines,
      date: new Date().toISOString(),
    };
  }

  /**
   * Sort scores by score descending.
   */
  private sortScores(scores: HighScoreEntry[]): HighScoreEntry[] {
    return [...scores].sort((a, b) => b.score - a.score);
  }

  /**
   * Check if an error is a quota exceeded error.
   */
  private isQuotaExceededError(error: unknown): boolean {
    return (
      error instanceof DOMException &&
      (error.code === 22 ||
        error.code === 1014 ||
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }

  /**
   * Handle quota exceeded by removing oldest low scores.
   */
  private handleQuotaExceeded(entry: HighScoreEntry): boolean {
    try {
      // Try to save with fewer entries
      const scores = this.getHighScores();
      scores.push(entry);
      const sortedScores = this.sortScores(scores).slice(0, MAX_HIGH_SCORES - 2);
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(sortedScores));
      return true;
    } catch {
      return false;
    }
  }
}

/** Singleton instance */
let storageInstance: Storage | null = null;

/**
 * Get the storage singleton instance.
 */
export function getStorage(): Storage {
  if (!storageInstance) {
    storageInstance = new Storage();
  }
  return storageInstance;
}
