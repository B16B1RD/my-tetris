import './style.css';
import { DEFAULT_CONFIG } from './types/index.ts';

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

/** CSS variable cache for performance */
const cssVarCache: Map<string, string> = new Map();

/**
 * Get CSS custom property value with caching
 */
function getCSSVar(name: string): string {
  if (!cssVarCache.has(name)) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    cssVarCache.set(name, value);
  }
  return cssVarCache.get(name)!;
}

/**
 * Draw initial placeholder content.
 * This is a temporary placeholder that will be replaced with actual game rendering.
 */
function drawPlaceholder(ctx: CanvasRenderingContext2D): void {
  const { width, height } = DEFAULT_CONFIG.canvas;

  // Cache CSS variables
  const bgSecondary = getCSSVar('--bg-secondary');
  const textPrimary = getCSSVar('--text-primary');
  const textSecondary = getCSSVar('--text-secondary');
  const fontSizeTitle = getCSSVar('--font-size-title');
  const fontSizeSubtitle = getCSSVar('--font-size-subtitle');
  const fontSizeBody = getCSSVar('--font-size-body');

  // Clear canvas
  ctx.fillStyle = bgSecondary;
  ctx.fillRect(0, 0, width, height);

  // Draw title
  ctx.fillStyle = textPrimary;
  ctx.font = `bold ${fontSizeTitle} sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TETRIS', width / 2, height / 2 - 40);

  // Draw subtitle
  ctx.font = `${fontSizeSubtitle} sans-serif`;
  ctx.fillStyle = textSecondary;
  ctx.fillText('Guideline Edition', width / 2, height / 2);

  // Draw instructions
  ctx.font = `${fontSizeBody} sans-serif`;
  ctx.fillText('Press any key to start', width / 2, height / 2 + 60);
}

/**
 * Main entry point
 */
function main(): void {
  const canvas = initCanvas();
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to get 2D context');
    return;
  }

  drawPlaceholder(ctx);

  console.log('Tetris initialized successfully');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
