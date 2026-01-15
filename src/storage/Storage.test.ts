/**
 * Storage Tests
 * @module storage/Storage.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Storage, getStorage, MAX_REPLAYS } from './Storage.ts';
import type { HighScoreEntry, ReplayData } from '../types/index.ts';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
    storage.clearHighScores();
    storage.clearReplays();
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
        storage.addHighScore(createTestEntry(String.fromCharCode(65 + i), (i + 1) * 1000));
      }

      const scores = storage.getHighScores();
      expect(scores).toHaveLength(10);
      // Highest score should be 15000 (O)
      expect(scores[0]?.score).toBe(15000);
      // Lowest should be 6000 (F)
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
      expect(storage.isHighScore(-1)).toBe(false);
      expect(storage.isHighScore(-100)).toBe(false);
    });

    it('should return true if score beats lowest when list is full', () => {
      for (let i = 0; i < 10; i++) {
        storage.addHighScore(createTestEntry(String.fromCharCode(65 + i), (i + 1) * 1000));
      }
      // Lowest is 1000, so 1500 should qualify
      expect(storage.isHighScore(1500)).toBe(true);
      // Score of 500 should not qualify
      expect(storage.isHighScore(500)).toBe(false);
    });

    it('should return false for score equal to lowest when list is full', () => {
      for (let i = 0; i < 10; i++) {
        storage.addHighScore(createTestEntry(String.fromCharCode(65 + i), (i + 1) * 1000));
      }
      // Lowest is 1000, so exactly 1000 should not qualify (must beat, not tie)
      expect(storage.isHighScore(1000)).toBe(false);
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
        storage.addHighScore(createTestEntry(String.fromCharCode(65 + i), (i + 1) * 1000));
      }
      // 500 is below lowest (1000)
      expect(storage.getScoreRank(500)).toBe(null);
    });

    it('should return next rank for tied scores', () => {
      storage.addHighScore(createTestEntry('AAA', 3000));
      storage.addHighScore(createTestEntry('BBB', 2000));
      storage.addHighScore(createTestEntry('CCC', 1000));

      // Score equal to existing score should rank after it (must beat, not tie)
      expect(storage.getScoreRank(3000)).toBe(2);
      expect(storage.getScoreRank(2000)).toBe(3);
      expect(storage.getScoreRank(1000)).toBe(4);
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
    // Note: Singleton instance is shared across tests, but each test uses a fresh
    // Storage instance created in beforeEach. The singleton test verifies behavior
    // in production usage. Test isolation is maintained because all data operations
    // go through localStorage which is cleared in beforeEach via clearHighScores().
    it('should return the same instance', () => {
      const instance1 = getStorage();
      const instance2 = getStorage();
      expect(instance1).toBe(instance2);
    });
  });

  describe('data validation', () => {
    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('tetris_high_scores', 'invalid json');
      const scores = storage.getHighScores();
      expect(scores).toEqual([]);
    });

    it('should filter out entries with missing fields', () => {
      const invalidData = [
        { name: 'AAA', score: 1000 }, // missing level, lines, date
        { name: 'BBB', score: 2000, level: 2, lines: 20, date: '2024-01-01' },
      ];
      localStorage.setItem('tetris_high_scores', JSON.stringify(invalidData));

      const scores = storage.getHighScores();
      expect(scores).toHaveLength(1);
      expect(scores[0]?.name).toBe('BBB');
    });

    it('should filter out entries with wrong types', () => {
      const invalidData = [
        { name: 123, score: 1000, level: 1, lines: 10, date: '2024-01-01' }, // name should be string
        { name: 'BBB', score: '2000', level: 2, lines: 20, date: '2024-01-01' }, // score should be number
        { name: 'CCC', score: 3000, level: 3, lines: 30, date: '2024-01-01' }, // valid
      ];
      localStorage.setItem('tetris_high_scores', JSON.stringify(invalidData));

      const scores = storage.getHighScores();
      expect(scores).toHaveLength(1);
      expect(scores[0]?.name).toBe('CCC');
    });

    it('should filter out entries with empty name', () => {
      const invalidData = [
        { name: '', score: 1000, level: 1, lines: 10, date: '2024-01-01' },
        { name: 'BBB', score: 2000, level: 2, lines: 20, date: '2024-01-01' },
      ];
      localStorage.setItem('tetris_high_scores', JSON.stringify(invalidData));

      const scores = storage.getHighScores();
      expect(scores).toHaveLength(1);
      expect(scores[0]?.name).toBe('BBB');
    });

    it('should filter out entries with NaN or Infinity', () => {
      // Note: JSON.stringify converts NaN to null and Infinity to null.
      // This test verifies that isValidEntry correctly rejects these null values
      // when they appear in parsed JSON data (type check fails: null is not a number).
      const invalidData = [
        { name: 'AAA', score: NaN, level: 1, lines: 10, date: '2024-01-01' },
        { name: 'BBB', score: Infinity, level: 2, lines: 20, date: '2024-01-01' },
        { name: 'CCC', score: 3000, level: 3, lines: 30, date: '2024-01-01' },
      ];
      localStorage.setItem('tetris_high_scores', JSON.stringify(invalidData));

      const scores = storage.getHighScores();
      expect(scores).toHaveLength(1);
      expect(scores[0]?.name).toBe('CCC');
    });

    it('should return empty array when localStorage contains non-array', () => {
      localStorage.setItem('tetris_high_scores', JSON.stringify({ not: 'array' }));
      const scores = storage.getHighScores();
      expect(scores).toEqual([]);
    });
  });

  describe('createEntry input validation', () => {
    it('should sanitize name to uppercase A-Z only', () => {
      const entry = storage.createEntry('a1b2c3', 1000, 1, 10);
      expect(entry.name).toBe('ABC');
    });

    it('should truncate long names to 10 characters', () => {
      const entry = storage.createEntry('ABCDEFGHIJKLMNOP', 1000, 1, 10);
      expect(entry.name).toBe('ABCDEFGHIJ');
      expect(entry.name.length).toBe(10);
    });

    it('should handle negative scores as zero', () => {
      const entry = storage.createEntry('AAA', -100, 1, 10);
      expect(entry.score).toBe(0);
    });

    it('should handle negative level as 1', () => {
      const entry = storage.createEntry('AAA', 1000, -5, 10);
      expect(entry.level).toBe(1);
    });

    it('should handle negative lines as zero', () => {
      const entry = storage.createEntry('AAA', 1000, 1, -10);
      expect(entry.lines).toBe(0);
    });

    it('should handle NaN values gracefully', () => {
      const entry = storage.createEntry('AAA', NaN, NaN, NaN);
      expect(entry.score).toBe(0);
      expect(entry.level).toBe(1);
      expect(entry.lines).toBe(0);
    });

    it('should floor decimal values', () => {
      const entry = storage.createEntry('AAA', 1000.7, 5.9, 50.3);
      expect(entry.score).toBe(1000);
      expect(entry.level).toBe(5);
      expect(entry.lines).toBe(50);
    });
  });

  describe('boundary values', () => {
    it('should handle score of zero', () => {
      expect(storage.isHighScore(0)).toBe(false);
    });

    it('should handle very large scores', () => {
      const largeScore = Number.MAX_SAFE_INTEGER;
      storage.addHighScore(createTestEntry('AAA', largeScore));
      const scores = storage.getHighScores();
      expect(scores[0]?.score).toBe(largeScore);
    });

    it('should maintain order for same scores', () => {
      // Note: This test relies on Array.prototype.sort being stable (same-value
      // elements maintain their relative order). ECMAScript 2019 (ES10) guarantees
      // stable sort for arrays. All modern browsers and Node.js 12+ support this.
      storage.addHighScore(createTestEntry('AAA', 1000));
      storage.addHighScore(createTestEntry('BBB', 1000));
      storage.addHighScore(createTestEntry('CCC', 1000));

      const scores = storage.getHighScores();
      expect(scores).toHaveLength(3);
      // All have score 1000 - verify stable sort maintains insertion order
      expect(scores[0]?.name).toBe('AAA');
      expect(scores[1]?.name).toBe('BBB');
      expect(scores[2]?.name).toBe('CCC');
    });
  });

  describe('localStorage error handling', () => {
    it('should return empty array when localStorage.getItem throws', () => {
      const originalGetItem = localStorage.getItem.bind(localStorage);
      try {
        localStorage.getItem = (): string | null => {
          throw new Error('Storage error');
        };

        const scores = storage.getHighScores();
        expect(scores).toEqual([]);
      } finally {
        localStorage.getItem = originalGetItem;
      }
    });

    it('should handle corrupted data gracefully', () => {
      // Test with null values in array
      localStorage.setItem('tetris_high_scores', JSON.stringify([null, undefined]));
      const scores = storage.getHighScores();
      expect(scores).toEqual([]);
    });

    it('should handle deeply nested invalid structures', () => {
      const nestedInvalid = [
        { name: 'AAA', score: { nested: 1000 }, level: 1, lines: 10, date: '2024-01-01' },
      ];
      localStorage.setItem('tetris_high_scores', JSON.stringify(nestedInvalid));
      const scores = storage.getHighScores();
      expect(scores).toEqual([]);
    });

    it('should return false when localStorage.setItem throws non-quota error', () => {
      // Create mock localStorage with throwing setItem
      const originalLocalStorage = globalThis.localStorage;
      const mockLocalStorage = {
        ...originalLocalStorage,
        getItem: originalLocalStorage.getItem.bind(originalLocalStorage),
        setItem: (): void => {
          throw new Error('Generic storage error');
        },
        removeItem: originalLocalStorage.removeItem.bind(originalLocalStorage),
        clear: originalLocalStorage.clear.bind(originalLocalStorage),
        key: originalLocalStorage.key.bind(originalLocalStorage),
        length: originalLocalStorage.length,
      };
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        configurable: true,
      });

      try {
        const testStorage = new Storage();
        const result = testStorage.addHighScore(createTestEntry('AAA', 1000));
        expect(result).toBe(false);
      } finally {
        Object.defineProperty(globalThis, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
        });
      }
    });

    it('should attempt recovery when QuotaExceededError occurs', () => {
      let callCount = 0;
      const originalLocalStorage = globalThis.localStorage;
      const originalSetItem = originalLocalStorage.setItem.bind(originalLocalStorage);

      const mockLocalStorage = {
        ...originalLocalStorage,
        getItem: originalLocalStorage.getItem.bind(originalLocalStorage),
        setItem: (key: string, value: string): void => {
          callCount++;
          if (callCount === 1) {
            const error = new DOMException('Quota exceeded', 'QuotaExceededError');
            throw error;
          }
          originalSetItem(key, value);
        },
        removeItem: originalLocalStorage.removeItem.bind(originalLocalStorage),
        clear: originalLocalStorage.clear.bind(originalLocalStorage),
        key: originalLocalStorage.key.bind(originalLocalStorage),
        length: originalLocalStorage.length,
      };
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        configurable: true,
      });

      try {
        const testStorage = new Storage();
        const result = testStorage.addHighScore(createTestEntry('AAA', 1000));
        expect(result).toBe(true);
        expect(callCount).toBe(2);
      } finally {
        Object.defineProperty(globalThis, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
        });
      }
    });

    it('should return false when QuotaExceededError recovery also fails', () => {
      const originalLocalStorage = globalThis.localStorage;
      const mockLocalStorage = {
        ...originalLocalStorage,
        getItem: originalLocalStorage.getItem.bind(originalLocalStorage),
        setItem: (): void => {
          const error = new DOMException('Quota exceeded', 'QuotaExceededError');
          throw error;
        },
        removeItem: originalLocalStorage.removeItem.bind(originalLocalStorage),
        clear: originalLocalStorage.clear.bind(originalLocalStorage),
        key: originalLocalStorage.key.bind(originalLocalStorage),
        length: originalLocalStorage.length,
      };
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        configurable: true,
      });

      try {
        const testStorage = new Storage();
        const result = testStorage.addHighScore(createTestEntry('AAA', 1000));
        expect(result).toBe(false);
      } finally {
        Object.defineProperty(globalThis, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
        });
      }
    });
  });

  // ============================================================
  // Replay Storage Tests
  // ============================================================

  describe('Replay Storage', () => {
    describe('getReplays', () => {
      it('should return empty array when no replays exist', () => {
        const replays = storage.getReplays();
        expect(replays).toEqual([]);
      });

      it('should return replays sorted by date (newest first)', () => {
        storage.saveReplay(createTestReplay('r1', 1000, '2024-01-01T00:00:00Z'));
        storage.saveReplay(createTestReplay('r2', 2000, '2024-01-03T00:00:00Z'));
        storage.saveReplay(createTestReplay('r3', 3000, '2024-01-02T00:00:00Z'));

        const replays = storage.getReplays();
        expect(replays[0]?.id).toBe('r2');
        expect(replays[1]?.id).toBe('r3');
        expect(replays[2]?.id).toBe('r1');
      });
    });

    describe('saveReplay', () => {
      it('should save a new replay', () => {
        const result = storage.saveReplay(createTestReplay('r1', 1000));
        expect(result).toBe(true);

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r1');
      });

      it('should maintain maximum of MAX_REPLAYS', () => {
        for (let i = 0; i < MAX_REPLAYS + 3; i++) {
          storage.saveReplay(
            createTestReplay(`r${i}`, 1000, `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`)
          );
        }

        const replays = storage.getReplays();
        expect(replays).toHaveLength(MAX_REPLAYS);
        // Newest replays should be kept
        expect(replays[0]?.id).toBe(`r${MAX_REPLAYS + 2}`);
      });

      it('should replace existing replay with same ID', () => {
        storage.saveReplay(createTestReplay('r1', 1000));
        storage.saveReplay(createTestReplay('r1', 2000));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.finalScore).toBe(2000);
      });
    });

    describe('getReplayById', () => {
      it('should return replay by ID', () => {
        storage.saveReplay(createTestReplay('r1', 1000));
        storage.saveReplay(createTestReplay('r2', 2000));

        const replay = storage.getReplayById('r1');
        expect(replay).not.toBeNull();
        expect(replay?.id).toBe('r1');
      });

      it('should return null for non-existent ID', () => {
        const replay = storage.getReplayById('nonexistent');
        expect(replay).toBeNull();
      });
    });

    describe('deleteReplay', () => {
      it('should delete replay by ID', () => {
        storage.saveReplay(createTestReplay('r1', 1000));
        storage.saveReplay(createTestReplay('r2', 2000));

        const result = storage.deleteReplay('r1');
        expect(result).toBe(true);

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });

      it('should return false for non-existent ID', () => {
        const result = storage.deleteReplay('nonexistent');
        expect(result).toBe(false);
      });
    });

    describe('clearReplays', () => {
      it('should remove all replays', () => {
        storage.saveReplay(createTestReplay('r1', 1000));
        storage.saveReplay(createTestReplay('r2', 2000));

        storage.clearReplays();

        const replays = storage.getReplays();
        expect(replays).toEqual([]);
      });
    });

    describe('QuotaExceededError handling for replays', () => {
      it('should attempt recovery when QuotaExceededError occurs', () => {
        let callCount = 0;
        const originalLocalStorage = globalThis.localStorage;
        const originalSetItem = originalLocalStorage.setItem.bind(originalLocalStorage);

        const mockLocalStorage = {
          ...originalLocalStorage,
          getItem: originalLocalStorage.getItem.bind(originalLocalStorage),
          setItem: (key: string, value: string): void => {
            callCount++;
            if (callCount === 1) {
              const error = new DOMException('Quota exceeded', 'QuotaExceededError');
              throw error;
            }
            originalSetItem(key, value);
          },
          removeItem: originalLocalStorage.removeItem.bind(originalLocalStorage),
          clear: originalLocalStorage.clear.bind(originalLocalStorage),
          key: originalLocalStorage.key.bind(originalLocalStorage),
          length: originalLocalStorage.length,
        };
        Object.defineProperty(globalThis, 'localStorage', {
          value: mockLocalStorage,
          configurable: true,
        });

        try {
          const testStorage = new Storage();
          const result = testStorage.saveReplay(createTestReplay('r1', 1000));
          expect(result).toBe(true);
          expect(callCount).toBe(2);
        } finally {
          Object.defineProperty(globalThis, 'localStorage', {
            value: originalLocalStorage,
            configurable: true,
          });
        }
      });

      it('should return false when QuotaExceededError recovery also fails', () => {
        const originalLocalStorage = globalThis.localStorage;
        const mockLocalStorage = {
          ...originalLocalStorage,
          getItem: originalLocalStorage.getItem.bind(originalLocalStorage),
          setItem: (): void => {
            const error = new DOMException('Quota exceeded', 'QuotaExceededError');
            throw error;
          },
          removeItem: originalLocalStorage.removeItem.bind(originalLocalStorage),
          clear: originalLocalStorage.clear.bind(originalLocalStorage),
          key: originalLocalStorage.key.bind(originalLocalStorage),
          length: originalLocalStorage.length,
        };
        Object.defineProperty(globalThis, 'localStorage', {
          value: mockLocalStorage,
          configurable: true,
        });

        try {
          const testStorage = new Storage();
          const result = testStorage.saveReplay(createTestReplay('r1', 1000));
          expect(result).toBe(false);
        } finally {
          Object.defineProperty(globalThis, 'localStorage', {
            value: originalLocalStorage,
            configurable: true,
          });
        }
      });
    });

    describe('replay data validation', () => {
      it('should handle invalid JSON in localStorage', () => {
        localStorage.setItem('tetris_replays', 'invalid json');
        const replays = storage.getReplays();
        expect(replays).toEqual([]);
      });

      it('should filter out replays with missing fields', () => {
        const invalidData = [
          { id: 'r1', seed: 123 }, // missing many fields
          createTestReplay('r2', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });

      it('should filter out replays with invalid events', () => {
        const invalidData = [
          {
            id: 'r1',
            seed: 123,
            events: [{ timestamp: 'invalid', action: 'moveLeft' }],
            finalScore: 1000,
            finalLevel: 1,
            finalLines: 10,
            date: '2024-01-01',
            duration: 60000,
          },
          createTestReplay('r2', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });

      it('should filter out replays with invalid action types', () => {
        const invalidData = [
          {
            id: 'r1',
            seed: 123,
            events: [{ timestamp: 100, action: 'invalidAction' }],
            finalScore: 1000,
            finalLevel: 1,
            finalLines: 10,
            date: '2024-01-01',
            duration: 60000,
          },
          createTestReplay('r2', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });

      it('should filter out replays with negative finalScore', () => {
        const invalidData = [
          {
            id: 'r1',
            seed: 123,
            events: [],
            finalScore: -100,
            finalLevel: 1,
            finalLines: 10,
            date: '2024-01-01',
            duration: 60000,
          },
          createTestReplay('r2', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });

      it('should filter out replays with finalLevel less than 1', () => {
        const invalidData = [
          {
            id: 'r1',
            seed: 123,
            events: [],
            finalScore: 1000,
            finalLevel: 0,
            finalLines: 10,
            date: '2024-01-01',
            duration: 60000,
          },
          createTestReplay('r2', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });

      it('should filter out replays with negative finalLines', () => {
        const invalidData = [
          {
            id: 'r1',
            seed: 123,
            events: [],
            finalScore: 1000,
            finalLevel: 1,
            finalLines: -5,
            date: '2024-01-01',
            duration: 60000,
          },
          createTestReplay('r2', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });

      it('should filter out replays with negative duration', () => {
        const invalidData = [
          {
            id: 'r1',
            seed: 123,
            events: [],
            finalScore: 1000,
            finalLevel: 1,
            finalLines: 10,
            date: '2024-01-01',
            duration: -1000,
          },
          createTestReplay('r2', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });

      it('should filter out replays with negative event timestamps', () => {
        const invalidData = [
          {
            id: 'r1',
            seed: 123,
            events: [{ timestamp: -100, action: 'moveLeft' }],
            finalScore: 1000,
            finalLevel: 1,
            finalLines: 10,
            date: '2024-01-01',
            duration: 60000,
          },
          createTestReplay('r2', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });

      it('should filter out replays with invalid date format', () => {
        const invalidData = [
          {
            id: 'r1',
            seed: 123,
            events: [],
            finalScore: 1000,
            finalLevel: 1,
            finalLines: 10,
            date: 'not-a-valid-date',
            duration: 60000,
          },
          {
            id: 'r2',
            seed: 123,
            events: [],
            finalScore: 1000,
            finalLevel: 1,
            finalLines: 10,
            date: '',
            duration: 60000,
          },
          createTestReplay('r3', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r3');
      });

      it('should filter out replays with empty ID', () => {
        const invalidData = [
          {
            id: '',
            seed: 123,
            events: [],
            finalScore: 1000,
            finalLevel: 1,
            finalLines: 10,
            date: '2024-01-01T00:00:00Z',
            duration: 60000,
          },
          createTestReplay('r2', 2000),
        ];
        localStorage.setItem('tetris_replays', JSON.stringify(invalidData));

        const replays = storage.getReplays();
        expect(replays).toHaveLength(1);
        expect(replays[0]?.id).toBe('r2');
      });
    });
  });
});

// ============================================================
// Statistics Storage Tests
// ============================================================

describe('Statistics Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
    storage.clearStatistics();
  });

  describe('getStatistics', () => {
    it('should return default statistics when none exist', () => {
      const stats = storage.getStatistics();
      expect(stats).toEqual({
        totalPlayTime: 0,
        totalLinesCleared: 0,
        totalTetris: 0,
        highestLevel: 0,
        totalTSpins: 0,
        gamesPlayed: 0,
      });
    });

    it('should return saved statistics', () => {
      const testStats = {
        totalPlayTime: 60000,
        totalLinesCleared: 100,
        totalTetris: 10,
        highestLevel: 15,
        totalTSpins: 5,
        gamesPlayed: 3,
      };
      storage.saveStatistics(testStats);

      const stats = storage.getStatistics();
      expect(stats).toEqual(testStats);
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('tetris_statistics', 'invalid json');
      const stats = storage.getStatistics();
      expect(stats.gamesPlayed).toBe(0);
    });

    it('should validate and sanitize negative values', () => {
      const invalidStats = {
        totalPlayTime: -100,
        totalLinesCleared: -5,
        totalTetris: -1,
        highestLevel: -10,
        totalTSpins: -2,
        gamesPlayed: -3,
      };
      localStorage.setItem('tetris_statistics', JSON.stringify(invalidStats));

      const stats = storage.getStatistics();
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.totalLinesCleared).toBe(0);
      expect(stats.totalTetris).toBe(0);
      expect(stats.highestLevel).toBe(0);
      expect(stats.totalTSpins).toBe(0);
      expect(stats.gamesPlayed).toBe(0);
    });

    it('should validate NaN and Infinity values', () => {
      // Note: JSON.stringify converts NaN to null and Infinity to null
      const invalidStats = {
        totalPlayTime: NaN,
        totalLinesCleared: Infinity,
        totalTetris: -Infinity,
        highestLevel: NaN,
        totalTSpins: Infinity,
        gamesPlayed: NaN,
      };
      localStorage.setItem('tetris_statistics', JSON.stringify(invalidStats));

      const stats = storage.getStatistics();
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.totalLinesCleared).toBe(0);
      expect(stats.totalTetris).toBe(0);
      expect(stats.highestLevel).toBe(0);
      expect(stats.totalTSpins).toBe(0);
      expect(stats.gamesPlayed).toBe(0);
    });

    it('should return defaults when localStorage contains non-object', () => {
      localStorage.setItem('tetris_statistics', JSON.stringify('not an object'));
      const stats = storage.getStatistics();
      expect(stats.gamesPlayed).toBe(0);
    });

    it('should return defaults when localStorage contains null', () => {
      localStorage.setItem('tetris_statistics', JSON.stringify(null));
      const stats = storage.getStatistics();
      expect(stats.gamesPlayed).toBe(0);
    });

    it('should floor decimal values', () => {
      const decimalStats = {
        totalPlayTime: 1000.7,
        totalLinesCleared: 50.9,
        totalTetris: 5.5,
        highestLevel: 10.3,
        totalTSpins: 3.1,
        gamesPlayed: 2.8,
      };
      localStorage.setItem('tetris_statistics', JSON.stringify(decimalStats));

      const stats = storage.getStatistics();
      expect(stats.totalPlayTime).toBe(1000);
      expect(stats.totalLinesCleared).toBe(50);
      expect(stats.totalTetris).toBe(5);
      expect(stats.highestLevel).toBe(10);
      expect(stats.totalTSpins).toBe(3);
      expect(stats.gamesPlayed).toBe(2);
    });
  });

  describe('saveStatistics', () => {
    it('should save statistics successfully', () => {
      const testStats = {
        totalPlayTime: 60000,
        totalLinesCleared: 100,
        totalTetris: 10,
        highestLevel: 15,
        totalTSpins: 5,
        gamesPlayed: 3,
      };
      const result = storage.saveStatistics(testStats);
      expect(result).toBe(true);
    });

    it('should return false when localStorage throws non-quota error', () => {
      const originalLocalStorage = globalThis.localStorage;
      const mockLocalStorage = {
        ...originalLocalStorage,
        getItem: originalLocalStorage.getItem.bind(originalLocalStorage),
        setItem: (): void => {
          throw new Error('Generic storage error');
        },
        removeItem: originalLocalStorage.removeItem.bind(originalLocalStorage),
        clear: originalLocalStorage.clear.bind(originalLocalStorage),
        key: originalLocalStorage.key.bind(originalLocalStorage),
        length: originalLocalStorage.length,
      };
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        configurable: true,
      });

      try {
        const testStorage = new Storage();
        const result = testStorage.saveStatistics({
          totalPlayTime: 1000,
          totalLinesCleared: 10,
          totalTetris: 1,
          highestLevel: 5,
          totalTSpins: 0,
          gamesPlayed: 1,
        });
        expect(result).toBe(false);
      } finally {
        Object.defineProperty(globalThis, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
        });
      }
    });

    it('should return false when QuotaExceededError occurs', () => {
      const originalLocalStorage = globalThis.localStorage;
      const mockLocalStorage = {
        ...originalLocalStorage,
        getItem: originalLocalStorage.getItem.bind(originalLocalStorage),
        setItem: (): void => {
          const error = new DOMException('Quota exceeded', 'QuotaExceededError');
          throw error;
        },
        removeItem: originalLocalStorage.removeItem.bind(originalLocalStorage),
        clear: originalLocalStorage.clear.bind(originalLocalStorage),
        key: originalLocalStorage.key.bind(originalLocalStorage),
        length: originalLocalStorage.length,
      };
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        configurable: true,
      });

      try {
        const testStorage = new Storage();
        const result = testStorage.saveStatistics({
          totalPlayTime: 1000,
          totalLinesCleared: 10,
          totalTetris: 1,
          highestLevel: 5,
          totalTSpins: 0,
          gamesPlayed: 1,
        });
        expect(result).toBe(false);
      } finally {
        Object.defineProperty(globalThis, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
        });
      }
    });
  });

  describe('updateStatistics', () => {
    it('should accumulate statistics correctly', () => {
      storage.updateStatistics(1000, 10, 2, 5, 1);
      storage.updateStatistics(2000, 20, 1, 3, 2);

      const stats = storage.getStatistics();
      expect(stats.totalPlayTime).toBe(3000);
      expect(stats.totalLinesCleared).toBe(30);
      expect(stats.totalTetris).toBe(3);
      expect(stats.totalTSpins).toBe(3);
      expect(stats.gamesPlayed).toBe(2);
    });

    it('should track highest level correctly', () => {
      storage.updateStatistics(1000, 10, 1, 15, 1);
      storage.updateStatistics(2000, 20, 2, 10, 2);
      storage.updateStatistics(3000, 30, 3, 20, 3);

      const stats = storage.getStatistics();
      expect(stats.highestLevel).toBe(20); // max of 15, 10, 20
    });

    it('should handle negative inputs safely', () => {
      // updateStatistics uses Math.max(0, value) for playTime, lines, tetris, tspin
      // to ensure negative values don't corrupt statistics. However, gamesPlayed
      // always increments by 1 per call regardless of input values, as it counts
      // the number of game sessions completed (not a user-provided value).
      storage.updateStatistics(-100, -10, -1, -5, -1);

      const stats = storage.getStatistics();
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.totalLinesCleared).toBe(0);
      expect(stats.totalTetris).toBe(0);
      expect(stats.totalTSpins).toBe(0);
      expect(stats.gamesPlayed).toBe(1); // Always increments: counts sessions, not user input
    });

    it('should handle zero level correctly', () => {
      storage.updateStatistics(1000, 10, 1, 0, 1);

      const stats = storage.getStatistics();
      expect(stats.highestLevel).toBe(0); // max(0, 0) = 0
    });

    it('should maintain highestLevel when lower level is provided', () => {
      // First game reaches level 15
      storage.updateStatistics(1000, 10, 1, 15, 1);
      expect(storage.getStatistics().highestLevel).toBe(15);

      // Second game only reaches level 5 - highestLevel should remain 15
      storage.updateStatistics(2000, 20, 2, 5, 2);
      expect(storage.getStatistics().highestLevel).toBe(15);

      // Third game reaches level 20 - highestLevel should update to 20
      storage.updateStatistics(3000, 30, 3, 20, 3);
      expect(storage.getStatistics().highestLevel).toBe(20);
    });

    it('should handle very large play time', () => {
      const largeTime = Number.MAX_SAFE_INTEGER - 1000;
      storage.updateStatistics(largeTime, 10, 1, 5, 1);

      const stats = storage.getStatistics();
      expect(stats.totalPlayTime).toBe(largeTime);
    });
  });

  describe('clearStatistics', () => {
    it('should reset statistics to defaults', () => {
      storage.updateStatistics(1000, 10, 2, 5, 1);

      storage.clearStatistics();

      const stats = storage.getStatistics();
      expect(stats.gamesPlayed).toBe(0);
      expect(stats.totalPlayTime).toBe(0);
    });
  });

  describe('clearAllData', () => {
    it('should clear high scores, replays, and statistics', () => {
      // Add some data
      storage.addHighScore(createTestEntry('AAA', 1000));
      storage.saveReplay(createTestReplay('r1', 1000));
      storage.updateStatistics(1000, 10, 1, 5, 1);

      storage.clearAllData();

      expect(storage.getHighScores()).toEqual([]);
      expect(storage.getReplays()).toEqual([]);
      expect(storage.getStatistics().gamesPlayed).toBe(0);
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

/**
 * Helper to create test replay data.
 * @param id - Replay identifier
 * @param score - Final score (also used to derive finalLevel and finalLines)
 * @param date - Optional ISO date string
 * @param seed - Optional seed value (defaults to 12345)
 *
 * Note: finalLevel uses `Math.floor(score / 1000) || 1` to ensure minimum level of 1.
 * This means scores 0-999 all result in level 1, which differs from actual game logic
 * but is acceptable for testing purposes.
 */
function createTestReplay(
  id: string,
  score: number,
  date?: string,
  seed = 12345
): ReplayData {
  return {
    id,
    seed,
    events: [
      { timestamp: 100, action: 'moveLeft' },
      { timestamp: 200, action: 'hardDrop' },
    ],
    finalScore: score,
    finalLevel: Math.floor(score / 1000) || 1,
    finalLines: Math.floor(score / 100),
    date: date ?? new Date().toISOString(),
    duration: 60000,
  };
}
