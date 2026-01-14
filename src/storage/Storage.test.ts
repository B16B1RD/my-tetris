/**
 * Storage Tests
 * @module storage/Storage.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Storage, getStorage } from './Storage.ts';
import type { HighScoreEntry } from '../types/index.ts';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
    storage.clearHighScores();
  });

  describe('getHighScores', () => {
    it('should return empty array when no scores exist', () => {
      const scores = storage.getHighScores();
      expect(scores).toEqual([]);
    });

    it('should return scores sorted by score descending', () => {
      storage.addHighScore(createTestEntry('AAA', 1000));
      storage.addHighScore(createTestEntry('BBB', 3000));
      storage.addHighScore(createTestEntry('CCC', 2000));

      const scores = storage.getHighScores();
      expect(scores[0]?.score).toBe(3000);
      expect(scores[1]?.score).toBe(2000);
      expect(scores[2]?.score).toBe(1000);
    });
  });

  describe('addHighScore', () => {
    it('should add a new high score', () => {
      const result = storage.addHighScore(createTestEntry('AAA', 1000));
      expect(result).toBe(true);

      const scores = storage.getHighScores();
      expect(scores).toHaveLength(1);
      expect(scores[0]?.name).toBe('AAA');
      expect(scores[0]?.score).toBe(1000);
    });

    it('should maintain maximum of 10 scores', () => {
      for (let i = 0; i < 15; i++) {
        storage.addHighScore(createTestEntry(`P${i}`, (i + 1) * 1000));
      }

      const scores = storage.getHighScores();
      expect(scores).toHaveLength(10);
      // Highest score should be 15000 (P14)
      expect(scores[0]?.score).toBe(15000);
      // Lowest should be 6000 (P5)
      expect(scores[9]?.score).toBe(6000);
    });
  });

  describe('isHighScore', () => {
    it('should return true for any positive score when list is empty', () => {
      expect(storage.isHighScore(1)).toBe(true);
      expect(storage.isHighScore(100)).toBe(true);
    });

    it('should return false for zero or negative scores', () => {
      expect(storage.isHighScore(0)).toBe(false);
    });

    it('should return true if score beats lowest when list is full', () => {
      for (let i = 0; i < 10; i++) {
        storage.addHighScore(createTestEntry(`P${i}`, (i + 1) * 1000));
      }
      // Lowest is 1000, so 1500 should qualify
      expect(storage.isHighScore(1500)).toBe(true);
      // Score of 500 should not qualify
      expect(storage.isHighScore(500)).toBe(false);
    });

    it('should return true if list is not full', () => {
      storage.addHighScore(createTestEntry('AAA', 10000));
      // Even a lower score should qualify if list has room
      expect(storage.isHighScore(100)).toBe(true);
    });
  });

  describe('getScoreRank', () => {
    it('should return 1 for empty list', () => {
      expect(storage.getScoreRank(1000)).toBe(1);
    });

    it('should return correct rank', () => {
      storage.addHighScore(createTestEntry('AAA', 3000));
      storage.addHighScore(createTestEntry('BBB', 2000));
      storage.addHighScore(createTestEntry('CCC', 1000));

      expect(storage.getScoreRank(4000)).toBe(1);
      expect(storage.getScoreRank(2500)).toBe(2);
      expect(storage.getScoreRank(1500)).toBe(3);
      expect(storage.getScoreRank(500)).toBe(4);
    });

    it('should return null if score does not qualify for full list', () => {
      for (let i = 0; i < 10; i++) {
        storage.addHighScore(createTestEntry(`P${i}`, (i + 1) * 1000));
      }
      // 500 is below lowest (1000)
      expect(storage.getScoreRank(500)).toBe(null);
    });
  });

  describe('createEntry', () => {
    it('should create a valid entry', () => {
      const entry = storage.createEntry('TEST', 5000, 10, 100);
      expect(entry.name).toBe('TEST');
      expect(entry.score).toBe(5000);
      expect(entry.level).toBe(10);
      expect(entry.lines).toBe(100);
      expect(entry.date).toBeDefined();
    });

    it('should use default name for empty string', () => {
      const entry = storage.createEntry('', 1000, 1, 10);
      expect(entry.name).toBe('AAA');
    });
  });

  describe('clearHighScores', () => {
    it('should remove all scores', () => {
      storage.addHighScore(createTestEntry('AAA', 1000));
      storage.addHighScore(createTestEntry('BBB', 2000));

      storage.clearHighScores();

      const scores = storage.getHighScores();
      expect(scores).toEqual([]);
    });
  });

  describe('getStorage singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getStorage();
      const instance2 = getStorage();
      expect(instance1).toBe(instance2);
    });
  });
});

function createTestEntry(name: string, score: number): HighScoreEntry {
  return {
    name,
    score,
    level: Math.floor(score / 1000),
    lines: Math.floor(score / 100),
    date: new Date().toISOString(),
  };
}
