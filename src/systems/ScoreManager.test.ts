/**
 * ScoreManager Tests
 * @module systems/ScoreManager.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from './ScoreManager.ts';
import type { LineClearResult } from '../types/index.ts';

describe('ScoreManager', () => {
  let scoreManager: ScoreManager;

  beforeEach(() => {
    scoreManager = new ScoreManager();
  });

  describe('initialization', () => {
    it('should start at level 1 with 0 score', () => {
      expect(scoreManager.level).toBe(1);
      expect(scoreManager.score).toBe(0);
      expect(scoreManager.lines).toBe(0);
      expect(scoreManager.combo).toBe(-1);
      expect(scoreManager.backToBack).toBe(false);
    });

    it('should accept custom start level', () => {
      const manager = new ScoreManager(5);
      expect(manager.level).toBe(5);
    });

    it('should enforce minimum level of 1', () => {
      const manager = new ScoreManager(0);
      expect(manager.level).toBe(1);
    });
  });

  describe('line clear scoring', () => {
    it('should score single at 100 × level', () => {
      const result: LineClearResult = {
        linesCleared: 1,
        tspinType: 'none',
        description: 'Single',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(100);
      expect(scoreManager.score).toBe(100);
      expect(scoreManager.lines).toBe(1);
    });

    it('should score double at 300 × level', () => {
      const result: LineClearResult = {
        linesCleared: 2,
        tspinType: 'none',
        description: 'Double',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(300);
      expect(scoreManager.score).toBe(300);
      expect(scoreManager.lines).toBe(2);
    });

    it('should score triple at 500 × level', () => {
      const result: LineClearResult = {
        linesCleared: 3,
        tspinType: 'none',
        description: 'Triple',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(500);
      expect(scoreManager.score).toBe(500);
      expect(scoreManager.lines).toBe(3);
    });

    it('should score tetris at 800 × level', () => {
      const result: LineClearResult = {
        linesCleared: 4,
        tspinType: 'none',
        description: 'Tetris',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(800);
      expect(scoreManager.score).toBe(800);
      expect(scoreManager.lines).toBe(4);
    });

    it('should multiply score by level', () => {
      const manager = new ScoreManager(5);
      const result: LineClearResult = {
        linesCleared: 1,
        tspinType: 'none',
        description: 'Single',
      };
      const points = manager.processLineClear(result);
      expect(points).toBe(500); // 100 × 5
    });
  });

  describe('T-Spin scoring', () => {
    it('should score T-Spin Mini (no lines) at 100 × level', () => {
      const result: LineClearResult = {
        linesCleared: 0,
        tspinType: 'mini',
        description: 'T-Spin Mini',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(100);
    });

    it('should score T-Spin (no lines) at 400 × level', () => {
      const result: LineClearResult = {
        linesCleared: 0,
        tspinType: 'full',
        description: 'T-Spin',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(400);
    });

    it('should score T-Spin Mini Single at 200 × level', () => {
      const result: LineClearResult = {
        linesCleared: 1,
        tspinType: 'mini',
        description: 'T-Spin Mini Single',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(200);
    });

    it('should score T-Spin Single at 800 × level', () => {
      const result: LineClearResult = {
        linesCleared: 1,
        tspinType: 'full',
        description: 'T-Spin Single',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(800);
    });

    it('should score T-Spin Double at 1200 × level', () => {
      const result: LineClearResult = {
        linesCleared: 2,
        tspinType: 'full',
        description: 'T-Spin Double',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(1200);
    });

    it('should score T-Spin Triple at 1600 × level', () => {
      const result: LineClearResult = {
        linesCleared: 3,
        tspinType: 'full',
        description: 'T-Spin Triple',
      };
      const points = scoreManager.processLineClear(result);
      expect(points).toBe(1600);
    });
  });

  describe('Back-to-Back bonus', () => {
    it('should activate Back-to-Back after Tetris', () => {
      const tetris: LineClearResult = {
        linesCleared: 4,
        tspinType: 'none',
        description: 'Tetris',
      };
      scoreManager.processLineClear(tetris);
      expect(scoreManager.backToBack).toBe(true);
    });

    it('should apply 1.5x bonus for consecutive Tetris', () => {
      const tetris: LineClearResult = {
        linesCleared: 4,
        tspinType: 'none',
        description: 'Tetris',
      };
      scoreManager.processLineClear(tetris); // First Tetris: 800
      expect(scoreManager.backToBack).toBe(true);

      const points = scoreManager.processLineClear(tetris); // B2B Tetris: 800 × 1.5 + combo
      // 800 × 1.5 = 1200, combo is 1, so +50
      expect(points).toBe(1250);
    });

    it('should break Back-to-Back on non-difficult clear', () => {
      const tetris: LineClearResult = {
        linesCleared: 4,
        tspinType: 'none',
        description: 'Tetris',
      };
      const single: LineClearResult = {
        linesCleared: 1,
        tspinType: 'none',
        description: 'Single',
      };

      scoreManager.processLineClear(tetris);
      expect(scoreManager.backToBack).toBe(true);

      scoreManager.processLineClear(single);
      expect(scoreManager.backToBack).toBe(false);
    });

    it('should activate Back-to-Back on T-Spin with lines', () => {
      const tspinDouble: LineClearResult = {
        linesCleared: 2,
        tspinType: 'full',
        description: 'T-Spin Double',
      };
      scoreManager.processLineClear(tspinDouble);
      expect(scoreManager.backToBack).toBe(true);
    });

    it('should not break Back-to-Back on T-Spin without lines', () => {
      const tetris: LineClearResult = {
        linesCleared: 4,
        tspinType: 'none',
        description: 'Tetris',
      };
      const tspin: LineClearResult = {
        linesCleared: 0,
        tspinType: 'full',
        description: 'T-Spin',
      };

      scoreManager.processLineClear(tetris);
      expect(scoreManager.backToBack).toBe(true);

      scoreManager.processLineClear(tspin);
      expect(scoreManager.backToBack).toBe(true); // Still active
    });
  });

  describe('combo system', () => {
    it('should start combo at 0 on first line clear', () => {
      const single: LineClearResult = {
        linesCleared: 1,
        tspinType: 'none',
        description: 'Single',
      };
      scoreManager.processLineClear(single);
      expect(scoreManager.combo).toBe(0);
    });

    it('should increment combo on consecutive line clears', () => {
      const single: LineClearResult = {
        linesCleared: 1,
        tspinType: 'none',
        description: 'Single',
      };

      scoreManager.processLineClear(single);
      expect(scoreManager.combo).toBe(0);

      scoreManager.processLineClear(single);
      expect(scoreManager.combo).toBe(1);

      scoreManager.processLineClear(single);
      expect(scoreManager.combo).toBe(2);
    });

    it('should add combo bonus (50 × combo × level)', () => {
      const single: LineClearResult = {
        linesCleared: 1,
        tspinType: 'none',
        description: 'Single',
      };

      scoreManager.processLineClear(single); // 100, combo 0
      const points = scoreManager.processLineClear(single); // 100 + 50×1×1 = 150
      expect(points).toBe(150);
    });

    it('should reset combo when processing zero lines without T-Spin', () => {
      const single: LineClearResult = {
        linesCleared: 1,
        tspinType: 'none',
        description: 'Single',
      };
      const noLines: LineClearResult = {
        linesCleared: 0,
        tspinType: 'none',
        description: '',
      };

      scoreManager.processLineClear(single);
      expect(scoreManager.combo).toBe(0);

      scoreManager.processLineClear(noLines);
      expect(scoreManager.combo).toBe(-1);
    });
  });

  describe('level progression', () => {
    it('should level up after 10 lines', () => {
      expect(scoreManager.level).toBe(1);

      // Clear 10 lines (2 Tetris + 1 Double)
      const tetris: LineClearResult = {
        linesCleared: 4,
        tspinType: 'none',
        description: 'Tetris',
      };
      const double: LineClearResult = {
        linesCleared: 2,
        tspinType: 'none',
        description: 'Double',
      };

      scoreManager.processLineClear(tetris); // 4 lines
      scoreManager.processLineClear(tetris); // 8 lines
      expect(scoreManager.level).toBe(1);

      scoreManager.processLineClear(double); // 10 lines
      expect(scoreManager.level).toBe(2);
      expect(scoreManager.lines).toBe(10);
    });

    it('should track lines to next level', () => {
      expect(scoreManager.linesToNextLevel).toBe(10);

      const single: LineClearResult = {
        linesCleared: 1,
        tspinType: 'none',
        description: 'Single',
      };
      scoreManager.processLineClear(single);
      expect(scoreManager.linesToNextLevel).toBe(9);
    });
  });

  describe('fall speed', () => {
    it('should return correct fall speed for level 1', () => {
      expect(scoreManager.fallSpeed).toBe(1000); // 1 second
    });

    it('should decrease fall speed as level increases', () => {
      const speeds: number[] = [];
      for (let level = 1; level <= 15; level++) {
        const manager = new ScoreManager(level);
        speeds.push(manager.fallSpeed);
      }

      // Each level should be faster (lower ms) than the previous
      for (let i = 1; i < speeds.length; i++) {
        expect(speeds[i]).toBeLessThan(speeds[i - 1]!);
      }
    });

    it('should cap fall speed at level 15+', () => {
      const manager15 = new ScoreManager(15);
      const manager20 = new ScoreManager(20);
      expect(manager15.fallSpeed).toBe(manager20.fallSpeed);
    });
  });

  describe('drop bonuses', () => {
    it('should add soft drop bonus (1 per cell)', () => {
      scoreManager.addSoftDropBonus(10);
      expect(scoreManager.score).toBe(10);
    });

    it('should add hard drop bonus (2 per cell)', () => {
      scoreManager.addHardDropBonus(10);
      expect(scoreManager.score).toBe(20);
    });
  });

  describe('reset', () => {
    it('should reset all values', () => {
      const tetris: LineClearResult = {
        linesCleared: 4,
        tspinType: 'none',
        description: 'Tetris',
      };
      scoreManager.processLineClear(tetris);
      scoreManager.processLineClear(tetris);

      scoreManager.reset();

      expect(scoreManager.score).toBe(0);
      expect(scoreManager.level).toBe(1);
      expect(scoreManager.lines).toBe(0);
      expect(scoreManager.combo).toBe(-1);
      expect(scoreManager.backToBack).toBe(false);
    });

    it('should accept custom start level on reset', () => {
      scoreManager.reset(5);
      expect(scoreManager.level).toBe(5);
    });
  });

  describe('stats getter', () => {
    it('should return current game stats', () => {
      const tetris: LineClearResult = {
        linesCleared: 4,
        tspinType: 'none',
        description: 'Tetris',
      };
      scoreManager.processLineClear(tetris);

      const stats = scoreManager.stats;
      expect(stats.score).toBe(800);
      expect(stats.level).toBe(1);
      expect(stats.lines).toBe(4);
      expect(stats.combo).toBe(0);
      expect(stats.backToBack).toBe(true);
    });

    it('should return 0 for combo when no combo is active', () => {
      const stats = scoreManager.stats;
      expect(stats.combo).toBe(0); // -1 becomes 0 in stats
    });
  });
});
