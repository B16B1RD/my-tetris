/**
 * Game Manager
 * @module ui/GameManager
 * @description Manages game state transitions and coordinates UI screens.
 */

import type {
  GameState,
  MenuItem,
  TransitionState,
  TetrominoType,
  HoldState,
  InputAction,
  LineClearResult,
  GameStats,
  HighScoreEntry,
} from '../types/index.ts';
import { DEFAULT_CONFIG } from '../types/index.ts';
import { Board } from '../game/Board.ts';
import { Tetromino } from '../game/Tetromino.ts';
import { Randomizer } from '../game/Randomizer.ts';
import { tryRotation } from '../game/SRS.ts';
import { detectTSpin, getTSpinDescription } from '../game/TSpin.ts';
import { ScoreManager } from '../systems/ScoreManager.ts';
import { BoardRenderer } from '../rendering/BoardRenderer.ts';
import { UIRenderer } from '../rendering/UIRenderer.ts';
import { GameLoop } from '../systems/GameLoop.ts';
import { InputHandler } from '../systems/InputHandler.ts';
import type { Storage } from '../storage/Storage.ts';
import { getStorage } from '../storage/Storage.ts';

/** Font style for FPS counter display */
const FPS_FONT = '12px monospace';

/** Transition duration in milliseconds */
const TRANSITION_DURATION = 300;

/**
 * Menu items for the main menu.
 */
const MAIN_MENU_ITEMS: MenuItem[] = [
  { label: 'Start Game', action: 'start' },
  { label: 'Rankings', action: 'rankings' },
  { label: 'Settings', action: 'settings' },
  { label: 'Statistics', action: 'statistics' },
];

/**
 * Menu items for the game over screen.
 */
const GAME_OVER_MENU_ITEMS: MenuItem[] = [
  { label: 'Retry', action: 'retry' },
  { label: 'Rankings', action: 'rankings' },
  { label: 'Main Menu', action: 'menu' },
];

/**
 * Internal game state during play.
 */
interface PlayState {
  board: Board;
  randomizer: Randomizer;
  scoreManager: ScoreManager;
  currentTetromino: Tetromino | null;
  dropTimer: number;
  lockTimer: number;
  isGrounded: boolean;
  lastActionWasRotation: boolean;
  lastKickIndex: number;
  hold: HoldState;
}

/**
 * Manages the entire game lifecycle including menus, gameplay, and transitions.
 */
export class GameManager {
  private readonly boardRenderer: BoardRenderer;
  private readonly uiRenderer: UIRenderer;
  private readonly gameLoop: GameLoop;
  private readonly inputHandler: InputHandler;
  private readonly storage: Storage;
  private readonly announcer: HTMLElement | null;

  private state: GameState = 'menu';
  private menuSelectedIndex = 0;
  private gameOverSelectedIndex = 0;
  private transition: TransitionState = {
    active: false,
    type: 'fade-in',
    progress: 0,
    duration: TRANSITION_DURATION,
  };

  private playState: PlayState | null = null;

  // High score and name input state
  private nameInputValue = '';
  private nameInputRank = 0;
  private nameInputScore = 0;
  private nameInputLevel = 0;
  private nameInputLines = 0;
  private rankingHighlightIndex = -1;
  private rankingScoresCache: HighScoreEntry[] = [];
  private cursorBlinkTimer = 0;
  private showCursor = true;

  // Event listener references for cleanup
  private readonly boundHandleVisibilityChange: () => void;
  private readonly boundHandleWindowBlur: () => void;
  private readonly boundHandleMenuKeyboard: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.boardRenderer = new BoardRenderer(canvas);
    this.uiRenderer = new UIRenderer(
      this.boardRenderer.getContext(),
      DEFAULT_CONFIG.canvas.width,
      DEFAULT_CONFIG.canvas.height
    );
    this.gameLoop = new GameLoop();
    this.inputHandler = new InputHandler();
    this.storage = getStorage();
    this.announcer = document.getElementById('game-announcements');

    // Bind event handlers for later cleanup
    this.boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.boundHandleWindowBlur = this.handleWindowBlur.bind(this);
    this.boundHandleMenuKeyboard = this.handleMenuKeyboard.bind(this);

    this.setupCallbacks();
    this.setupEventListeners();
  }

  /**
   * Start the game manager.
   */
  start(): void {
    this.inputHandler.enable();
    this.gameLoop.start();
    this.startTransition('fade-in');
  }

  /**
   * Stop and clean up the game manager to prevent memory leaks.
   * Call this when the game is being unmounted or destroyed.
   */
  destroy(): void {
    this.gameLoop.stop();
    this.inputHandler.disable();
    this.removeEventListeners();
    this.playState = null;
  }

  /**
   * Get current game state.
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * Get current game stats (if playing).
   */
  getStats(): GameStats | null {
    return this.playState?.scoreManager.stats ?? null;
  }

  /**
   * Setup game loop callbacks.
   */
  private setupCallbacks(): void {
    this.inputHandler.addCallback((action) => this.handleInput(action));
    this.gameLoop.setUpdateCallback((dt) => this.update(dt));
    this.gameLoop.setRenderCallback(() => this.render());
  }

  /**
   * Setup DOM event listeners.
   */
  private setupEventListeners(): void {
    document.addEventListener('visibilitychange', this.boundHandleVisibilityChange);
    window.addEventListener('blur', this.boundHandleWindowBlur);
    document.addEventListener('keydown', this.boundHandleMenuKeyboard);
  }

  /**
   * Remove DOM event listeners to prevent memory leaks.
   */
  private removeEventListeners(): void {
    document.removeEventListener('visibilitychange', this.boundHandleVisibilityChange);
    window.removeEventListener('blur', this.boundHandleWindowBlur);
    document.removeEventListener('keydown', this.boundHandleMenuKeyboard);
  }

  /**
   * Handle visibility change event (auto-pause when tab is hidden).
   */
  private handleVisibilityChange(): void {
    if (document.hidden && this.state === 'playing') {
      this.pauseGame();
    }
    this.inputHandler.clearAllKeys();
  }

  /**
   * Handle window blur event (auto-pause when window loses focus).
   */
  private handleWindowBlur(): void {
    if (this.state === 'playing') {
      this.pauseGame();
    }
    this.inputHandler.clearAllKeys();
  }

  /**
   * Handle keyboard input for menu navigation.
   */
  private handleMenuKeyboard(e: KeyboardEvent): void {
    if (this.transition.active) return;

    if (this.state === 'menu') {
      this.handleMainMenuNavigation(e);
    } else if (this.state === 'gameover') {
      this.handleGameOverNavigation(e);
    } else if (this.state === 'paused') {
      this.handlePauseNavigation(e);
    } else if (this.state === 'name-input') {
      this.handleNameInputNavigation(e);
    } else if (this.state === 'ranking') {
      this.handleRankingNavigation(e);
    }
  }

  /**
   * Handle main menu navigation.
   */
  private handleMainMenuNavigation(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.menuSelectedIndex =
          (this.menuSelectedIndex - 1 + MAIN_MENU_ITEMS.length) %
          MAIN_MENU_ITEMS.length;
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.menuSelectedIndex =
          (this.menuSelectedIndex + 1) % MAIN_MENU_ITEMS.length;
        break;
      case 'Enter':
        e.preventDefault();
        this.selectMainMenuItem();
        break;
    }
  }

  /**
   * Handle game over screen navigation.
   */
  private handleGameOverNavigation(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.gameOverSelectedIndex =
          (this.gameOverSelectedIndex - 1 + GAME_OVER_MENU_ITEMS.length) %
          GAME_OVER_MENU_ITEMS.length;
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.gameOverSelectedIndex =
          (this.gameOverSelectedIndex + 1) % GAME_OVER_MENU_ITEMS.length;
        break;
      case 'Enter':
        e.preventDefault();
        this.selectGameOverMenuItem();
        break;
    }
  }

  /**
   * Handle pause screen navigation.
   */
  private handlePauseNavigation(e: KeyboardEvent): void {
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      this.quitToMenu();
    }
  }

  /**
   * Select main menu item.
   */
  private selectMainMenuItem(): void {
    const item = MAIN_MENU_ITEMS[this.menuSelectedIndex];
    if (!item) return;

    switch (item.action) {
      case 'start':
        this.startGame();
        break;
      case 'rankings':
        this.showRanking();
        break;
      case 'settings':
        this.announce('Settings - Coming soon');
        break;
      case 'statistics':
        this.announce('Statistics - Coming soon');
        break;
    }
  }

  /**
   * Select game over menu item.
   */
  private selectGameOverMenuItem(): void {
    const item = GAME_OVER_MENU_ITEMS[this.gameOverSelectedIndex];
    if (!item) return;

    switch (item.action) {
      case 'retry':
        this.startGame();
        break;
      case 'rankings':
        this.showRanking();
        break;
      case 'menu':
        this.goToMenu();
        break;
    }
  }

  /**
   * Start a new game.
   */
  private startGame(): void {
    this.startTransition('fade-out', () => {
      this.initPlayState();
      this.state = 'playing';
      this.startTransition('fade-in');
    });
  }

  /**
   * Initialize play state for a new game.
   */
  private initPlayState(): void {
    this.playState = {
      board: new Board(),
      randomizer: new Randomizer(),
      scoreManager: new ScoreManager(),
      currentTetromino: null,
      dropTimer: 0,
      lockTimer: DEFAULT_CONFIG.timing.lockDelay,
      isGrounded: false,
      lastActionWasRotation: false,
      lastKickIndex: 0,
      hold: {
        heldPiece: null,
        holdUsed: false,
      },
    };
  }

  /**
   * Pause the game.
   */
  private pauseGame(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.announce('ゲーム一時停止');
  }

  /**
   * Resume the game.
   */
  private resumeGame(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.announce('ゲーム再開');
  }

  /**
   * Go to main menu.
   */
  private goToMenu(): void {
    this.startTransition('fade-out', () => {
      this.state = 'menu';
      this.playState = null;
      this.menuSelectedIndex = 0;
      this.rankingHighlightIndex = -1;
      this.startTransition('fade-in');
    });
  }

  /**
   * Quit to menu from pause.
   */
  private quitToMenu(): void {
    this.goToMenu();
  }

  /**
   * Show ranking screen.
   */
  private showRanking(): void {
    this.startTransition('fade-out', () => {
      this.rankingScoresCache = this.storage.getHighScores();
      this.state = 'ranking';
      this.startTransition('fade-in');
    });
  }

  /**
   * Handle name input keyboard navigation.
   */
  private handleNameInputNavigation(e: KeyboardEvent): void {
    const key = e.key.toUpperCase();

    // A-Z input
    if (/^[A-Z]$/.test(key) && this.nameInputValue.length < 3) {
      e.preventDefault();
      this.nameInputValue += key;
      return;
    }

    // Backspace
    if (e.key === 'Backspace' && this.nameInputValue.length > 0) {
      e.preventDefault();
      this.nameInputValue = this.nameInputValue.slice(0, -1);
      return;
    }

    // Enter to confirm
    if (e.key === 'Enter' && this.nameInputValue.length > 0) {
      e.preventDefault();
      this.submitHighScore();
      return;
    }
  }

  /**
   * Handle ranking screen keyboard navigation.
   */
  private handleRankingNavigation(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      this.goToMenu();
    }
  }

  /**
   * Submit the high score with entered name.
   */
  private submitHighScore(): void {
    const entry = this.storage.createEntry(
      this.nameInputValue,
      this.nameInputScore,
      this.nameInputLevel,
      this.nameInputLines
    );
    this.storage.addHighScore(entry);

    // Find the index of the new entry in the sorted list and cache scores
    this.rankingScoresCache = this.storage.getHighScores();
    this.rankingHighlightIndex = this.rankingScoresCache.findIndex(
      (s) =>
        s.name === entry.name &&
        s.score === entry.score &&
        s.date === entry.date
    );

    this.startTransition('fade-out', () => {
      this.state = 'ranking';
      this.startTransition('fade-in');
    });
  }

  /**
   * Handle game over.
   */
  private handleGameOver(): void {
    const stats = this.playState?.scoreManager.stats;
    if (!stats) {
      this.state = 'gameover';
      this.gameOverSelectedIndex = 0;
      this.announce('ゲームオーバー');
      return;
    }

    if (this.storage.isHighScore(stats.score)) {
      // New high score! Show name input screen
      const rank = this.storage.getScoreRank(stats.score);
      this.nameInputScore = stats.score;
      this.nameInputLevel = stats.level;
      this.nameInputLines = stats.lines;
      this.nameInputRank = rank ?? 1;
      this.nameInputValue = '';
      this.cursorBlinkTimer = 0;
      this.showCursor = true;
      this.state = 'name-input';
      this.announce('新しいハイスコア!');
    } else {
      this.state = 'gameover';
      this.gameOverSelectedIndex = 0;
      this.announce('ゲームオーバー');
    }
  }

  /**
   * Start a screen transition.
   */
  private startTransition(type: 'fade-in' | 'fade-out', onComplete?: () => void): void {
    this.transition = {
      active: true,
      type,
      progress: 0,
      duration: TRANSITION_DURATION,
      onComplete,
    };
  }

  /**
   * Update transition state.
   */
  private updateTransition(deltaTime: number): void {
    if (!this.transition.active) return;

    // Clamp progress to prevent overflow on large delta times
    this.transition.progress = Math.min(
      1,
      this.transition.progress + deltaTime / this.transition.duration
    );

    if (this.transition.progress >= 1) {
      this.transition.active = false;
      this.transition.onComplete?.();
    }
  }

  /**
   * Handle input action.
   */
  private handleInput(action: InputAction): void {
    if (this.transition.active) return;

    if (this.state === 'playing') {
      this.handlePlayInput(action);
    }
  }

  /**
   * Handle input during gameplay.
   */
  private handlePlayInput(action: InputAction): void {
    if (!this.playState?.currentTetromino) return;

    switch (action) {
      case 'moveLeft':
        this.tryMove(-1, 0);
        break;
      case 'moveRight':
        this.tryMove(1, 0);
        break;
      case 'softDrop':
        if (this.tryMove(0, 1)) {
          this.playState.dropTimer = 0;
        }
        break;
      case 'hardDrop':
        this.hardDrop();
        break;
      case 'rotateClockwise':
        this.handleRotation('clockwise');
        break;
      case 'rotateCounterClockwise':
        this.handleRotation('counterClockwise');
        break;
      case 'hold':
        this.performHold();
        break;
      case 'pause':
        if (this.state === 'playing') {
          this.pauseGame();
        } else if (this.state === 'paused') {
          this.resumeGame();
        }
        break;
    }
  }

  /**
   * Try to move the current tetromino.
   */
  private tryMove(dx: number, dy: number): boolean {
    if (!this.playState?.currentTetromino) return false;

    this.playState.currentTetromino.move(dx, dy);
    if (this.playState.board.canPlaceTetromino(this.playState.currentTetromino)) {
      if (this.playState.isGrounded && dy === 0) {
        this.playState.lockTimer = DEFAULT_CONFIG.timing.lockDelay;
      }
      this.playState.lastActionWasRotation = false;
      return true;
    }

    this.playState.currentTetromino.move(-dx, -dy);
    return false;
  }

  /**
   * Perform hard drop.
   */
  private hardDrop(): void {
    if (!this.playState?.currentTetromino) return;

    const dropPosition = this.playState.board.getTetrominoDropPosition(
      this.playState.currentTetromino
    );
    this.playState.currentTetromino.setPosition(dropPosition);
    this.playState.lastActionWasRotation = false;
    this.lockPiece();
  }

  /**
   * Handle rotation with T-Spin tracking.
   */
  private handleRotation(direction: 'clockwise' | 'counterClockwise'): void {
    if (!this.playState?.currentTetromino) return;

    const result = tryRotation(
      this.playState.currentTetromino,
      this.playState.board,
      direction
    );
    if (result.success) {
      this.playState.lastActionWasRotation = true;
      this.playState.lastKickIndex = result.kickIndex;
      if (this.playState.isGrounded) {
        this.playState.lockTimer = DEFAULT_CONFIG.timing.lockDelay;
      }
    }
  }

  /**
   * Perform hold operation.
   */
  private performHold(): void {
    if (!this.playState?.currentTetromino) return;
    if (this.playState.hold.holdUsed) return;

    const currentType = this.playState.currentTetromino.type;

    if (this.playState.hold.heldPiece === null) {
      this.playState.hold.heldPiece = currentType;
      this.spawnTetromino();
    } else {
      const heldType = this.playState.hold.heldPiece;
      this.playState.hold.heldPiece = currentType;
      this.spawnTetrominoOfType(heldType);
    }

    this.playState.hold.holdUsed = true;
    this.announce('Hold');
  }

  /**
   * Spawn a new tetromino from the randomizer.
   */
  private spawnTetromino(): void {
    if (!this.playState) return;

    const type = this.playState.randomizer.next();
    this.resetSpawnState(type);
    this.playState.hold.holdUsed = false;
  }

  /**
   * Spawn a tetromino of a specific type.
   */
  private spawnTetrominoOfType(type: TetrominoType): void {
    if (!this.playState) return;
    this.resetSpawnState(type);
  }

  /**
   * Reset spawn-related state.
   */
  private resetSpawnState(type: TetrominoType): void {
    if (!this.playState) return;

    this.playState.currentTetromino = new Tetromino(type, { x: 3, y: 0 });
    this.playState.dropTimer = 0;
    this.playState.lockTimer = DEFAULT_CONFIG.timing.lockDelay;
    this.playState.isGrounded = false;
    this.playState.lastActionWasRotation = false;
    this.playState.lastKickIndex = 0;
  }

  /**
   * Check if the current tetromino is on the ground.
   */
  private checkGrounded(): boolean {
    if (!this.playState?.currentTetromino) return false;

    const testPiece = this.playState.currentTetromino.clone();
    testPiece.move(0, 1);
    return !this.playState.board.canPlaceTetromino(testPiece);
  }

  /**
   * Perform line clear with T-Spin detection.
   */
  private performLineClear(): LineClearResult {
    if (!this.playState?.currentTetromino) {
      return { linesCleared: 0, tspinType: 'none', description: '' };
    }

    const tspinResult = detectTSpin(
      this.playState.currentTetromino,
      this.playState.board,
      this.playState.lastActionWasRotation,
      this.playState.lastKickIndex
    );

    this.playState.board.lockTetromino(this.playState.currentTetromino);
    const linesCleared = this.playState.board.clearFilledRows();
    const description = getTSpinDescription(tspinResult.type, linesCleared);

    return { linesCleared, tspinType: tspinResult.type, description };
  }

  /**
   * Lock the current piece and spawn a new one.
   */
  private lockPiece(): void {
    if (!this.playState?.currentTetromino) return;

    const result = this.performLineClear();

    // Process score
    this.playState.scoreManager.processLineClear(result);

    if (result.description) {
      this.announce(result.description);
    } else if (result.linesCleared > 0) {
      this.announce(`${result.linesCleared}ライン消去`);
    }

    // Check for game over
    if (this.playState.board.isOverflowing()) {
      this.handleGameOver();
      return;
    }

    this.spawnTetromino();
  }

  /**
   * Update game logic.
   */
  private update(deltaTime: number): void {
    this.updateTransition(deltaTime);
    this.inputHandler.update(performance.now());

    // Update cursor blink for name input
    if (this.state === 'name-input') {
      this.cursorBlinkTimer += deltaTime;
      if (this.cursorBlinkTimer >= 500) {
        this.cursorBlinkTimer = 0;
        this.showCursor = !this.showCursor;
      }
    }

    if (this.state !== 'playing' || !this.playState) return;

    // Spawn first tetromino if needed
    if (!this.playState.currentTetromino) {
      this.spawnTetromino();
      return;
    }

    // Check if grounded
    this.playState.isGrounded = this.checkGrounded();

    if (this.playState.isGrounded) {
      this.playState.lockTimer -= deltaTime;
      if (this.playState.lockTimer <= 0) {
        this.lockPiece();
        return;
      }
    } else {
      this.playState.lockTimer = DEFAULT_CONFIG.timing.lockDelay;
    }

    // Update drop timer with level-based speed
    this.playState.dropTimer += deltaTime;
    const dropInterval = this.playState.scoreManager.fallSpeed;

    if (this.playState.dropTimer >= dropInterval) {
      this.playState.dropTimer = 0;
      this.tryMove(0, 1);
    }
  }

  /**
   * Render the game.
   */
  private render(): void {
    // Always clear and render background
    this.boardRenderer.getContext().fillStyle = '#1a1a2e';
    this.boardRenderer
      .getContext()
      .fillRect(0, 0, DEFAULT_CONFIG.canvas.width, DEFAULT_CONFIG.canvas.height);

    switch (this.state) {
      case 'menu':
        this.uiRenderer.renderMenu(MAIN_MENU_ITEMS, this.menuSelectedIndex);
        break;

      case 'playing':
      case 'paused':
        this.renderGameplay();
        if (this.state === 'paused') {
          this.uiRenderer.renderPause();
        }
        break;

      case 'gameover':
        this.renderGameplay();
        if (this.playState) {
          this.uiRenderer.renderGameOver(
            this.playState.scoreManager.stats,
            GAME_OVER_MENU_ITEMS,
            this.gameOverSelectedIndex
          );
        }
        break;

      case 'name-input':
        this.renderGameplay();
        this.uiRenderer.renderNameInput(
          this.nameInputScore,
          this.nameInputRank,
          this.nameInputValue,
          this.showCursor
        );
        break;

      case 'ranking':
        this.uiRenderer.renderRanking(
          this.rankingScoresCache,
          this.rankingHighlightIndex
        );
        break;
    }

    // Render transition overlay
    this.uiRenderer.renderTransition(this.transition);

    // Draw FPS counter
    const ctx = this.boardRenderer.getContext();
    ctx.fillStyle = '#888';
    ctx.font = FPS_FONT;
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${this.gameLoop.fps}`, DEFAULT_CONFIG.canvas.width - 10, 20);
  }

  /**
   * Render gameplay elements.
   */
  private renderGameplay(): void {
    if (!this.playState) return;

    const ghostPosition = this.playState.currentTetromino
      ? this.playState.board.getTetrominoDropPosition(
          this.playState.currentTetromino
        )
      : undefined;

    this.boardRenderer.render(
      this.playState.board,
      this.playState.currentTetromino ?? undefined,
      ghostPosition
    );

    // Render NEXT panel
    const nextPieces = this.playState.randomizer.peek(6);
    this.boardRenderer.renderNextPanel(nextPieces);

    // Render Hold panel
    this.boardRenderer.renderHoldPanel(
      this.playState.hold.heldPiece,
      this.playState.hold.holdUsed
    );

    // Render score panel
    this.boardRenderer.renderScorePanel(this.playState.scoreManager.stats);
  }

  /**
   * Announce game events to screen readers.
   */
  private announce(message: string): void {
    if (this.announcer) {
      this.announcer.textContent = message;
    }
  }
}
