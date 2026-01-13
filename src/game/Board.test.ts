/**
 * Board class tests
 * @module game/Board.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from './Board.ts';
import { Tetromino } from './Tetromino.ts';
import { BOARD_CONFIG } from '../types/index.ts';

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  describe('constructor', () => {
    it('should create a board with default dimensions', () => {
      expect(board.width).toBe(BOARD_CONFIG.width);
      expect(board.height).toBe(BOARD_CONFIG.height);
      expect(board.totalHeight).toBe(BOARD_CONFIG.height + BOARD_CONFIG.bufferHeight);
      expect(board.bufferHeight).toBe(BOARD_CONFIG.bufferHeight);
    });

    it('should create a board with custom dimensions', () => {
      const customBoard = new Board({ width: 12, height: 22, bufferHeight: 2 });
      expect(customBoard.width).toBe(12);
      expect(customBoard.height).toBe(22);
      expect(customBoard.totalHeight).toBe(24);
    });

    it('should initialize all cells as empty', () => {
      for (let y = 0; y < board.totalHeight; y++) {
        for (let x = 0; x < board.width; x++) {
          const cell = board.getCell(x, y);
          expect(cell).not.toBeNull();
          expect(cell?.filled).toBe(false);
          expect(cell?.color).toBeNull();
        }
      }
    });
  });

  describe('getCell', () => {
    it('should return cell data for valid positions', () => {
      const cell = board.getCell(0, 0);
      expect(cell).toEqual({ filled: false, color: null });
    });

    it('should return null for out of bounds positions', () => {
      expect(board.getCell(-1, 0)).toBeNull();
      expect(board.getCell(0, -1)).toBeNull();
      expect(board.getCell(board.width, 0)).toBeNull();
      expect(board.getCell(0, board.totalHeight)).toBeNull();
    });

    it('should return a copy of the cell', () => {
      const cell1 = board.getCell(0, 0);
      const cell2 = board.getCell(0, 0);
      expect(cell1).toEqual(cell2);
      expect(cell1).not.toBe(cell2);
    });
  });

  describe('setCell', () => {
    it('should set cell data for valid positions', () => {
      const result = board.setCell(5, 10, true, '#ff0000');
      expect(result).toBe(true);

      const cell = board.getCell(5, 10);
      expect(cell?.filled).toBe(true);
      expect(cell?.color).toBe('#ff0000');
    });

    it('should return false for out of bounds positions', () => {
      expect(board.setCell(-1, 0, true, '#ff0000')).toBe(false);
      expect(board.setCell(board.width, 0, true, '#ff0000')).toBe(false);
    });

    it('should clear a cell when filled is false', () => {
      // First fill the cell
      board.setCell(5, 10, true, '#ff0000');
      expect(board.getCell(5, 10)?.filled).toBe(true);

      // Now clear it
      const result = board.setCell(5, 10, false, null);
      expect(result).toBe(true);

      const cell = board.getCell(5, 10);
      expect(cell?.filled).toBe(false);
      expect(cell?.color).toBeNull();
    });
  });

  describe('isInBounds', () => {
    it('should return true for valid positions', () => {
      expect(board.isInBounds(0, 0)).toBe(true);
      expect(board.isInBounds(board.width - 1, 0)).toBe(true);
      expect(board.isInBounds(0, board.totalHeight - 1)).toBe(true);
    });

    it('should return false for invalid positions', () => {
      expect(board.isInBounds(-1, 0)).toBe(false);
      expect(board.isInBounds(board.width, 0)).toBe(false);
      expect(board.isInBounds(0, -1)).toBe(false);
      expect(board.isInBounds(0, board.totalHeight)).toBe(false);
    });
  });

  describe('isCellEmpty', () => {
    it('should return true for empty cells', () => {
      expect(board.isCellEmpty(0, 0)).toBe(true);
    });

    it('should return false for filled cells', () => {
      board.setCell(0, 0, true, '#ff0000');
      expect(board.isCellEmpty(0, 0)).toBe(false);
    });

    it('should return false for out of bounds positions', () => {
      expect(board.isCellEmpty(-1, 0)).toBe(false);
    });
  });

  describe('canPlaceTetromino', () => {
    it('should return true for valid placement', () => {
      const tetromino = new Tetromino('O', { x: 4, y: 4 });
      expect(board.canPlaceTetromino(tetromino)).toBe(true);
    });

    it('should return false when tetromino overlaps filled cells', () => {
      board.setCell(4, 4, true, '#ff0000');
      const tetromino = new Tetromino('O', { x: 3, y: 4 });
      expect(board.canPlaceTetromino(tetromino)).toBe(false);
    });

    it('should return false when tetromino is out of bounds', () => {
      const tetromino = new Tetromino('I', { x: -1, y: 0 });
      expect(board.canPlaceTetromino(tetromino)).toBe(false);
    });

    it('should return false when tetromino extends past right edge', () => {
      const tetromino = new Tetromino('I', { x: board.width - 1, y: 4 });
      expect(board.canPlaceTetromino(tetromino)).toBe(false);
    });

    it('should return false when tetromino extends past bottom', () => {
      const tetromino = new Tetromino('I', { x: 4, y: board.totalHeight });
      expect(board.canPlaceTetromino(tetromino)).toBe(false);
    });

    it('should return true for placement at right edge', () => {
      // I-piece horizontal at rightmost valid position
      const tetromino = new Tetromino('I', { x: board.width - 4, y: 4 });
      expect(board.canPlaceTetromino(tetromino)).toBe(true);
    });

    it('should return true for placement at left edge', () => {
      const tetromino = new Tetromino('O', { x: 0, y: 4 });
      expect(board.canPlaceTetromino(tetromino)).toBe(true);
    });

    it('should return true for rotated I-piece at valid position', () => {
      const tetromino = new Tetromino('I', { x: 5, y: 4 });
      // Rotate to vertical orientation
      tetromino.rotateClockwise();
      expect(board.canPlaceTetromino(tetromino)).toBe(true);
    });

    it('should return false for rotated I-piece extending past bottom', () => {
      const tetromino = new Tetromino('I', { x: 5, y: board.totalHeight - 2 });
      // Rotate to vertical orientation (4 cells tall)
      tetromino.rotateClockwise();
      expect(board.canPlaceTetromino(tetromino)).toBe(false);
    });

    it('should check collision for rotated T-piece', () => {
      const tetromino = new Tetromino('T', { x: 4, y: 4 });
      // Rotate to right-facing orientation
      tetromino.rotateClockwise();

      // Fill a cell that would collide with rotated piece
      const cells = tetromino.getCells();
      if (cells[0]) {
        board.setCell(cells[0].x, cells[0].y, true, '#ff0000');
      }

      expect(board.canPlaceTetromino(tetromino)).toBe(false);
    });
  });

  describe('lockTetromino', () => {
    it('should lock tetromino cells to the board', () => {
      const tetromino = new Tetromino('O', { x: 4, y: 10 });
      const result = board.lockTetromino(tetromino);

      expect(result).toBe(true);

      // O-piece at position (4,10) should fill cells at:
      // (5,10), (6,10), (5,11), (6,11) based on O_SHAPES
      const cells = tetromino.getCells();
      for (const cell of cells) {
        const boardCell = board.getCell(cell.x, cell.y);
        expect(boardCell?.filled).toBe(true);
        expect(boardCell?.color).toBe(tetromino.color);
      }
    });

    it('should return false when placement is invalid', () => {
      const tetromino = new Tetromino('O', { x: -5, y: 0 });
      expect(board.lockTetromino(tetromino)).toBe(false);
    });
  });

  describe('isRowFilled', () => {
    it('should return false for empty rows', () => {
      expect(board.isRowFilled(10)).toBe(false);
    });

    it('should return true for completely filled rows', () => {
      const y = 20; // Bottom row
      for (let x = 0; x < board.width; x++) {
        board.setCell(x, y, true, '#ff0000');
      }
      expect(board.isRowFilled(y)).toBe(true);
    });

    it('should return false for partially filled rows', () => {
      const y = 20;
      for (let x = 0; x < board.width - 1; x++) {
        board.setCell(x, y, true, '#ff0000');
      }
      expect(board.isRowFilled(y)).toBe(false);
    });

    it('should return false for out of bounds rows', () => {
      expect(board.isRowFilled(-1)).toBe(false);
      expect(board.isRowFilled(board.totalHeight)).toBe(false);
    });
  });

  describe('clearRow', () => {
    it('should clear a row and shift rows above down', () => {
      const y = 20;

      // Fill row 20 completely
      for (let x = 0; x < board.width; x++) {
        board.setCell(x, y, true, '#ff0000');
      }

      // Put a cell in row 19
      board.setCell(5, 19, true, '#00ff00');

      // Clear row 20
      board.clearRow(y);

      // Row 20 should now contain the cell from row 19
      expect(board.getCell(5, y)?.filled).toBe(true);
      expect(board.getCell(5, y)?.color).toBe('#00ff00');

      // Row 19 should be empty
      expect(board.getCell(5, 19)?.filled).toBe(false);
    });

    it('should do nothing for negative row index', () => {
      // Fill a row first
      board.setCell(5, 10, true, '#ff0000');

      // Try to clear invalid row
      board.clearRow(-1);

      // Original cell should still be there
      expect(board.getCell(5, 10)?.filled).toBe(true);
    });

    it('should do nothing for row index exceeding total height', () => {
      // Fill a row first
      board.setCell(5, 10, true, '#ff0000');

      // Try to clear invalid row
      board.clearRow(board.totalHeight);

      // Original cell should still be there
      expect(board.getCell(5, 10)?.filled).toBe(true);
    });
  });

  describe('clearFilledRows', () => {
    it('should return 0 when no rows are filled', () => {
      expect(board.clearFilledRows()).toBe(0);
    });

    it('should clear all filled rows and return count', () => {
      // Fill bottom 2 rows
      for (let y = board.totalHeight - 1; y >= board.totalHeight - 2; y--) {
        for (let x = 0; x < board.width; x++) {
          board.setCell(x, y, true, '#ff0000');
        }
      }

      const cleared = board.clearFilledRows();
      expect(cleared).toBe(2);

      // Both rows should now be empty
      for (let x = 0; x < board.width; x++) {
        expect(board.isCellEmpty(x, board.totalHeight - 1)).toBe(true);
        expect(board.isCellEmpty(x, board.totalHeight - 2)).toBe(true);
      }
    });

    it('should clear tetris (4 consecutive rows)', () => {
      // Fill bottom 4 rows
      for (let y = board.totalHeight - 1; y >= board.totalHeight - 4; y--) {
        for (let x = 0; x < board.width; x++) {
          board.setCell(x, y, true, '#ff0000');
        }
      }

      const cleared = board.clearFilledRows();
      expect(cleared).toBe(4);
    });

    it('should clear non-consecutive filled rows', () => {
      // Fill rows 20 and 22 (skipping 21)
      for (let x = 0; x < board.width; x++) {
        board.setCell(x, board.totalHeight - 1, true, '#ff0000'); // row 23
        board.setCell(x, board.totalHeight - 3, true, '#00ff00'); // row 21
      }
      // Leave row 22 partially filled
      board.setCell(0, board.totalHeight - 2, true, '#0000ff');

      const cleared = board.clearFilledRows();
      expect(cleared).toBe(2);

      // The partial row should have shifted down
      expect(board.getCell(0, board.totalHeight - 1)?.filled).toBe(true);
      expect(board.getCell(0, board.totalHeight - 1)?.color).toBe('#0000ff');
    });
  });

  describe('isOverflowing', () => {
    it('should return false when buffer zone is empty', () => {
      expect(board.isOverflowing()).toBe(false);
    });

    it('should return true when cells are in buffer zone', () => {
      board.setCell(5, 0, true, '#ff0000');
      expect(board.isOverflowing()).toBe(true);
    });

    it('should return true when any row in buffer zone has cells', () => {
      // Set cell in last row of buffer zone
      board.setCell(5, board.bufferHeight - 1, true, '#ff0000');
      expect(board.isOverflowing()).toBe(true);
    });

    it('should return false when cells are only in visible area', () => {
      // Set cell just below buffer zone (first visible row)
      board.setCell(5, board.bufferHeight, true, '#ff0000');
      expect(board.isOverflowing()).toBe(false);
    });
  });

  describe('getVisibleGrid', () => {
    it('should return only the visible area', () => {
      const grid = board.getVisibleGrid();
      expect(grid.length).toBe(BOARD_CONFIG.height);
      const firstRow = grid[0];
      expect(firstRow).toBeDefined();
      expect(firstRow?.length).toBe(BOARD_CONFIG.width);
    });

    it('should return a copy of the grid', () => {
      const grid1 = board.getVisibleGrid();
      const grid2 = board.getVisibleGrid();
      expect(grid1).not.toBe(grid2);
      expect(grid1[0]).not.toBe(grid2[0]);
    });
  });

  describe('getFullGrid', () => {
    it('should return the full grid including buffer', () => {
      const grid = board.getFullGrid();
      expect(grid.length).toBe(BOARD_CONFIG.height + BOARD_CONFIG.bufferHeight);
    });

    it('should return a copy of the grid', () => {
      const grid1 = board.getFullGrid();
      const grid2 = board.getFullGrid();
      expect(grid1).not.toBe(grid2);
      expect(grid1[0]).not.toBe(grid2[0]);
    });

    it('should not allow modification of internal grid', () => {
      board.setCell(0, 0, true, '#ff0000');
      const grid = board.getFullGrid();

      // Verify initial state
      const firstRow = grid[0];
      expect(firstRow).toBeDefined();
      if (firstRow) {
        expect(firstRow[0]?.filled).toBe(true);
      }

      // Try to modify the returned grid (should not affect internal state)
      const cell = grid[0]?.[0];
      if (cell) {
        cell.filled = false;
      }

      // Internal state should be unchanged
      expect(board.getCell(0, 0)?.filled).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all cells', () => {
      // Fill some cells
      board.setCell(0, 0, true, '#ff0000');
      board.setCell(5, 10, true, '#00ff00');

      board.reset();

      // All cells should be empty
      for (let y = 0; y < board.totalHeight; y++) {
        for (let x = 0; x < board.width; x++) {
          expect(board.isCellEmpty(x, y)).toBe(true);
        }
      }
    });
  });

  describe('getTetrominoDropPosition', () => {
    it('should return the lowest valid position', () => {
      const tetromino = new Tetromino('I', { x: 3, y: 0 });
      const dropPos = board.getTetrominoDropPosition(tetromino);

      // I-piece should drop to the bottom (row 22 considering the shape)
      expect(dropPos.x).toBe(3);
      expect(dropPos.y).toBeGreaterThan(0);
    });

    it('should stop at filled cells', () => {
      // Fill a row
      for (let x = 0; x < board.width; x++) {
        board.setCell(x, 20, true, '#ff0000');
      }

      const tetromino = new Tetromino('I', { x: 3, y: 0 });
      const dropPos = board.getTetrominoDropPosition(tetromino);

      // Should stop above the filled row
      expect(dropPos.y).toBeLessThan(20);
    });

    it('should preserve original x position', () => {
      const tetromino = new Tetromino('O', { x: 7, y: 0 });
      const dropPos = board.getTetrominoDropPosition(tetromino);

      expect(dropPos.x).toBe(7);
    });

    it('should return current position if tetromino cannot move down', () => {
      // Fill the entire bottom portion
      for (let y = 10; y < board.totalHeight; y++) {
        for (let x = 0; x < board.width; x++) {
          board.setCell(x, y, true, '#ff0000');
        }
      }

      const tetromino = new Tetromino('O', { x: 4, y: 5 });
      const dropPos = board.getTetrominoDropPosition(tetromino);

      // Should stop at position just above filled area
      expect(dropPos.y).toBeLessThan(10);
    });

    it('should handle rotated I-piece drop position', () => {
      const tetromino = new Tetromino('I', { x: 5, y: 0 });
      // Rotate to vertical orientation
      tetromino.rotateClockwise();

      const dropPos = board.getTetrominoDropPosition(tetromino);

      // Should drop to near bottom with vertical orientation
      expect(dropPos.x).toBe(5);
      expect(dropPos.y).toBeGreaterThan(0);
    });

    it('should handle rotated T-piece drop position', () => {
      const tetromino = new Tetromino('T', { x: 4, y: 0 });
      // Rotate to different orientation
      tetromino.rotateClockwise();

      const dropPos = board.getTetrominoDropPosition(tetromino);

      expect(dropPos.x).toBe(4);
      expect(dropPos.y).toBeGreaterThan(0);
    });
  });
});
