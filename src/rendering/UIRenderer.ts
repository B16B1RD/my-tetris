/**
 * UI Renderer
 * @module rendering/UIRenderer
 * @description Renders overlay UI elements (menus, pause screen, game over) on canvas.
 */

import type {
  MenuItem,
  UIOverlayConfig,
  TransitionState,
  GameStats,
} from '../types/index.ts';
import { DEFAULT_UI_CONFIG, DEFAULT_CONFIG } from '../types/index.ts';

/**
 * Renders UI overlay screens on canvas.
 * Handles menu, pause, and game over screens with transitions.
 */
export class UIRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;
  private readonly config: UIOverlayConfig;

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number = DEFAULT_CONFIG.canvas.width,
    height: number = DEFAULT_CONFIG.canvas.height,
    config: UIOverlayConfig = DEFAULT_UI_CONFIG
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.config = config;
  }

  /**
   * Render the title/menu screen.
   */
  renderMenu(items: MenuItem[], selectedIndex: number): void {
    this.drawOverlayBackground();

    // Title
    this.ctx.fillStyle = this.config.titleColor;
    this.ctx.font = `bold 48px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('TETRIS', this.width / 2, this.height / 4);

    // Subtitle
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `16px ${this.config.fontFamily}`;
    this.ctx.fillText('Guideline Edition', this.width / 2, this.height / 4 + 40);

    // Menu items
    const startY = this.height / 2;
    const itemHeight = 50;

    items.forEach((item, index) => {
      const y = startY + index * itemHeight;
      const isSelected = index === selectedIndex;

      if (isSelected) {
        // Draw selection indicator
        this.ctx.fillStyle = this.config.highlightColor;
        this.ctx.font = `bold 24px ${this.config.fontFamily}`;
        this.ctx.fillText('▶', this.width / 2 - 80, y);
      }

      this.ctx.fillStyle = isSelected
        ? this.config.highlightColor
        : this.config.textColor;
      this.ctx.font = isSelected
        ? `bold 24px ${this.config.fontFamily}`
        : `24px ${this.config.fontFamily}`;
      this.ctx.fillText(item.label, this.width / 2, y);
    });

    // Instructions
    this.ctx.fillStyle = '#666666';
    this.ctx.font = `14px ${this.config.fontFamily}`;
    this.ctx.fillText(
      '↑↓: 選択  Enter: 決定',
      this.width / 2,
      this.height - 40
    );
  }

  /**
   * Render the pause screen overlay.
   */
  renderPause(): void {
    this.drawOverlayBackground();

    // PAUSED text
    this.ctx.fillStyle = this.config.titleColor;
    this.ctx.font = `bold 48px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 40);

    // Instructions
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `20px ${this.config.fontFamily}`;
    this.ctx.fillText('Press ESC to resume', this.width / 2, this.height / 2 + 20);

    // Additional hint
    this.ctx.fillStyle = '#666666';
    this.ctx.font = `16px ${this.config.fontFamily}`;
    this.ctx.fillText('Press Q to quit to menu', this.width / 2, this.height / 2 + 60);
  }

  /**
   * Render the game over screen.
   */
  renderGameOver(stats: GameStats, items: MenuItem[], selectedIndex: number): void {
    this.drawOverlayBackground();

    // GAME OVER text
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = `bold 48px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('GAME OVER', this.width / 2, this.height / 4);

    // Stats
    const statsY = this.height / 2 - 60;
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `24px ${this.config.fontFamily}`;
    this.ctx.fillText(`Score: ${stats.score.toLocaleString()}`, this.width / 2, statsY);
    this.ctx.font = `20px ${this.config.fontFamily}`;
    this.ctx.fillText(`Level: ${stats.level}`, this.width / 2, statsY + 35);
    this.ctx.fillText(`Lines: ${stats.lines}`, this.width / 2, statsY + 65);

    // Menu items
    const menuY = this.height / 2 + 60;
    const itemHeight = 45;

    items.forEach((item, index) => {
      const y = menuY + index * itemHeight;
      const isSelected = index === selectedIndex;

      if (isSelected) {
        this.ctx.fillStyle = this.config.highlightColor;
        this.ctx.font = `bold 22px ${this.config.fontFamily}`;
        this.ctx.fillText('▶', this.width / 2 - 70, y);
      }

      this.ctx.fillStyle = isSelected
        ? this.config.highlightColor
        : this.config.textColor;
      this.ctx.font = isSelected
        ? `bold 22px ${this.config.fontFamily}`
        : `22px ${this.config.fontFamily}`;
      this.ctx.fillText(item.label, this.width / 2, y);
    });

    // Instructions
    this.ctx.fillStyle = '#666666';
    this.ctx.font = `14px ${this.config.fontFamily}`;
    this.ctx.fillText('↑↓: 選択  Enter: 決定', this.width / 2, this.height - 40);
  }

  /**
   * Render a transition overlay (fade in/out).
   */
  renderTransition(transition: TransitionState): void {
    if (!transition.active) return;

    const alpha =
      transition.type === 'fade-in'
        ? 1 - transition.progress
        : transition.progress;

    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draw the semi-transparent background overlay.
   */
  private drawOverlayBackground(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
