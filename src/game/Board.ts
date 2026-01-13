/**
 * Game Board
 * @module game/Board
 * @description Manages the game board state (10x20 + buffer zone) and cell operations.
 */

import type {
  Cell,
  BoardConfig,
  Position,
} from '../types/index.ts';
import { BOARD_CONFIG } from '../types/index.ts';
import type { Tetromino } from './Tetromino.ts';

/**
 * Represents the game board with cell state management.
 *
 * The board consists of a visible area (default 10x20) plus a buffer zone
 * above it (default 4 rows) where pieces spawn. The buffer zone is used
 * to detect game over conditions.
 *
 * @example
 * ```typescript
 * const board = new Board();
 * const tetromino = new Tetromino('T', { x: 4, y: 0 });
 *
 * if (board.canPlaceTetromino(tetromino)) {
 *   board.lockTetromino(tetromino);
 *   const cleared = board.clearFilledRows();
 * }
 * ```
 */
export class Board {
  private readonly config: BoardConfig;
  private readonly grid: Cell[][];

  /**
   * Create a new game board.
   * @param config - Board configuration (width, height, bufferHeight)
   */
  constructor(config: BoardConfig = BOARD_CONFIG) {
    this.config = config;
    this.grid = this.createEmptyGrid();
  }

  /** Board width in cells */
  get width(): number {
    return this.config.width;
  }

  /** Visible board height in cells (excluding buffer) */
  get height(): number {
    return this.config.height;
  }

  /** Total height including buffer zone */
  get totalHeight(): number {
    return this.config.height + this.config.bufferHeight;
  }

  /** Buffer height above visible area */
  get bufferHeight(): number {
    return this.config.bufferHeight;
  }

  /**
   * Create an empty grid with the specified dimensions.
   */
  private createEmptyGrid(): Cell[][] {
    const rows = this.config.height + this.config.bufferHeight;
    const cols = this.config.width;

    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        filled: false,
        color: null,
      }))
    );
  }

  /**
   * Get a copy of the cell at the specified position.
   * @param x - Horizontal position (0 = left edge)
   * @param y - Vertical position (0 = top of buffer zone)
   * @returns Cell data or null if position is out of bounds
   */
  getCell(x: number, y: number): Cell | null {
    if (!this.isInBounds(x, y)) {
      return null;
    }
    const row = this.grid[y];
    if (!row) {
      return null;
    }
    const cell = row[x];
    if (!cell) {
      return null;
    }
    return { ...cell };
  }

  /**
   * Set the cell at the specified position.
   * @param x - Horizontal position (0 = left edge)
   * @param y - Vertical position (0 = top of buffer zone)
   * @param filled - Whether the cell is filled
   * @param color - Cell color (hex string) or null if empty
   * @returns true if successful, false if out of bounds
   */
  setCell(x: number, y: number, filled: boolean, color: string | null): boolean {
    if (!this.isInBounds(x, y)) {
      return false;
    }
    const row = this.grid[y];
    if (!row) {
      return false;
    }
    row[x] = { filled, color };
    return true;
  }

  /**
   * Check if a position is within the board bounds.
   * @param x - Horizontal position to check
   * @param y - Vertical position to check
   * @returns true if the position is valid
   */
  isInBounds(x: number, y: number): boolean {
    return (
      x >= 0 &&
      x < this.config.width &&
      y >= 0 &&
      y < this.totalHeight
    );
  }

  /**
   * Check if a cell is empty (not filled).
   * @returns true if empty, false if filled or out of bounds
   */
  isCellEmpty(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    return cell !== null && !cell.filled;
  }

  /**
   * Check if a tetromino can be placed at its current position.
   * Validates that all cells are within bounds and not overlapping filled cells.
   * @param tetromino - The tetromino to check
   * @returns true if the position is valid (no collisions)
   */
  canPlaceTetromino(tetromino: Tetromino): boolean {
    const cells = tetromino.getCells();
    return cells.every(
      (cell) =>
        this.isInBounds(cell.x, cell.y) && this.isCellEmpty(cell.x, cell.y)
    );
  }

  /**
   * Lock a tetromino to the board at its current position.
   * Fills the cells occupied by the tetromino with its color.
   * @param tetromino - The tetromino to lock
   * @returns true if successful, false if placement is invalid
   */
  lockTetromino(tetromino: Tetromino): boolean {
    if (!this.canPlaceTetromino(tetromino)) {
      return false;
    }

    const cells = tetromino.getCells();
    for (const cell of cells) {
      this.setCell(cell.x, cell.y, true, tetromino.color);
    }
    return true;
  }

  /**
   * Check if a row is completely filled.
   */
  isRowFilled(y: number): boolean {
    if (y < 0 || y >= this.totalHeight) {
      return false;
    }
    const row = this.grid[y];
    if (!row) {
      return false;
    }
    return row.every((cell) => cell.filled);
  }

  /**
   * Clear a specific row and shift all rows above it down by one.
   * A new empty row is added at the top.
   * @param y - The row index to clear (0 = top of board)
   */
  clearRow(y: number): void {
    if (y < 0 || y >= this.totalHeight) {
      return;
    }

    // Remove the cleared row
    this.grid.splice(y, 1);

    // Add a new empty row at the top
    const newRow: Cell[] = Array.from({ length: this.config.width }, () => ({
      filled: false,
      color: null,
    }));
    this.grid.unshift(newRow);
  }

  /**
   * Clear all completely filled rows and shift remaining rows down.
   * Checks from bottom to top to handle consecutive filled rows correctly.
   * @returns The number of rows cleared (0-4 for standard Tetris scoring)
   */
  clearFilledRows(): number {
    let clearedCount = 0;

    // Check from bottom to top
    for (let y = this.totalHeight - 1; y >= 0; y--) {
      if (this.isRowFilled(y)) {
        this.clearRow(y);
        clearedCount++;
        // After clearing, check the same row again (new row shifted down)
        y++;
      }
    }

    return clearedCount;
  }

  /**
   * Check if any cells in the visible area are filled (game over condition).
   * Only checks the top visible row (row index = bufferHeight).
   */
  isOverflowing(): boolean {
    // Check if any cells in the buffer zone are filled
    for (let y = 0; y < this.config.bufferHeight; y++) {
      const row = this.grid[y];
      if (!row) continue;
      for (let x = 0; x < this.config.width; x++) {
        const cell = row[x];
        if (cell?.filled) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get all cells as a 2D array (for rendering).
   * Returns only the visible area (excluding buffer).
   */
  getVisibleGrid(): readonly (readonly Cell[])[] {
    return this.grid
      .slice(this.config.bufferHeight)
      .map((row) => row.map((cell) => ({ ...cell })));
  }

  /**
   * Get all cells including the buffer zone (for advanced rendering).
   */
  getFullGrid(): readonly (readonly Cell[])[] {
    return this.grid.map((row) => row.map((cell) => ({ ...cell })));
  }

  /**
   * Reset the board to an empty state.
   */
  reset(): void {
    for (let y = 0; y < this.totalHeight; y++) {
      const row = this.grid[y];
      if (!row) continue;
      for (let x = 0; x < this.config.width; x++) {
        row[x] = { filled: false, color: null };
      }
    }
  }

  /**
   * Calculate the position where a tetromino would land if dropped.
   * Used for rendering the ghost piece (drop preview).
   * @param tetromino - The tetromino to calculate drop position for
   * @returns The lowest valid position (same x, maximum y)
   */
  getTetrominoDropPosition(tetromino: Tetromino): Position {
    const testPiece = tetromino.clone();
    let lastValidY = testPiece.position.y;

    while (this.canPlaceTetromino(testPiece)) {
      lastValidY = testPiece.position.y;
      testPiece.move(0, 1);
    }

    return { x: tetromino.position.x, y: lastValidY };
  }
}
