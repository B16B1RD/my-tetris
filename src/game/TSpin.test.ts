/**
 * T-Spin detection tests
 * @module game/TSpin.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from './Board.ts';
import { Tetromino } from './Tetromino.ts';
import { detectTSpin, getTSpinDescription } from './TSpin.ts';

describe('TSpin', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  describe('detectTSpin', () => {
    describe('non-T pieces', () => {
      it('should return none for non-T pieces', () => {
        const tetromino = new Tetromino('I', { x: 4, y: 10 });
        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('none');
      });

      it('should return none for O piece even with rotation', () => {
        const tetromino = new Tetromino('O', { x: 4, y: 10 });
        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('none');
      });
    });

    describe('no rotation', () => {
      it('should return none when last action was not rotation', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        // Fill all corners to ensure it would be a T-Spin if rotated
        fillTCorners(board, tetromino, [true, true, true, true]);

        const result = detectTSpin(tetromino, board, false, 0);
        expect(result.type).toBe('none');
        expect(result.wasRotation).toBe(false);
      });
    });

    describe('3-corner rule', () => {
      it('should return none when less than 3 corners are filled', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        // Fill only 2 corners
        fillTCorners(board, tetromino, [true, true, false, false]);

        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('none');
      });

      it('should detect T-Spin when 3 corners are filled', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        // Fill 3 corners including both front corners
        fillTCorners(board, tetromino, [true, true, true, false]);

        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('full');
      });

      it('should detect T-Spin when all 4 corners are filled', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        // Fill all 4 corners
        fillTCorners(board, tetromino, [true, true, true, true]);

        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('full');
      });
    });

    describe('T-Spin Mini detection', () => {
      it('should detect T-Spin Mini when only 1 front corner is filled', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        // Fill 3 corners but only 1 front corner
        fillTCorners(board, tetromino, [true, false, true, true]);

        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('mini');
      });

      it('should detect T-Spin Mini when kickIndex is 4 (5th wall kick test)', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        // Fill both front corners (would normally be full T-Spin)
        fillTCorners(board, tetromino, [true, true, true, false]);

        // But kickIndex 4 makes it a Mini
        const result = detectTSpin(tetromino, board, true, 4);
        expect(result.type).toBe('mini');
      });

      it('should detect full T-Spin when both front corners filled and not kick 4', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        // Fill 3 corners including both front
        fillTCorners(board, tetromino, [true, true, true, false]);

        // kickIndex 0 (no kick) should be full T-Spin
        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('full');

        // kickIndex 1-3 should also be full T-Spin
        const result2 = detectTSpin(tetromino, board, true, 2);
        expect(result2.type).toBe('full');
      });
    });

    describe('rotated T-piece detection', () => {
      it('should detect T-Spin for T-piece in rotation state 1 (R)', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        tetromino.setRotation(1);

        // Fill corners for rotation state 1
        fillTCorners(board, tetromino, [true, true, true, false]);

        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('full');
      });

      it('should detect T-Spin for T-piece in rotation state 2 (180)', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        tetromino.setRotation(2);

        // Fill corners for rotation state 2
        fillTCorners(board, tetromino, [true, true, true, false]);

        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('full');
      });

      it('should detect T-Spin for T-piece in rotation state 3 (L)', () => {
        const tetromino = new Tetromino('T', { x: 4, y: 10 });
        tetromino.setRotation(3);

        // Fill corners for rotation state 3
        fillTCorners(board, tetromino, [true, true, true, false]);

        const result = detectTSpin(tetromino, board, true, 0);
        expect(result.type).toBe('full');
      });
    });

    describe('wall/edge detection', () => {
      it('should count out-of-bounds positions as filled corners (full T-Spin at left wall)', () => {
        // Place T-piece at left edge (x: -1 so left corners are out of bounds)
        // Center at x=0, y=11 means left corners at x=-1 are out of bounds
        const tetromino = new Tetromino('T', { x: -1, y: 10 });

        // Fill only 1 corner on the board side
        // The left edge wall should count as filled corners
        // Front-right at center(0, 11) + offset(1, -1) = (1, 10)
        board.setCell(1, 10, true, '#ff0000');

        const result = detectTSpin(tetromino, board, true, 0);
        // Left wall provides 2 "filled" corners (out of bounds: front-left, back-left)
        // Plus the one we set (front-right) = 3 corners
        // Both front corners filled (front-left out of bounds, front-right set), so it's full T-Spin
        expect(result.type).toBe('full');
      });

      it('should count bottom edge as filled corners (T-Spin Mini at bottom)', () => {
        // Place T-piece near bottom in rotation state 2 (T points down)
        // So back corners are at the top (in bounds) and front corners at bottom (out of bounds)
        // Position y = totalHeight - 2, center at y = totalHeight - 1
        // Front corners (rotation 2) at y = totalHeight (out of bounds)
        const tetromino = new Tetromino('T', { x: 4, y: board.totalHeight - 2 });
        tetromino.setRotation(2);

        // Center is at (5, totalHeight - 1)
        // In rotation state 2 (T points down):
        // - Front corners at y = totalHeight (out of bounds) at x=4 and x=6
        // - Back corners at y = totalHeight - 2 at x=4 and x=6
        // Fill 1 back corner to get 3 total (2 front out of bounds + 1 back filled)
        // Back corner positions for rotation 2: (4, totalHeight-2) and (6, totalHeight-2)
        board.setCell(4, board.totalHeight - 2, true, '#ff0000');

        const result = detectTSpin(tetromino, board, true, 0);
        // Bottom edge provides 2 "filled" front corners (out of bounds)
        // Plus the one we set = 3 corners
        // Both front corners are out of bounds and count as filled, so it's full T-Spin
        expect(result.type).toBe('full');
      });
    });
  });

  describe('getTSpinDescription', () => {
    describe('no T-Spin', () => {
      it('should return empty string for 0 lines cleared', () => {
        expect(getTSpinDescription('none', 0)).toBe('');
      });

      it('should return Single for 1 line', () => {
        expect(getTSpinDescription('none', 1)).toBe('Single');
      });

      it('should return Double for 2 lines', () => {
        expect(getTSpinDescription('none', 2)).toBe('Double');
      });

      it('should return Triple for 3 lines', () => {
        expect(getTSpinDescription('none', 3)).toBe('Triple');
      });

      it('should return Tetris for 4 lines', () => {
        expect(getTSpinDescription('none', 4)).toBe('Tetris');
      });
    });

    describe('T-Spin Mini', () => {
      it('should return T-Spin Mini for 0 lines', () => {
        expect(getTSpinDescription('mini', 0)).toBe('T-Spin Mini');
      });

      it('should return T-Spin Mini Single for 1 line', () => {
        expect(getTSpinDescription('mini', 1)).toBe('T-Spin Mini Single');
      });

      it('should return T-Spin Mini Double for 2 lines', () => {
        expect(getTSpinDescription('mini', 2)).toBe('T-Spin Mini Double');
      });
    });

    describe('full T-Spin', () => {
      it('should return T-Spin for 0 lines', () => {
        expect(getTSpinDescription('full', 0)).toBe('T-Spin');
      });

      it('should return T-Spin Single for 1 line', () => {
        expect(getTSpinDescription('full', 1)).toBe('T-Spin Single');
      });

      it('should return T-Spin Double for 2 lines', () => {
        expect(getTSpinDescription('full', 2)).toBe('T-Spin Double');
      });

      it('should return T-Spin Triple for 3 lines', () => {
        expect(getTSpinDescription('full', 3)).toBe('T-Spin Triple');
      });
    });
  });
});

/**
 * Helper function to fill T-piece corners on the board.
 * Corners are ordered as: [front-left, front-right, back-left, back-right]
 * based on the current rotation state.
 */
function fillTCorners(
  board: Board,
  tetromino: Tetromino,
  corners: [boolean, boolean, boolean, boolean]
): void {
  const centerX = tetromino.position.x + 1;
  const centerY = tetromino.position.y + 1;

  // Corner offsets based on rotation state 0 (T points up)
  // For other rotations, we use the same pattern but the meaning of front/back changes
  const rotation = tetromino.rotation;

  // Get corner positions based on rotation
  const cornerPositions = getTCornerPositions(rotation);

  for (let i = 0; i < 4; i++) {
    if (corners[i]) {
      const offset = cornerPositions[i];
      if (offset) {
        const x = centerX + offset.x;
        const y = centerY + offset.y;
        if (board.isInBounds(x, y)) {
          board.setCell(x, y, true, '#ff0000');
        }
      }
    }
  }
}

/**
 * Get corner positions for T-piece based on rotation state.
 * Returns [front-left, front-right, back-left, back-right] offsets from center.
 */
function getTCornerPositions(rotation: number): { x: number; y: number }[] {
  switch (rotation) {
    case 0: // T points up
      return [
        { x: -1, y: -1 }, // front-left
        { x: 1, y: -1 }, // front-right
        { x: -1, y: 1 }, // back-left
        { x: 1, y: 1 }, // back-right
      ];
    case 1: // T points right
      return [
        { x: 1, y: -1 }, // front-left (top-right)
        { x: 1, y: 1 }, // front-right (bottom-right)
        { x: -1, y: -1 }, // back-left (top-left)
        { x: -1, y: 1 }, // back-right (bottom-left)
      ];
    case 2: // T points down
      return [
        { x: 1, y: 1 }, // front-left (bottom-right)
        { x: -1, y: 1 }, // front-right (bottom-left)
        { x: 1, y: -1 }, // back-left (top-right)
        { x: -1, y: -1 }, // back-right (top-left)
      ];
    case 3: // T points left
      return [
        { x: -1, y: 1 }, // front-left (bottom-left)
        { x: -1, y: -1 }, // front-right (top-left)
        { x: 1, y: 1 }, // back-left (bottom-right)
        { x: 1, y: -1 }, // back-right (top-right)
      ];
    default:
      return [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: 1 },
      ];
  }
}
