import './style.css';
import { DEFAULT_CONFIG } from './types/index.ts';
import { GameManager } from './ui/GameManager.ts';

/**
 * Initialize the game canvas.
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
 * Main entry point.
 */
function main(): void {
  const canvas = initCanvas();
  if (!canvas) return;

  const gameManager = new GameManager(canvas);
  gameManager.start();

  console.log('Tetris initialized successfully');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
