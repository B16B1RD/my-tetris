/**
 * SRS (Super Rotation System) Tests
 * @module game/SRS.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from './Board.ts';
import { Tetromino } from './Tetromino.ts';
import {
  tryRotation,
  rotateClockwise,
  rotateCounterClockwise,
  getTargetRotation,
  WALL_KICK_DATA,
} from './SRS.ts';

describe('SRS', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  describe('getTargetRotation', () => {
    it('should return next rotation state for clockwise', () => {
      expect(getTargetRotation(0, 'clockwise')).toBe(1);
      expect(getTargetRotation(1, 'clockwise')).toBe(2);
      expect(getTargetRotation(2, 'clockwise')).toBe(3);
      expect(getTargetRotation(3, 'clockwise')).toBe(0);
    });

    it('should return previous rotation state for counter-clockwise', () => {
      expect(getTargetRotation(0, 'counterClockwise')).toBe(3);
      expect(getTargetRotation(1, 'counterClockwise')).toBe(0);
      expect(getTargetRotation(2, 'counterClockwise')).toBe(1);
      expect(getTargetRotation(3, 'counterClockwise')).toBe(2);
    });
  });

  describe('tryRotation - basic rotation', () => {
    it('should rotate T-piece clockwise in open space', () => {
      const tetromino = new Tetromino('T', { x: 4, y: 10 });
      const result = tryRotation(tetromino, board, 'clockwise');

      expect(result.success).toBe(true);
      expect(result.kickIndex).toBe(0);
      expect(result.kickOffset).toBe(null);
      expect(tetromino.rotation).toBe(1);
    });

    it('should rotate T-piece counter-clockwise in open space', () => {
      const tetromino = new Tetromino('T', { x: 4, y: 10 });
      const result = tryRotation(tetromino, board, 'counterClockwise');

      expect(result.success).toBe(true);
      expect(result.kickIndex).toBe(0);
      expect(tetromino.rotation).toBe(3);
    });

    it('should rotate I-piece in open space', () => {
      const tetromino = new Tetromino('I', { x: 3, y: 10 });
      const result = tryRotation(tetromino, board, 'clockwise');

      expect(result.success).toBe(true);
      expect(tetromino.rotation).toBe(1);
    });

    it('should always succeed for O-piece (no visual change)', () => {
      const tetromino = new Tetromino('O', { x: 4, y: 10 });
      const originalRotation = tetromino.rotation;
      const result = tryRotation(tetromino, board, 'clockwise');

      expect(result.success).toBe(true);
      // O-piece rotation state doesn't change
      expect(tetromino.rotation).toBe(originalRotation);
    });
  });

  describe('tryRotation - wall kicks', () => {
    it('should apply wall kick when blocked by left wall', () => {
      // Place T-piece at left edge
      const tetromino = new Tetromino('T', { x: 0, y: 10 });
      tetromino.setRotation(0);

      // Rotate counter-clockwise (0→3), which would push piece left
      const result = tryRotation(tetromino, board, 'counterClockwise');

      expect(result.success).toBe(true);
      expect(tetromino.rotation).toBe(3);
      // Should have been kicked right
      expect(tetromino.position.x).toBeGreaterThanOrEqual(0);
    });

    it('should apply wall kick when blocked by right wall', () => {
      // Place T-piece near right edge
      const tetromino = new Tetromino('T', { x: 8, y: 10 });
      tetromino.setRotation(0);

      // Rotate clockwise (0→1)
      const result = tryRotation(tetromino, board, 'clockwise');

      expect(result.success).toBe(true);
      expect(tetromino.rotation).toBe(1);
    });

    it('should apply I-piece wall kick correctly', () => {
      // I-piece at right edge (horizontal)
      const tetromino = new Tetromino('I', { x: 7, y: 10 });
      tetromino.setRotation(0);

      // Rotate clockwise (0→1, vertical)
      const result = tryRotation(tetromino, board, 'clockwise');

      expect(result.success).toBe(true);
      expect(tetromino.rotation).toBe(1);
    });

    it('should fail rotation when all wall kicks fail', () => {
      // Create a very constrained situation
      const tetromino = new Tetromino('I', { x: 3, y: 10 });
      tetromino.setRotation(1); // Vertical I-piece

      // Fill cells around to block all rotation possibilities
      for (let x = 0; x < board.width; x++) {
        if (x !== 5) {
          // Leave column 5 open for the vertical I
          board.setCell(x, 10, true, '#fff');
          board.setCell(x, 11, true, '#fff');
          board.setCell(x, 12, true, '#fff');
          board.setCell(x, 13, true, '#fff');
        }
      }

      // Also block potential kick positions
      board.setCell(5, 8, true, '#fff');
      board.setCell(5, 9, true, '#fff');
      board.setCell(5, 14, true, '#fff');
      board.setCell(5, 15, true, '#fff');

      const result = tryRotation(tetromino, board, 'clockwise');

      expect(result.success).toBe(false);
      expect(result.kickIndex).toBe(-1);
    });
  });

  describe('rotateClockwise / rotateCounterClockwise helpers', () => {
    it('should rotate clockwise and return true on success', () => {
      const tetromino = new Tetromino('T', { x: 4, y: 10 });
      const success = rotateClockwise(tetromino, board);

      expect(success).toBe(true);
      expect(tetromino.rotation).toBe(1);
    });

    it('should rotate counter-clockwise and return true on success', () => {
      const tetromino = new Tetromino('T', { x: 4, y: 10 });
      const success = rotateCounterClockwise(tetromino, board);

      expect(success).toBe(true);
      expect(tetromino.rotation).toBe(3);
    });

    it('should return false when rotation fails', () => {
      // Completely fill the board around the piece
      const tetromino = new Tetromino('I', { x: 3, y: 2 });
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < board.width; x++) {
          board.setCell(x, y, true, '#fff');
        }
      }
      // Clear space for the I-piece in horizontal position
      board.setCell(3, 5, false, null);
      board.setCell(4, 5, false, null);
      board.setCell(5, 5, false, null);
      board.setCell(6, 5, false, null);

      // This should fail as there's no room for wall kicks
      const success = rotateClockwise(tetromino, board);
      expect(success).toBe(false);
    });
  });

  describe('full rotation cycle', () => {
    it('should complete full clockwise rotation cycle', () => {
      const tetromino = new Tetromino('T', { x: 4, y: 10 });

      expect(tetromino.rotation).toBe(0);

      rotateClockwise(tetromino, board);
      expect(tetromino.rotation).toBe(1);

      rotateClockwise(tetromino, board);
      expect(tetromino.rotation).toBe(2);

      rotateClockwise(tetromino, board);
      expect(tetromino.rotation).toBe(3);

      rotateClockwise(tetromino, board);
      expect(tetromino.rotation).toBe(0);
    });

    it('should complete full counter-clockwise rotation cycle', () => {
      const tetromino = new Tetromino('J', { x: 4, y: 10 });

      expect(tetromino.rotation).toBe(0);

      rotateCounterClockwise(tetromino, board);
      expect(tetromino.rotation).toBe(3);

      rotateCounterClockwise(tetromino, board);
      expect(tetromino.rotation).toBe(2);

      rotateCounterClockwise(tetromino, board);
      expect(tetromino.rotation).toBe(1);

      rotateCounterClockwise(tetromino, board);
      expect(tetromino.rotation).toBe(0);
    });
  });

  describe('wall kick data', () => {
    it('should have all transition keys for JLSTZ', () => {
      const expectedKeys = ['01', '12', '23', '30', '10', '21', '32', '03'];
      for (const key of expectedKeys) {
        const offsets = WALL_KICK_DATA.JLSTZ[key];
        expect(offsets).toBeDefined();
        expect(offsets?.length).toBe(5);
      }
    });

    it('should have all transition keys for I-piece', () => {
      const expectedKeys = ['01', '12', '23', '30', '10', '21', '32', '03'];
      for (const key of expectedKeys) {
        const offsets = WALL_KICK_DATA.I[key];
        expect(offsets).toBeDefined();
        expect(offsets?.length).toBe(5);
      }
    });

    it('should have first offset as (0,0) for all transitions', () => {
      for (const key of Object.keys(WALL_KICK_DATA.JLSTZ)) {
        const offsets = WALL_KICK_DATA.JLSTZ[key];
        expect(offsets?.[0]).toEqual({ x: 0, y: 0 });
      }
      for (const key of Object.keys(WALL_KICK_DATA.I)) {
        const offsets = WALL_KICK_DATA.I[key];
        expect(offsets?.[0]).toEqual({ x: 0, y: 0 });
      }
    });
  });

  describe('T-spin detection preparation', () => {
    it('should return kick index for T-spin detection', () => {
      // Place T-piece where wall kick will be needed
      const tetromino = new Tetromino('T', { x: 0, y: 10 });

      const result = tryRotation(tetromino, board, 'clockwise');

      expect(result.success).toBe(true);
      // kickIndex can be used later for T-spin detection
      expect(result.kickIndex).toBeGreaterThanOrEqual(0);
    });
  });
});
