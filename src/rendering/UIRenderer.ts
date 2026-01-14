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
  HighScoreEntry,
} from '../types/index.ts';
import { DEFAULT_UI_CONFIG, DEFAULT_CONFIG } from '../types/index.ts';
import { MAX_HIGH_SCORES } from '../storage/Storage.ts';

/** Font sizes used in UI rendering */
const FONT_SIZES = {
  title: 48,
  subtitle: 16,
  menuItem: 24,
  menuItemSelected: 24,
  instruction: 14,
  pauseTitle: 48,
  pauseInstruction: 20,
  pauseHint: 16,
  gameOverTitle: 48,
  gameOverScore: 24,
  gameOverStats: 20,
  gameOverMenuItem: 22,
  // Ranking screen
  rankingTitle: 36,
  rankingHeader: 16,
  rankingEntry: 18,
  rankingEntryHighlight: 18,
  // Name input screen
  nameInputTitle: 32,
  nameInputLabel: 20,
  nameInputValue: 36,
} as const;

/** Layout spacing values */
const LAYOUT = {
  /** Offset from title to subtitle */
  subtitleOffset: 40,
  /** Height per menu item */
  menuItemHeight: 50,
  /** X offset for selection indicator */
  selectorOffsetX: 80,
  /** Game over menu item height */
  gameOverMenuItemHeight: 45,
  /** Game over selector X offset */
  gameOverSelectorOffsetX: 70,
  /** Pause text vertical offsets */
  pauseTitleOffsetY: -40,
  pauseInstructionOffsetY: 20,
  pauseHintOffsetY: 60,
  /** Game over stats vertical offsets */
  statsOffsetY: -60,
  statsLineSpacing: 35,
  statsLineSpacing2: 65,
  gameOverMenuOffsetY: 60,
  /** Bottom margin for instructions */
  instructionBottomMargin: 40,
  /** Ranking screen layout */
  rankingTitleY: 60,
  rankingTableY: 110,
  rankingRowHeight: 28,
  rankingColRank: 40,
  rankingColName: 100,
  rankingColScore: 220,
  rankingColLevel: 310,
  /** Name input screen layout */
  nameInputTitleY: 100,
  nameInputScoreY: 160,
  nameInputLabelY: 240,
  nameInputValueY: 290,
  nameInputCursorWidth: 20,
  nameInputCursorOffsetY: 15,
} as const;

/** Colors for UI elements */
const UI_COLORS = {
  hintText: '#666666',
  gameOverTitle: '#ff4444',
  rankingNew: '#ffdd00',
  rankingHeader: '#888888',
  nameInputCursor: '#00ffff',
} as const;

/**
 * Renders UI overlay screens on canvas.
 * Handles menu, pause, and game over screens with transitions.
 */
export class UIRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;
  private readonly config: UIOverlayConfig;
  /** Cached width of "AAA" text for name input cursor positioning */
  private nameInputTextWidth: number | null = null;

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
    this.ctx.font = `bold ${FONT_SIZES.title}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('TETRIS', this.width / 2, this.height / 4);

    // Subtitle
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `${FONT_SIZES.subtitle}px ${this.config.fontFamily}`;
    this.ctx.fillText('Guideline Edition', this.width / 2, this.height / 4 + LAYOUT.subtitleOffset);

    // Menu items
    const startY = this.height / 2;

    items.forEach((item, index) => {
      const y = startY + index * LAYOUT.menuItemHeight;
      const isSelected = index === selectedIndex;

      if (isSelected) {
        // Draw selection indicator
        this.ctx.fillStyle = this.config.highlightColor;
        this.ctx.font = `bold ${FONT_SIZES.menuItemSelected}px ${this.config.fontFamily}`;
        this.ctx.fillText('▶', this.width / 2 - LAYOUT.selectorOffsetX, y);
      }

      this.ctx.fillStyle = isSelected
        ? this.config.highlightColor
        : this.config.textColor;
      this.ctx.font = isSelected
        ? `bold ${FONT_SIZES.menuItemSelected}px ${this.config.fontFamily}`
        : `${FONT_SIZES.menuItem}px ${this.config.fontFamily}`;
      this.ctx.fillText(item.label, this.width / 2, y);
    });

    // Instructions
    this.ctx.fillStyle = UI_COLORS.hintText;
    this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
    this.ctx.fillText(
      '↑↓: 選択  Enter: 決定',
      this.width / 2,
      this.height - LAYOUT.instructionBottomMargin
    );
  }

  /**
   * Render the pause screen overlay.
   */
  renderPause(): void {
    this.drawOverlayBackground();

    // PAUSED text
    this.ctx.fillStyle = this.config.titleColor;
    this.ctx.font = `bold ${FONT_SIZES.pauseTitle}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('PAUSED', this.width / 2, this.height / 2 + LAYOUT.pauseTitleOffsetY);

    // Instructions
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `${FONT_SIZES.pauseInstruction}px ${this.config.fontFamily}`;
    this.ctx.fillText('ESC: 再開', this.width / 2, this.height / 2 + LAYOUT.pauseInstructionOffsetY);

    // Additional hint
    this.ctx.fillStyle = UI_COLORS.hintText;
    this.ctx.font = `${FONT_SIZES.pauseHint}px ${this.config.fontFamily}`;
    this.ctx.fillText('Q: メニューに戻る', this.width / 2, this.height / 2 + LAYOUT.pauseHintOffsetY);
  }

  /**
   * Render the game over screen.
   */
  renderGameOver(stats: GameStats, items: MenuItem[], selectedIndex: number): void {
    this.drawOverlayBackground();

    // GAME OVER text
    this.ctx.fillStyle = UI_COLORS.gameOverTitle;
    this.ctx.font = `bold ${FONT_SIZES.gameOverTitle}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('GAME OVER', this.width / 2, this.height / 4);

    // Stats
    const statsY = this.height / 2 + LAYOUT.statsOffsetY;
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `${FONT_SIZES.gameOverScore}px ${this.config.fontFamily}`;
    this.ctx.fillText(`Score: ${stats.score.toLocaleString()}`, this.width / 2, statsY);
    this.ctx.font = `${FONT_SIZES.gameOverStats}px ${this.config.fontFamily}`;
    this.ctx.fillText(`Level: ${stats.level}`, this.width / 2, statsY + LAYOUT.statsLineSpacing);
    this.ctx.fillText(`Lines: ${stats.lines}`, this.width / 2, statsY + LAYOUT.statsLineSpacing2);

    // Menu items
    const menuY = this.height / 2 + LAYOUT.gameOverMenuOffsetY;

    items.forEach((item, index) => {
      const y = menuY + index * LAYOUT.gameOverMenuItemHeight;
      const isSelected = index === selectedIndex;

      if (isSelected) {
        this.ctx.fillStyle = this.config.highlightColor;
        this.ctx.font = `bold ${FONT_SIZES.gameOverMenuItem}px ${this.config.fontFamily}`;
        this.ctx.fillText('▶', this.width / 2 - LAYOUT.gameOverSelectorOffsetX, y);
      }

      this.ctx.fillStyle = isSelected
        ? this.config.highlightColor
        : this.config.textColor;
      this.ctx.font = isSelected
        ? `bold ${FONT_SIZES.gameOverMenuItem}px ${this.config.fontFamily}`
        : `${FONT_SIZES.gameOverMenuItem}px ${this.config.fontFamily}`;
      this.ctx.fillText(item.label, this.width / 2, y);
    });

    // Instructions
    this.ctx.fillStyle = UI_COLORS.hintText;
    this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
    this.ctx.fillText('↑↓: 選択  Enter: 決定', this.width / 2, this.height - LAYOUT.instructionBottomMargin);
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
   * Render the ranking/high scores screen.
   * @param scores - Array of high score entries
   * @param highlightIndex - Index to highlight as new entry (-1 for none)
   */
  renderRanking(scores: HighScoreEntry[], highlightIndex = -1): void {
    this.drawOverlayBackground();

    // Title
    this.ctx.fillStyle = this.config.titleColor;
    this.ctx.font = `bold ${FONT_SIZES.rankingTitle}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('HIGH SCORES', this.width / 2, LAYOUT.rankingTitleY);

    // Header row
    this.ctx.fillStyle = UI_COLORS.rankingHeader;
    this.ctx.font = `${FONT_SIZES.rankingHeader}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'left';
    const headerY = LAYOUT.rankingTableY;
    this.ctx.fillText('#', LAYOUT.rankingColRank, headerY);
    this.ctx.fillText('NAME', LAYOUT.rankingColName, headerY);
    this.ctx.fillText('SCORE', LAYOUT.rankingColScore, headerY);
    this.ctx.fillText('LV', LAYOUT.rankingColLevel, headerY);

    // Score entries
    for (let i = 0; i < MAX_HIGH_SCORES; i++) {
      const y = LAYOUT.rankingTableY + (i + 1) * LAYOUT.rankingRowHeight;
      const entry = scores[i];
      const isHighlight = i === highlightIndex;

      this.ctx.fillStyle = isHighlight
        ? UI_COLORS.rankingNew
        : this.config.textColor;
      this.ctx.font = isHighlight
        ? `bold ${FONT_SIZES.rankingEntryHighlight}px ${this.config.fontFamily}`
        : `${FONT_SIZES.rankingEntry}px ${this.config.fontFamily}`;
      this.ctx.textAlign = 'left';

      // Rank
      this.ctx.fillText(`${i + 1}.`, LAYOUT.rankingColRank, y);

      if (entry) {
        // Name
        this.ctx.fillText(entry.name, LAYOUT.rankingColName, y);
        // Score
        this.ctx.fillText(entry.score.toLocaleString(), LAYOUT.rankingColScore, y);
        // Level
        this.ctx.fillText(`${entry.level}`, LAYOUT.rankingColLevel, y);
      } else {
        // Empty slot
        this.ctx.fillStyle = UI_COLORS.hintText;
        this.ctx.fillText('---', LAYOUT.rankingColName, y);
        this.ctx.fillText('---', LAYOUT.rankingColScore, y);
        this.ctx.fillText('-', LAYOUT.rankingColLevel, y);
      }
    }

    // Instructions
    this.ctx.fillStyle = UI_COLORS.hintText;
    this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      'Enter: 続ける  Esc: メニュー',
      this.width / 2,
      this.height - LAYOUT.instructionBottomMargin
    );
  }

  /**
   * Render the name input screen.
   * @param score - The achieved score
   * @param rank - The rank achieved (1-10)
   * @param currentName - Current input name
   * @param showCursor - Whether to show blinking cursor
   */
  renderNameInput(
    score: number,
    rank: number,
    currentName: string,
    showCursor = true
  ): void {
    this.drawOverlayBackground();

    // Title - NEW HIGH SCORE!
    this.ctx.fillStyle = UI_COLORS.rankingNew;
    this.ctx.font = `bold ${FONT_SIZES.nameInputTitle}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('NEW HIGH SCORE!', this.width / 2, LAYOUT.nameInputTitleY);

    // Score and rank
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `${FONT_SIZES.gameOverScore}px ${this.config.fontFamily}`;
    this.ctx.fillText(
      `#${rank} - ${score.toLocaleString()} pts`,
      this.width / 2,
      LAYOUT.nameInputScoreY
    );

    // Enter name label
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `${FONT_SIZES.nameInputLabel}px ${this.config.fontFamily}`;
    this.ctx.fillText('Enter your name:', this.width / 2, LAYOUT.nameInputLabelY);

    // Name input field
    this.ctx.fillStyle = this.config.highlightColor;
    this.ctx.font = `bold ${FONT_SIZES.nameInputValue}px ${this.config.fontFamily}`;

    // Display name with padding for 3 characters
    const displayName = currentName.padEnd(3, '_');
    // Cache measureText result to avoid per-frame calls (same font is set above)
    if (this.nameInputTextWidth === null) {
      this.nameInputTextWidth = this.ctx.measureText('AAA').width;
    }
    const nameWidth = this.nameInputTextWidth;
    const nameX = this.width / 2 - nameWidth / 2;

    this.ctx.textAlign = 'left';
    this.ctx.fillText(displayName, nameX, LAYOUT.nameInputValueY);

    // Blinking cursor
    if (showCursor && currentName.length < 3) {
      const cursorX = nameX + this.ctx.measureText(currentName).width;
      this.ctx.fillStyle = UI_COLORS.nameInputCursor;
      this.ctx.fillRect(
        cursorX,
        LAYOUT.nameInputValueY - LAYOUT.nameInputCursorOffsetY,
        LAYOUT.nameInputCursorWidth,
        3
      );
    }

    // Instructions
    this.ctx.fillStyle = UI_COLORS.hintText;
    this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      'A-Z のみ入力可  Backspace: 削除  Enter: 確定  Esc: キャンセル',
      this.width / 2,
      this.height - LAYOUT.instructionBottomMargin
    );
  }

  /**
   * Draw the semi-transparent background overlay.
   */
  private drawOverlayBackground(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
