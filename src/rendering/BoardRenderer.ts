/**
 * Board Renderer
 * @module rendering/BoardRenderer
 * @description Renders the game board, grid, and locked pieces.
 */

import type { GameConfig, TetrominoType, GameStats } from '../types/index.ts';
import { DEFAULT_CONFIG, BOARD_CONFIG } from '../types/index.ts';
import type { Board } from '../game/Board.ts';
import type { Tetromino } from '../game/Tetromino.ts';
import { TETROMINO_DEFS } from '../game/Tetromino.ts';
import { Renderer } from './Renderer.ts';

/** Rendering colors and styles */
const COLORS = {
  background: '#1a1a2e',
  gridLine: '#2a2a4e',
  border: '#4a4a6e',
  panelBackground: '#0a0a1e',
  panelBorder: '#3a3a5e',
  labelText: '#888888',
  holdDisabled: '#444444',
} as const;

/** Panel configuration */
const PANEL_CONFIG = {
  /** Width of NEXT/Hold panels in cells */
  panelWidthCells: 5,
  /** Height per preview item in cells */
  previewItemHeight: 3,
  /** Margin between board and panels in pixels */
  panelMargin: 10,
  /** Small cell size for preview pieces */
  previewCellSize: 16,
  /** Height of label area in pixels */
  labelAreaHeight: 30,
  /** Font for panel labels */
  labelFont: '12px monospace',
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

  /**
   * Render the NEXT queue panel showing upcoming pieces.
   * @param nextPieces - Array of upcoming tetromino types (up to 6)
   */
  renderNextPanel(nextPieces: TetrominoType[]): void {
    const panelX = this.boardOffsetX + this.boardWidth + PANEL_CONFIG.panelMargin;
    const panelY = this.boardOffsetY;
    const panelWidth = PANEL_CONFIG.panelWidthCells * PANEL_CONFIG.previewCellSize;
    const panelHeight = nextPieces.length * PANEL_CONFIG.previewItemHeight * PANEL_CONFIG.previewCellSize + PANEL_CONFIG.labelAreaHeight;

    // Draw panel background
    this.ctx.fillStyle = COLORS.panelBackground;
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Draw panel border
    this.ctx.strokeStyle = COLORS.panelBorder;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Draw "NEXT" label
    this.ctx.fillStyle = COLORS.labelText;
    this.ctx.font = PANEL_CONFIG.labelFont;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('NEXT', panelX + panelWidth / 2, panelY + 12);

    // Draw each preview piece
    for (let i = 0; i < nextPieces.length; i++) {
      const pieceType = nextPieces[i];
      if (pieceType) {
        const itemY = panelY + 25 + i * PANEL_CONFIG.previewItemHeight * PANEL_CONFIG.previewCellSize;
        this.drawPreviewPiece(pieceType, panelX + 8, itemY);
      }
    }
  }

  /**
   * Render the Hold panel showing the held piece.
   * @param heldPiece - The held tetromino type (null if empty)
   * @param holdUsed - Whether hold has been used this turn (grays out if true)
   */
  renderHoldPanel(heldPiece: TetrominoType | null, holdUsed: boolean): void {
    const panelWidth = PANEL_CONFIG.panelWidthCells * PANEL_CONFIG.previewCellSize;
    const panelHeight = PANEL_CONFIG.previewItemHeight * PANEL_CONFIG.previewCellSize + PANEL_CONFIG.labelAreaHeight;
    const panelX = this.boardOffsetX - panelWidth - PANEL_CONFIG.panelMargin;
    const panelY = this.boardOffsetY;

    // Draw panel background
    this.ctx.fillStyle = COLORS.panelBackground;
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Draw panel border (dimmed if hold is unavailable)
    this.ctx.strokeStyle = holdUsed ? COLORS.holdDisabled : COLORS.panelBorder;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Draw "HOLD" label
    this.ctx.fillStyle = holdUsed ? COLORS.holdDisabled : COLORS.labelText;
    this.ctx.font = PANEL_CONFIG.labelFont;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('HOLD', panelX + panelWidth / 2, panelY + 12);

    // Draw held piece (if any)
    if (heldPiece) {
      const itemY = panelY + 25;
      this.drawPreviewPiece(heldPiece, panelX + 8, itemY, holdUsed);
    }
  }

  /**
   * Draw a preview piece at the specified position.
   * @param type - Tetromino type to draw
   * @param x - X position in pixels
   * @param y - Y position in pixels
   * @param dimmed - Whether to draw the piece dimmed (for used hold)
   */
  private drawPreviewPiece(
    type: TetrominoType,
    x: number,
    y: number,
    dimmed = false
  ): void {
    const def = TETROMINO_DEFS[type];
    const shape = def.shapes[0]; // Use spawn state (rotation 0)
    const color = dimmed ? COLORS.holdDisabled : def.color;
    const cellSize = PANEL_CONFIG.previewCellSize;

    if (!shape) return;

    // Center the piece in the preview area
    // Calculate bounding box of the shape
    let minX = 4, maxX = 0, minY = 4, maxY = 0;
    for (let row = 0; row < shape.length; row++) {
      const shapeRow = shape[row];
      if (!shapeRow) continue;
      for (let col = 0; col < shapeRow.length; col++) {
        if (shapeRow[col] === 1) {
          minX = Math.min(minX, col);
          maxX = Math.max(maxX, col);
          minY = Math.min(minY, row);
          maxY = Math.max(maxY, row);
        }
      }
    }

    const shapeWidth = maxX - minX + 1;
    const shapeHeight = maxY - minY + 1;
    const previewWidth = PANEL_CONFIG.panelWidthCells * cellSize - 16;
    const previewHeight = PANEL_CONFIG.previewItemHeight * cellSize;
    const offsetX = x + (previewWidth - shapeWidth * cellSize) / 2 - minX * cellSize;
    const offsetY = y + (previewHeight - shapeHeight * cellSize) / 2 - minY * cellSize;

    // Draw the piece cells
    for (let row = 0; row < shape.length; row++) {
      const shapeRow = shape[row];
      if (!shapeRow) continue;
      for (let col = 0; col < shapeRow.length; col++) {
        if (shapeRow[col] === 1) {
          this.drawPreviewCell(offsetX + col * cellSize, offsetY + row * cellSize, color, cellSize);
        }
      }
    }
  }

  /**
   * Draw a single cell for preview pieces.
   */
  private drawPreviewCell(x: number, y: number, color: string, size: number): void {
    // Main cell fill
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, size, size);

    // Highlight (top and left edges)
    this.ctx.fillStyle = this.lightenColor(color, 30);
    this.ctx.fillRect(x, y, size, 1);
    this.ctx.fillRect(x, y, 1, size);

    // Shadow (bottom and right edges)
    this.ctx.fillStyle = this.darkenColor(color, 30);
    this.ctx.fillRect(x, y + size - 1, size, 1);
    this.ctx.fillRect(x + size - 1, y, 1, size);
  }

  /**
   * Render the score panel showing current game stats.
   * @param stats - Current game statistics
   */
  renderScorePanel(stats: GameStats): void {
    const panelWidth = PANEL_CONFIG.panelWidthCells * PANEL_CONFIG.previewCellSize;
    const panelHeight = 120;
    const panelX = this.boardOffsetX - panelWidth - PANEL_CONFIG.panelMargin;
    // Position below the Hold panel
    const holdPanelHeight = PANEL_CONFIG.previewItemHeight * PANEL_CONFIG.previewCellSize + PANEL_CONFIG.labelAreaHeight;
    const panelY = this.boardOffsetY + holdPanelHeight + PANEL_CONFIG.panelMargin;

    // Draw panel background
    this.ctx.fillStyle = COLORS.panelBackground;
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Draw panel border
    this.ctx.strokeStyle = COLORS.panelBorder;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Draw stats
    this.ctx.fillStyle = COLORS.labelText;
    this.ctx.font = PANEL_CONFIG.labelFont;
    this.ctx.textAlign = 'left';

    const textX = panelX + 8;
    let textY = panelY + 20;
    const lineHeight = 22;

    // Score
    this.ctx.fillText('SCORE', textX, textY);
    textY += 14;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.fillText(stats.score.toLocaleString(), textX, textY);

    // Level
    textY += lineHeight;
    this.ctx.fillStyle = COLORS.labelText;
    this.ctx.font = PANEL_CONFIG.labelFont;
    this.ctx.fillText('LEVEL', textX, textY);
    textY += 14;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.fillText(String(stats.level), textX, textY);

    // Lines
    textY += lineHeight;
    this.ctx.fillStyle = COLORS.labelText;
    this.ctx.font = PANEL_CONFIG.labelFont;
    this.ctx.fillText('LINES', textX, textY);
    textY += 14;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.fillText(String(stats.lines), textX, textY);
  }
}
