import './style.css';
import type { InputAction, LineClearResult, TSpinType } from './types/index.ts';
import { DEFAULT_CONFIG } from './types/index.ts';
import { Board } from './game/Board.ts';
import { Tetromino } from './game/Tetromino.ts';
import { Randomizer } from './game/Randomizer.ts';
import { tryRotation } from './game/SRS.ts';
import { detectTSpin, getTSpinDescription } from './game/TSpin.ts';
import { BoardRenderer } from './rendering/BoardRenderer.ts';
import { GameLoop } from './systems/GameLoop.ts';
import { InputHandler } from './systems/InputHandler.ts';

/** Font style for FPS counter display */
const FPS_FONT = '12px monospace';

/**
 * Initialize the game canvas
 */
function initCanvas(): HTMLCanvasElement | null {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return null;
  }

  canvas.width = DEFAULT_CONFIG.canvas.width;
  canvas.height = DEFAULT_CONFIG.canvas.height;

  return canvas;
}

/**
 * Announce game events to screen readers via aria-live region
 */
function announce(message: string): void {
  const announcer = document.getElementById('game-announcements');
  if (announcer) {
    announcer.textContent = message;
  }
}

/**
 * Simple demo game state
 */
interface DemoState {
  board: Board;
  renderer: BoardRenderer;
  gameLoop: GameLoop;
  randomizer: Randomizer;
  inputHandler: InputHandler;
  currentTetromino: Tetromino | null;
  dropTimer: number;
  dropInterval: number;
  /** Lock delay timer (ms remaining before piece locks) */
  lockTimer: number;
  /** Whether the piece is currently on the ground */
  isGrounded: boolean;
  /** Whether the last action was a rotation (for T-Spin detection) */
  lastActionWasRotation: boolean;
  /** Wall kick index from the last successful rotation */
  lastKickIndex: number;
}

/**
 * Initialize demo state
 */
function initDemo(canvas: HTMLCanvasElement): DemoState {
  const board = new Board();
  const renderer = new BoardRenderer(canvas);
  const gameLoop = new GameLoop();
  const randomizer = new Randomizer();
  const inputHandler = new InputHandler();

  return {
    board,
    renderer,
    gameLoop,
    randomizer,
    inputHandler,
    currentTetromino: null,
    dropTimer: 0,
    dropInterval: 1000, // 1 second per drop
    lockTimer: DEFAULT_CONFIG.timing.lockDelay,
    isGrounded: false,
    lastActionWasRotation: false,
    lastKickIndex: 0,
  };
}

/**
 * Spawn a new tetromino
 */
function spawnTetromino(state: DemoState): void {
  const type = state.randomizer.next();
  state.currentTetromino = new Tetromino(type, { x: 3, y: 0 });
  state.dropTimer = 0;
  state.lockTimer = DEFAULT_CONFIG.timing.lockDelay;
  state.isGrounded = false;
  state.lastActionWasRotation = false;
  state.lastKickIndex = 0;
}

/**
 * Check if the current tetromino is on the ground
 */
function checkGrounded(state: DemoState): boolean {
  if (!state.currentTetromino) return false;

  const testPiece = state.currentTetromino.clone();
  testPiece.move(0, 1);
  return !state.board.canPlaceTetromino(testPiece);
}

/**
 * Try to move the current tetromino
 */
function tryMove(state: DemoState, dx: number, dy: number): boolean {
  if (!state.currentTetromino) return false;

  state.currentTetromino.move(dx, dy);
  if (state.board.canPlaceTetromino(state.currentTetromino)) {
    // Reset lock timer on successful move if grounded
    if (state.isGrounded && dy === 0) {
      state.lockTimer = DEFAULT_CONFIG.timing.lockDelay;
    }
    // Moving clears the rotation flag for T-Spin detection
    state.lastActionWasRotation = false;
    return true;
  }

  // Revert if invalid
  state.currentTetromino.move(-dx, -dy);
  return false;
}

/**
 * Perform hard drop
 */
function hardDrop(state: DemoState): void {
  if (!state.currentTetromino) return;

  const dropPosition = state.board.getTetrominoDropPosition(state.currentTetromino);
  state.currentTetromino.setPosition(dropPosition);

  // Hard drop clears the rotation flag (T-Spin requires last action to be rotation)
  state.lastActionWasRotation = false;

  // Lock immediately
  lockPiece(state);
}

/**
 * Perform line clear with T-Spin detection
 */
function performLineClear(state: DemoState): LineClearResult {
  if (!state.currentTetromino) {
    return { linesCleared: 0, tspinType: 'none', description: '' };
  }

  // Detect T-Spin BEFORE locking the piece
  const tspinResult = detectTSpin(
    state.currentTetromino,
    state.board,
    state.lastActionWasRotation,
    state.lastKickIndex
  );

  // Now lock the piece
  state.board.lockTetromino(state.currentTetromino);

  // Clear filled rows
  const linesCleared = state.board.clearFilledRows();

  // Get description
  const description = getTSpinDescription(tspinResult.type, linesCleared);

  return {
    linesCleared,
    tspinType: tspinResult.type as TSpinType,
    description,
  };
}

/**
 * Lock the current piece and spawn a new one
 */
function lockPiece(state: DemoState): void {
  if (!state.currentTetromino) return;

  // Perform line clear with T-Spin detection
  const result = performLineClear(state);

  // Log and announce the result
  if (result.description) {
    console.log(result.description);
    announce(result.description);
  } else if (result.linesCleared > 0) {
    console.log(`Cleared ${result.linesCleared} rows!`);
    announce(`${result.linesCleared}ライン消去`);
  }

  // Check for game over
  if (state.board.isOverflowing()) {
    console.log('Game Over!');
    announce('ゲームオーバー');
    state.board.reset();
  }

  // Spawn new tetromino
  spawnTetromino(state);
}

/**
 * Handle input actions
 */
function handleInput(state: DemoState, action: InputAction): void {
  if (!state.currentTetromino) return;

  switch (action) {
    case 'moveLeft':
      tryMove(state, -1, 0);
      break;

    case 'moveRight':
      tryMove(state, 1, 0);
      break;

    case 'softDrop':
      if (tryMove(state, 0, 1)) {
        // Reset drop timer on manual drop
        state.dropTimer = 0;
      }
      break;

    case 'hardDrop':
      hardDrop(state);
      break;

    case 'rotateClockwise': {
      const result = tryRotation(state.currentTetromino, state.board, 'clockwise');
      if (result.success) {
        // Track rotation for T-Spin detection
        state.lastActionWasRotation = true;
        state.lastKickIndex = result.kickIndex;
        // Reset lock timer on successful rotation if grounded
        if (state.isGrounded) {
          state.lockTimer = DEFAULT_CONFIG.timing.lockDelay;
        }
      }
      break;
    }

    case 'rotateCounterClockwise': {
      const result = tryRotation(state.currentTetromino, state.board, 'counterClockwise');
      if (result.success) {
        // Track rotation for T-Spin detection
        state.lastActionWasRotation = true;
        state.lastKickIndex = result.kickIndex;
        if (state.isGrounded) {
          state.lockTimer = DEFAULT_CONFIG.timing.lockDelay;
        }
      }
      break;
    }

    case 'hold':
      // Hold functionality not implemented yet
      break;

    case 'pause':
      // Pause functionality not implemented yet
      break;
  }
}

/**
 * Update game logic
 */
function update(state: DemoState, deltaTime: number): void {
  // Update input handler for DAS/ARR
  state.inputHandler.update(performance.now());

  // Spawn first tetromino if needed
  if (!state.currentTetromino) {
    spawnTetromino(state);
    return;
  }

  // Check if grounded
  state.isGrounded = checkGrounded(state);

  if (state.isGrounded) {
    // Decrement lock timer
    state.lockTimer -= deltaTime;

    // Lock piece when timer expires
    if (state.lockTimer <= 0) {
      lockPiece(state);
      return;
    }
  } else {
    // Reset lock timer when not grounded
    state.lockTimer = DEFAULT_CONFIG.timing.lockDelay;
  }

  // Update drop timer
  state.dropTimer += deltaTime;

  // Drop tetromino when timer exceeds interval
  if (state.dropTimer >= state.dropInterval) {
    state.dropTimer = 0;
    tryMove(state, 0, 1);
  }
}

/**
 * Render the game
 */
function render(state: DemoState): void {
  const ghostPosition = state.currentTetromino
    ? state.board.getTetrominoDropPosition(state.currentTetromino)
    : undefined;

  state.renderer.render(
    state.board,
    state.currentTetromino ?? undefined,
    ghostPosition
  );

  // Draw FPS counter
  const ctx = state.renderer.getContext();
  ctx.fillStyle = '#888';
  ctx.font = FPS_FONT;
  ctx.textAlign = 'right';
  ctx.fillText(`FPS: ${state.gameLoop.fps}`, DEFAULT_CONFIG.canvas.width - 10, 20);
}

/**
 * Main entry point
 */
function main(): void {
  const canvas = initCanvas();
  if (!canvas) return;

  const state = initDemo(canvas);

  // Set up input handling
  state.inputHandler.addCallback((action) => handleInput(state, action));
  state.inputHandler.enable();

  // Set up game loop callbacks
  state.gameLoop.setUpdateCallback((deltaTime) => update(state, deltaTime));
  state.gameLoop.setRenderCallback(() => render(state));

  // Handle visibility change (pause when tab is hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.inputHandler.clearAllKeys();
    }
  });

  // Clear keys on window blur
  window.addEventListener('blur', () => {
    state.inputHandler.clearAllKeys();
  });

  // Start the game loop
  state.gameLoop.start();

  console.log('Tetris initialized successfully');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
