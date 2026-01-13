/**
 * Game Loop
 * @module systems/GameLoop
 * @description requestAnimationFrame-based game loop with fixed timestep for consistent gameplay.
 */

/** Callback type for game loop updates */
export type UpdateCallback = (deltaTime: number) => void;

/** Callback type for render calls */
export type RenderCallback = (interpolation: number) => void;

/** Game loop configuration */
export interface GameLoopConfig {
  /** Target updates per second (default: 60) */
  targetUPS?: number;
  /** Maximum updates per frame to prevent spiral of death (default: 5) */
  maxUpdatesPerFrame?: number;
}

/**
 * Game loop implementation using requestAnimationFrame.
 * Uses a fixed timestep for game logic and variable timestep for rendering.
 */
export class GameLoop {
  private readonly targetUPS: number;
  private readonly timestep: number;
  private readonly maxUpdatesPerFrame: number;

  private updateCallback: UpdateCallback | null = null;
  private renderCallback: RenderCallback | null = null;

  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private isRunning: boolean = false;

  // Performance metrics
  private frameCount: number = 0;
  private lastFPSUpdate: number = 0;
  private currentFPS: number = 0;
  private currentUPS: number = 0;
  private updateCount: number = 0;

  constructor(config: GameLoopConfig = {}) {
    const { targetUPS = 60, maxUpdatesPerFrame = 5 } = config;

    this.targetUPS = targetUPS;
    this.timestep = 1000 / this.targetUPS;
    this.maxUpdatesPerFrame = maxUpdatesPerFrame;
  }

  /**
   * Set the update callback (called at fixed intervals).
   * @param callback - Function to call for game logic updates
   */
  setUpdateCallback(callback: UpdateCallback): void {
    this.updateCallback = callback;
  }

  /**
   * Set the render callback (called every frame).
   * @param callback - Function to call for rendering
   */
  setRenderCallback(callback: RenderCallback): void {
    this.renderCallback = callback;
  }

  /**
   * Start the game loop.
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.frameCount = 0;
    this.updateCount = 0;
    this.lastFPSUpdate = this.lastTime;

    this.loop(this.lastTime);
  }

  /**
   * Stop the game loop.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Pause the game loop (alias for stop).
   */
  pause(): void {
    this.stop();
  }

  /**
   * Resume the game loop.
   */
  resume(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  /**
   * Check if the game loop is currently running.
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get the current frames per second.
   */
  get fps(): number {
    return this.currentFPS;
  }

  /**
   * Get the current updates per second.
   */
  get ups(): number {
    return this.currentUPS;
  }

  /**
   * Get the fixed timestep in milliseconds.
   */
  get fixedTimestep(): number {
    return this.timestep;
  }

  /**
   * Main loop function.
   */
  private loop = (currentTime: number): void => {
    if (!this.isRunning) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Prevent spiral of death on tab switching
    const clampedDelta = Math.min(deltaTime, this.timestep * this.maxUpdatesPerFrame);
    this.accumulator += clampedDelta;

    // Fixed timestep updates
    let updates = 0;
    while (this.accumulator >= this.timestep && updates < this.maxUpdatesPerFrame) {
      if (this.updateCallback) {
        this.updateCallback(this.timestep);
      }
      this.accumulator -= this.timestep;
      updates++;
      this.updateCount++;
    }

    // Render with interpolation
    const interpolation = this.accumulator / this.timestep;
    if (this.renderCallback) {
      this.renderCallback(interpolation);
    }

    // Update FPS counter
    this.frameCount++;
    const fpsElapsed = currentTime - this.lastFPSUpdate;
    if (fpsElapsed >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / fpsElapsed);
      this.currentUPS = Math.round((this.updateCount * 1000) / fpsElapsed);
      this.frameCount = 0;
      this.updateCount = 0;
      this.lastFPSUpdate = currentTime;
    }
  };

  /**
   * Execute a single update step (useful for testing).
   */
  tick(): void {
    if (this.updateCallback) {
      this.updateCallback(this.timestep);
    }
  }
}
