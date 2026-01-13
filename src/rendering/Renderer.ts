/**
 * Base Renderer
 * @module rendering/Renderer
 * @description Base class for canvas rendering with common utilities.
 */

import type { GameConfig } from '../types/index.ts';
import { DEFAULT_CONFIG } from '../types/index.ts';

/**
 * Base renderer class providing common canvas operations.
 */
export class Renderer {
  protected readonly canvas: HTMLCanvasElement;
  protected readonly ctx: CanvasRenderingContext2D;
  protected readonly config: GameConfig['canvas'];

  constructor(canvas: HTMLCanvasElement, config: GameConfig['canvas'] = DEFAULT_CONFIG.canvas) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.config = config;
  }

  /** Canvas width in pixels */
  get width(): number {
    return this.config.width;
  }

  /** Canvas height in pixels */
  get height(): number {
    return this.config.height;
  }

  /** Cell size in pixels */
  get cellSize(): number {
    return this.config.cellSize;
  }

  /**
   * Clear the entire canvas.
   */
  clear(color?: string): void {
    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Draw a filled rectangle.
   */
  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  /**
   * Draw a stroked rectangle.
   */
  drawStrokedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    strokeColor: string,
    lineWidth = 1
  ): void {
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
  }

  /**
   * Draw a single cell at grid position.
   */
  drawCell(
    gridX: number,
    gridY: number,
    color: string,
    offsetX = 0,
    offsetY = 0
  ): void {
    const x = offsetX + gridX * this.cellSize;
    const y = offsetY + gridY * this.cellSize;
    const size = this.cellSize;

    // Main cell fill
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, size, size);

    // Highlight (top and left edges)
    this.ctx.fillStyle = this.lightenColor(color, 30);
    this.ctx.fillRect(x, y, size, 2);
    this.ctx.fillRect(x, y, 2, size);

    // Shadow (bottom and right edges)
    this.ctx.fillStyle = this.darkenColor(color, 30);
    this.ctx.fillRect(x, y + size - 2, size, 2);
    this.ctx.fillRect(x + size - 2, y, 2, size);
  }

  /**
   * Draw a ghost (transparent) cell at grid position.
   */
  drawGhostCell(
    gridX: number,
    gridY: number,
    color: string,
    offsetX = 0,
    offsetY = 0
  ): void {
    const x = offsetX + gridX * this.cellSize;
    const y = offsetY + gridY * this.cellSize;
    const size = this.cellSize;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.5;
    this.ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    this.ctx.globalAlpha = 1;
  }

  /**
   * Draw text at a position.
   */
  drawText(
    text: string,
    x: number,
    y: number,
    options: {
      color?: string;
      font?: string;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
    } = {}
  ): void {
    const {
      color = '#ffffff',
      font = '16px sans-serif',
      align = 'left',
      baseline = 'top',
    } = options;

    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    this.ctx.fillText(text, x, y);
  }

  /**
   * Lighten a hex color by a percentage.
   */
  protected lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, ((num >> 16) & 0xff) + amt);
    const G = Math.min(255, ((num >> 8) & 0xff) + amt);
    const B = Math.min(255, (num & 0xff) + amt);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  /**
   * Darken a hex color by a percentage.
   */
  protected darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, ((num >> 16) & 0xff) - amt);
    const G = Math.max(0, ((num >> 8) & 0xff) - amt);
    const B = Math.max(0, (num & 0xff) - amt);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  /**
   * Get the rendering context for direct access.
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
