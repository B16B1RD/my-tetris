import './style.css';
import { DEFAULT_CONFIG } from './types/index.ts';
import { Board } from './game/Board.ts';
import { Tetromino } from './game/Tetromino.ts';
import { Randomizer } from './game/Randomizer.ts';
import { BoardRenderer } from './rendering/BoardRenderer.ts';
import { GameLoop } from './systems/GameLoop.ts';

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
 * Simple demo game state
 */
interface DemoState {
  board: Board;
  renderer: BoardRenderer;
  gameLoop: GameLoop;
  randomizer: Randomizer;
  currentTetromino: Tetromino | null;
  dropTimer: number;
  dropInterval: number;
}

/**
 * Initialize demo state
 */
function initDemo(canvas: HTMLCanvasElement): DemoState {
  const board = new Board();
  const renderer = new BoardRenderer(canvas);
  const gameLoop = new GameLoop();
  const randomizer = new Randomizer();

  return {
    board,
    renderer,
    gameLoop,
    randomizer,
    currentTetromino: null,
    dropTimer: 0,
    dropInterval: 1000, // 1 second per drop
  };
}

/**
 * Spawn a new tetromino
 */
function spawnTetromino(state: DemoState): void {
  const type = state.randomizer.next();
  state.currentTetromino = new Tetromino(type, { x: 3, y: 0 });
  state.dropTimer = 0;
}

/**
 * Update game logic
 */
function update(state: DemoState, deltaTime: number): void {
  // Spawn first tetromino if needed
  if (!state.currentTetromino) {
    spawnTetromino(state);
    return;
  }

  // Update drop timer
  state.dropTimer += deltaTime;

  // Drop tetromino when timer exceeds interval
  if (state.dropTimer >= state.dropInterval) {
    state.dropTimer = 0;

    // Try to move down
    state.currentTetromino.move(0, 1);

    if (!state.board.canPlaceTetromino(state.currentTetromino)) {
      // Can't move down, revert and lock
      state.currentTetromino.move(0, -1);
      state.board.lockTetromino(state.currentTetromino);

      // Clear filled rows
      const cleared = state.board.clearFilledRows();
      if (cleared > 0) {
        console.log(`Cleared ${cleared} rows!`);
      }

      // Check for game over
      if (state.board.isOverflowing()) {
        console.log('Game Over!');
        state.board.reset();
      }

      // Spawn new tetromino
      spawnTetromino(state);
    }
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
  ctx.font = '12px monospace';
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

  // Set up game loop callbacks
  state.gameLoop.setUpdateCallback((deltaTime) => update(state, deltaTime));
  state.gameLoop.setRenderCallback(() => render(state));

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
