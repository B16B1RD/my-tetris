/**
 * Board Renderer
 * @module rendering/BoardRenderer
 * @description Renders the game board, grid, and locked pieces.
 */

import type { GameConfig } from '../types/index.ts';
import { DEFAULT_CONFIG, BOARD_CONFIG } from '../types/index.ts';
import type { Board } from '../game/Board.ts';
import type { Tetromino } from '../game/Tetromino.ts';
import { Renderer } from './Renderer.ts';

/** Rendering colors and styles */
const COLORS = {
  background: '#1a1a2e',
  gridLine: '#2a2a4e',
  border: '#4a4a6e',
} as const;

/**
 * Renderer for the game board with grid and blocks.
 */
export class BoardRenderer extends Renderer {
  private readonly boardOffsetX: number;
  private readonly boardOffsetY: number;
  private readonly boardWidth: number;
  private readonly boardHeight: number;

  constructor(canvas: HTMLCanvasElement, config: GameConfig['canvas'] = DEFAULT_CONFIG.canvas) {
    super(canvas, config);

    // Calculate board dimensions
    this.boardWidth = BOARD_CONFIG.width * this.cellSize;
    this.boardHeight = BOARD_CONFIG.height * this.cellSize;

    // Center the board horizontally, with some top padding
    this.boardOffsetX = Math.floor((this.width - this.boardWidth) / 2);
    this.boardOffsetY = Math.floor((this.height - this.boardHeight) / 2);
  }

  /** X offset where the board starts */
  get offsetX(): number {
    return this.boardOffsetX;
  }

  /** Y offset where the board starts */
  get offsetY(): number {
    return this.boardOffsetY;
  }

  /**
   * Render the complete board state.
   */
  render(
    board: Board,
    activeTetromino?: Tetromino,
    ghostPosition?: { x: number; y: number }
  ): void {
    // Clear and draw background
    this.clear(COLORS.background);

    // Draw board background
    this.drawBoardBackground();

    // Draw grid lines
    this.drawGrid();

    // Draw locked pieces
    this.drawLockedPieces(board);

    // Draw ghost piece (if provided)
    if (activeTetromino && ghostPosition) {
      this.drawGhostPiece(activeTetromino, ghostPosition);
    }

    // Draw active tetromino (if provided)
    if (activeTetromino) {
      this.drawTetromino(activeTetromino);
    }

    // Draw board border
    this.drawBorder();
  }

  /**
   * Draw the board background area.
   */
  private drawBoardBackground(): void {
    this.ctx.fillStyle = '#0a0a1e';
    this.ctx.fillRect(
      this.boardOffsetX,
      this.boardOffsetY,
      this.boardWidth,
      this.boardHeight
    );
  }

  /**
   * Draw the grid lines on the board.
   * Uses a single path for all lines to optimize rendering performance.
   */
  private drawGrid(): void {
    this.ctx.strokeStyle = COLORS.gridLine;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    // Vertical lines
    for (let x = 0; x <= BOARD_CONFIG.width; x++) {
      const lineX = this.boardOffsetX + x * this.cellSize;
      this.ctx.moveTo(lineX, this.boardOffsetY);
      this.ctx.lineTo(lineX, this.boardOffsetY + this.boardHeight);
    }

    // Horizontal lines
    for (let y = 0; y <= BOARD_CONFIG.height; y++) {
      const lineY = this.boardOffsetY + y * this.cellSize;
      this.ctx.moveTo(this.boardOffsetX, lineY);
      this.ctx.lineTo(this.boardOffsetX + this.boardWidth, lineY);
    }

    this.ctx.stroke();
  }

  /**
   * Draw all locked pieces on the board.
   */
  private drawLockedPieces(board: Board): void {
    const grid = board.getVisibleGrid();

    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (cell?.filled && cell.color) {
          this.drawCell(x, y, cell.color, this.boardOffsetX, this.boardOffsetY);
        }
      }
    }
  }

  /**
   * Draw the active tetromino.
   */
  private drawTetromino(tetromino: Tetromino): void {
    const cells = tetromino.getCells();
    const visibleY = BOARD_CONFIG.bufferHeight;

    for (const cell of cells) {
      // Only draw cells that are in the visible area
      const displayY = cell.y - visibleY;
      if (displayY >= 0) {
        this.drawCell(
          cell.x,
          displayY,
          tetromino.color,
          this.boardOffsetX,
          this.boardOffsetY
        );
      }
    }
  }

  /**
   * Draw the ghost piece (drop preview).
   */
  private drawGhostPiece(
    tetromino: Tetromino,
    ghostPosition: { x: number; y: number }
  ): void {
    const shape = tetromino.shape;
    const visibleY = BOARD_CONFIG.bufferHeight;

    for (let row = 0; row < shape.length; row++) {
      const shapeRow = shape[row];
      if (!shapeRow) continue;
      for (let col = 0; col < shapeRow.length; col++) {
        if (shapeRow[col] === 1) {
          const cellY = ghostPosition.y + row - visibleY;
          if (cellY >= 0) {
            this.drawGhostCell(
              ghostPosition.x + col,
              cellY,
              tetromino.color,
              this.boardOffsetX,
              this.boardOffsetY
            );
          }
        }
      }
    }
  }

  /**
   * Draw the border around the board.
   */
  private drawBorder(): void {
    this.ctx.strokeStyle = COLORS.border;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      this.boardOffsetX - 1,
      this.boardOffsetY - 1,
      this.boardWidth + 2,
      this.boardHeight + 2
    );
  }

  /**
   * Convert screen coordinates to board grid coordinates.
   * @returns Grid position or null if outside the board
   */
  screenToGrid(screenX: number, screenY: number): { x: number; y: number } | null {
    const relX = screenX - this.boardOffsetX;
    const relY = screenY - this.boardOffsetY;

    if (relX < 0 || relX >= this.boardWidth || relY < 0 || relY >= this.boardHeight) {
      return null;
    }

    return {
      x: Math.floor(relX / this.cellSize),
      y: Math.floor(relY / this.cellSize),
    };
  }
}
