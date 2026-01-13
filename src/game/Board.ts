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
import { Tetromino } from './Tetromino.ts';

/**
 * Represents the game board with cell state management.
 */
export class Board {
  private readonly config: BoardConfig;
  private readonly grid: Cell[][];

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
   * @returns true if the position is valid
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
   * @returns true if successful
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
   * Clear a row and shift all rows above down.
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
   * Clear all filled rows and return the number of rows cleared.
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
   * Get a list of positions where a tetromino would occupy.
   * Used for ghost piece calculation.
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
