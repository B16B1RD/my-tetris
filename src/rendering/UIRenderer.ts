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
  ReplayData,
  ReplayPlaybackState,
  Statistics,
  KeyBindings,
} from '../types/index.ts';
import { DEFAULT_UI_CONFIG, DEFAULT_CONFIG } from '../types/index.ts';
import { ReplaySystem } from '../systems/ReplaySystem.ts';
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
  // Replay screen
  replaySelectTitle: 36,
  replayEntry: 16,
  replayEntrySelected: 16,
  replayHud: 14,
  replayHudSpeed: 18,
  // Settings screen
  settingsTitle: 36,
  settingsLabel: 18,
  settingsKey: 16,
  // Statistics screen
  statisticsTitle: 36,
  statisticsLabel: 18,
  statisticsValue: 24,
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
  /** Replay select screen layout */
  replaySelectTitleY: 50,
  replayListY: 100,
  replayRowHeight: 55,
  replayEmptyY: 250,
  /** Replay HUD layout */
  replayHudPadding: 10,
  replayHudBarHeight: 4,
  replayHudBarWidth: 200,
  replayHudTopBarHeight: 35,
  replayHudBottomBarHeight: 30,
  replayHudTopTextY: 18,
  replayHudProgressBarX: 120,
  /**
   * Replay select screen item layout.
   * Note: replayListPaddingX is left padding, replayListItemPaddingX is right padding
   * for the highlight background. Different values create a visual indent effect.
   */
  replayListPaddingX: 20,
  replayListItemPaddingX: 40,
  replaySelectorX: 30,
  replayDateX: 50,
  replayScoreOffsetX: 120,
  replayDurationOffsetX: 30,
  replayLevelInfoOffsetY: 18,
  /** Replay HUD bottom text Y offset from bottomY */
  replayHudBottomTextY: 15,
  /** Replay HUD progress bar Y offset from bottomY */
  replayHudProgressBarY: 12,
  /** Replay finished screen layout */
  replayFinishedTitleOffsetY: -20,
  replayFinishedTextOffsetY: 30,
  /** Settings screen layout */
  settingsTitleY: 50,
  settingsTableY: 100,
  settingsRowHeight: 35,
  settingsLabelX: 50,
  settingsKeyX: 250,
  /** Statistics screen layout */
  statisticsTitleY: 50,
  statisticsTableY: 110,
  statisticsRowHeight: 40,
  statisticsLabelX: 50,
  statisticsValueX: 350,
  statisticsResetY: 530,
} as const;

/** Colors for UI elements */
const UI_COLORS = {
  hintText: '#666666',
  gameOverTitle: '#ff4444',
  rankingNew: '#ffdd00',
  rankingHeader: '#888888',
  nameInputCursor: '#00ffff',
  replayProgress: '#00ffff',
  replayProgressBg: '#333333',
  replayPaused: '#ffaa00',
  replaySelectHighlight: 'rgba(0, 255, 255, 0.1)',
  settingsKeyBg: 'rgba(255, 255, 255, 0.1)',
  statisticsValue: '#00ffff',
  resetWarning: '#ff6666',
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
  /** Cached character width for name input (monospace assumption for cursor positioning) */
  private nameInputCharWidth: number | null = null;

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
      // Cache character width to avoid measureText per frame
      if (this.nameInputCharWidth === null) {
        this.nameInputCharWidth = this.ctx.measureText('A').width;
      }
      const cursorX = nameX + this.nameInputCharWidth * currentName.length;
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
   * Render the replay selection screen.
   * @param replays - Array of saved replays
   * @param selectedIndex - Currently selected replay index
   */
  renderReplaySelect(replays: ReplayData[], selectedIndex: number): void {
    this.drawOverlayBackground();

    // Title
    this.ctx.fillStyle = this.config.titleColor;
    this.ctx.font = `bold ${FONT_SIZES.replaySelectTitle}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('REPLAYS', this.width / 2, LAYOUT.replaySelectTitleY);

    if (replays.length === 0) {
      // No replays message
      this.ctx.fillStyle = UI_COLORS.hintText;
      this.ctx.font = `${FONT_SIZES.replayEntry}px ${this.config.fontFamily}`;
      this.ctx.fillText('リプレイがありません', this.width / 2, LAYOUT.replayEmptyY);
    } else {
      // Replay entries
      for (let i = 0; i < replays.length; i++) {
        const replay = replays[i];
        if (!replay) continue;

        const y = LAYOUT.replayListY + i * LAYOUT.replayRowHeight;
        const isSelected = i === selectedIndex;

        // Background highlight for selected
        // Note: Width calculation intentionally uses different padding values to create
        // a visual indent effect (left: replayListPaddingX, right: replayListItemPaddingX)
        if (isSelected) {
          this.ctx.fillStyle = UI_COLORS.replaySelectHighlight;
          this.ctx.fillRect(
            LAYOUT.replayListPaddingX,
            y - 20,
            this.width - LAYOUT.replayListItemPaddingX,
            LAYOUT.replayRowHeight - 5
          );

          // Selection indicator
          this.ctx.fillStyle = this.config.highlightColor;
          this.ctx.font = `bold ${FONT_SIZES.replayEntrySelected}px ${this.config.fontFamily}`;
          this.ctx.textAlign = 'left';
          this.ctx.fillText('▶', LAYOUT.replaySelectorX, y);
        }

        // Replay info
        this.ctx.fillStyle = isSelected ? this.config.highlightColor : this.config.textColor;
        this.ctx.font = isSelected
          ? `bold ${FONT_SIZES.replayEntrySelected}px ${this.config.fontFamily}`
          : `${FONT_SIZES.replayEntry}px ${this.config.fontFamily}`;
        this.ctx.textAlign = 'left';

        // Date (formatted) - year omitted as MAX_REPLAYS=5 keeps only recent replays
        const date = new Date(replay.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        this.ctx.fillText(dateStr, LAYOUT.replayDateX, y);

        // Score
        this.ctx.textAlign = 'right';
        this.ctx.fillText(
          `${replay.finalScore.toLocaleString()} pts`,
          this.width - LAYOUT.replayScoreOffsetX,
          y
        );

        // Duration
        this.ctx.fillStyle = isSelected ? this.config.textColor : UI_COLORS.hintText;
        this.ctx.fillText(
          ReplaySystem.formatTime(replay.duration),
          this.width - LAYOUT.replayDurationOffsetX,
          y
        );

        // Level info (second line)
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = UI_COLORS.hintText;
        this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
        this.ctx.fillText(
          `Lv.${replay.finalLevel} / ${replay.finalLines} lines`,
          LAYOUT.replayDateX,
          y + LAYOUT.replayLevelInfoOffsetY
        );
      }
    }

    // Instructions
    this.ctx.fillStyle = UI_COLORS.hintText;
    this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      '↑↓: 選択  Enter: 再生  Esc: 戻る',
      this.width / 2,
      this.height - LAYOUT.instructionBottomMargin
    );
  }

  /**
   * Render the replay playback HUD overlay.
   * @param state - Current replay playback state
   */
  renderReplayHUD(state: ReplayPlaybackState): void {
    const padding = LAYOUT.replayHudPadding;

    // Top bar with "REPLAY" indicator and speed
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, LAYOUT.replayHudTopBarHeight);

    // "REPLAY" text
    this.ctx.fillStyle = state.paused ? UI_COLORS.replayPaused : this.config.highlightColor;
    this.ctx.font = `bold ${FONT_SIZES.replayHud}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(state.paused ? '▐▐ PAUSED' : '▶ REPLAY', padding, LAYOUT.replayHudTopTextY);

    // Speed indicator
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `bold ${FONT_SIZES.replayHudSpeed}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${state.speed}x`, this.width - padding, LAYOUT.replayHudTopTextY);

    // Bottom bar with progress
    const bottomY = this.height - LAYOUT.replayHudBottomBarHeight;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, bottomY, this.width, LAYOUT.replayHudBottomBarHeight);

    // Time display
    const currentTimeStr = ReplaySystem.formatTime(state.currentTime);
    const totalTimeStr = ReplaySystem.formatTime(state.replay.duration);
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `${FONT_SIZES.replayHud}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${currentTimeStr} / ${totalTimeStr}`, padding, bottomY + LAYOUT.replayHudBottomTextY);

    // Progress bar
    const barX = LAYOUT.replayHudProgressBarX;
    const barWidth = LAYOUT.replayHudBarWidth;
    const barY = bottomY + LAYOUT.replayHudProgressBarY;

    // Background
    this.ctx.fillStyle = UI_COLORS.replayProgressBg;
    this.ctx.fillRect(barX, barY, barWidth, LAYOUT.replayHudBarHeight);

    // Progress
    const progress = ReplaySystem.getProgress(state) / 100;
    this.ctx.fillStyle = UI_COLORS.replayProgress;
    this.ctx.fillRect(barX, barY, barWidth * progress, LAYOUT.replayHudBarHeight);

    // Controls hint
    this.ctx.fillStyle = UI_COLORS.hintText;
    this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Space: 再生/一時停止  ←→: 速度  Esc: 終了', this.width - padding, bottomY + LAYOUT.replayHudBottomTextY);
  }

  /**
   * Render the replay finished overlay.
   */
  renderReplayFinished(): void {
    this.drawOverlayBackground();

    this.ctx.fillStyle = this.config.titleColor;
    this.ctx.font = `bold ${FONT_SIZES.pauseTitle}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('REPLAY FINISHED', this.width / 2, this.height / 2 + LAYOUT.replayFinishedTitleOffsetY);

    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `${FONT_SIZES.pauseInstruction}px ${this.config.fontFamily}`;
    this.ctx.fillText('何かキーを押して続ける', this.width / 2, this.height / 2 + LAYOUT.replayFinishedTextOffsetY);
  }

  /**
   * Render the settings screen.
   * @param keyBindings - Current key bindings to display
   */
  renderSettings(keyBindings: KeyBindings): void {
    this.drawOverlayBackground();

    // Title
    this.ctx.fillStyle = this.config.titleColor;
    this.ctx.font = `bold ${FONT_SIZES.settingsTitle}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('SETTINGS', this.width / 2, LAYOUT.settingsTitleY);

    // Key bindings header
    this.ctx.fillStyle = UI_COLORS.rankingHeader;
    this.ctx.font = `${FONT_SIZES.rankingHeader}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'left';
    const headerY = LAYOUT.settingsTableY;
    this.ctx.fillText('操作', LAYOUT.settingsLabelX, headerY);
    this.ctx.fillText('キー', LAYOUT.settingsKeyX, headerY);

    // Key binding entries (Japanese labels for consistency with other UI text)
    const actions: { label: string; action: keyof KeyBindings }[] = [
      { label: '左移動', action: 'moveLeft' },
      { label: '右移動', action: 'moveRight' },
      { label: 'ソフトドロップ', action: 'softDrop' },
      { label: 'ハードドロップ', action: 'hardDrop' },
      { label: '右回転', action: 'rotateClockwise' },
      { label: '左回転', action: 'rotateCounterClockwise' },
      { label: 'ホールド', action: 'hold' },
      { label: '一時停止', action: 'pause' },
    ];

    actions.forEach((item, index) => {
      const y = LAYOUT.settingsTableY + (index + 1) * LAYOUT.settingsRowHeight;

      // Action label
      this.ctx.fillStyle = this.config.textColor;
      this.ctx.font = `${FONT_SIZES.settingsLabel}px ${this.config.fontFamily}`;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(item.label, LAYOUT.settingsLabelX, y);

      // Key display
      const keys = keyBindings[item.action];
      const keyDisplay = keys.length > 0 ? keys[0] ?? '-' : '-';

      // Key background
      this.ctx.fillStyle = UI_COLORS.settingsKeyBg;
      const keyText = this.formatKeyDisplay(keyDisplay);
      const keyWidth = Math.max(60, this.ctx.measureText(keyText).width + 20);
      this.ctx.fillRect(LAYOUT.settingsKeyX - 10, y - 12, keyWidth, 24);

      // Key text
      this.ctx.fillStyle = this.config.highlightColor;
      this.ctx.font = `${FONT_SIZES.settingsKey}px ${this.config.fontFamily}`;
      this.ctx.fillText(keyText, LAYOUT.settingsKeyX, y);
    });

    // Note about future expansion
    // TODO: Remove this message when key binding customization is implemented
    this.ctx.fillStyle = UI_COLORS.hintText;
    this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      'キー設定の変更は将来のバージョンで追加予定',
      this.width / 2,
      this.height - 80
    );

    // Instructions
    this.ctx.fillText(
      'Esc: 戻る',
      this.width / 2,
      this.height - LAYOUT.instructionBottomMargin
    );
  }

  /**
   * Format key display for settings screen.
   */
  private formatKeyDisplay(key: string): string {
    const keyMap: Record<string, string> = {
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowUp: '↑',
      ArrowDown: '↓',
      ' ': 'Space',
      Escape: 'Esc',
    };
    return keyMap[key] ?? key.toUpperCase();
  }

  /**
   * Render the statistics screen.
   * @param stats - Cumulative statistics to display
   * @param showResetConfirm - Whether to show reset confirmation
   */
  renderStatistics(stats: Statistics, showResetConfirm = false): void {
    this.drawOverlayBackground();

    // Title
    this.ctx.fillStyle = this.config.titleColor;
    this.ctx.font = `bold ${FONT_SIZES.statisticsTitle}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('STATISTICS', this.width / 2, LAYOUT.statisticsTitleY);

    // Statistics entries
    const entries: { label: string; value: string }[] = [
      { label: 'Total Play Time', value: this.formatPlayTime(stats.totalPlayTime) },
      { label: 'Games Played', value: stats.gamesPlayed.toLocaleString() },
      { label: 'Total Lines Cleared', value: stats.totalLinesCleared.toLocaleString() },
      { label: 'Total Tetris', value: stats.totalTetris.toLocaleString() },
      {
        label: 'Tetris Rate',
        value: this.calculateTetrisRate(stats.totalLinesCleared, stats.totalTetris),
      },
      { label: 'Highest Level', value: stats.highestLevel.toString() },
      { label: 'Total T-Spins', value: stats.totalTSpins.toLocaleString() },
    ];

    entries.forEach((entry, index) => {
      const y = LAYOUT.statisticsTableY + index * LAYOUT.statisticsRowHeight;

      // Label
      this.ctx.fillStyle = this.config.textColor;
      this.ctx.font = `${FONT_SIZES.statisticsLabel}px ${this.config.fontFamily}`;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(entry.label, LAYOUT.statisticsLabelX, y);

      // Value
      this.ctx.fillStyle = UI_COLORS.statisticsValue;
      this.ctx.font = `bold ${FONT_SIZES.statisticsValue}px ${this.config.fontFamily}`;
      this.ctx.textAlign = 'right';
      this.ctx.fillText(entry.value, LAYOUT.statisticsValueX, y);
    });

    // Reset data option
    if (showResetConfirm) {
      // Reset confirmation dialog - centered using relative coordinates
      const dialogWidth = this.width - 80;
      const dialogHeight = 200;
      const dialogX = (this.width - dialogWidth) / 2;
      const dialogY = (this.height - dialogHeight) / 2;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      this.ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);

      this.ctx.fillStyle = UI_COLORS.resetWarning;
      this.ctx.font = `bold ${FONT_SIZES.nameInputTitle}px ${this.config.fontFamily}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('データをリセットしますか?', this.width / 2, dialogY + 60);

      this.ctx.fillStyle = this.config.textColor;
      this.ctx.font = `${FONT_SIZES.settingsLabel}px ${this.config.fontFamily}`;
      this.ctx.fillText(
        'スコア、リプレイ、統計データがすべて削除されます',
        this.width / 2,
        dialogY + 110
      );

      this.ctx.fillStyle = UI_COLORS.hintText;
      this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
      this.ctx.fillText('Enter: 確定  Esc: キャンセル', this.width / 2, dialogY + 160);
    } else {
      // Reset hint
      this.ctx.fillStyle = UI_COLORS.hintText;
      this.ctx.font = `${FONT_SIZES.instruction}px ${this.config.fontFamily}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('R: データをリセット', this.width / 2, LAYOUT.statisticsResetY);

      // Instructions
      this.ctx.fillText('Esc: 戻る', this.width / 2, this.height - LAYOUT.instructionBottomMargin);
    }
  }

  /**
   * Format play time from milliseconds to readable string.
   */
  private formatPlayTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Calculate Tetris rate as a percentage.
   * Tetris rate = (lines from Tetris / total lines) * 100
   */
  private calculateTetrisRate(totalLines: number, tetrisCount: number): string {
    if (totalLines === 0) {
      return '0%';
    }
    const linesFromTetris = tetrisCount * 4;
    // Clamp to 100% max in case of data inconsistency
    const rate = Math.min((linesFromTetris / totalLines) * 100, 100);
    return `${rate.toFixed(1)}%`;
  }

  /**
   * Draw the semi-transparent background overlay.
   */
  private drawOverlayBackground(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
