/**
 * Replay System
 * @module systems/ReplaySystem
 * @description Records and plays back game sessions using input events and seeds.
 */

import type {
  InputAction,
  ReplayData,
  ReplayEvent,
  ReplayPlaybackState,
  ReplaySpeed,
} from '../types/index.ts';

/** Default playback speed for new replay sessions */
const DEFAULT_REPLAY_SPEED: ReplaySpeed = 1;

/**
 * Generates a unique ID for replay data.
 * Uses crypto.randomUUID() for cryptographically secure unique IDs.
 */
function generateReplayId(): string {
  return `replay_${crypto.randomUUID()}`;
}

/**
 * Manages replay recording and playback for game sessions.
 *
 * Recording:
 * - Captures the random seed at game start
 * - Records each input action with a timestamp
 * - Stores final game stats when recording stops
 *
 * Playback:
 * - Recreates the game using the same seed
 * - Replays input events at the correct times
 * - Supports variable speed playback (0.5x, 1x, 2x)
 */
export class ReplaySystem {
  private recording = false;
  private events: ReplayEvent[] = [];
  private seed = 0;
  private startTime = 0;

  /**
   * Start recording a new game session.
   * @param seed - The random seed used for piece generation
   */
  startRecording(seed: number): void {
    this.recording = true;
    this.events = [];
    this.seed = seed;
    this.startTime = performance.now();
  }

  /**
   * Record an input action.
   * @param action - The input action to record
   */
  recordAction(action: InputAction): void {
    if (!this.recording) return;

    const timestamp = performance.now() - this.startTime;
    this.events.push({ timestamp, action });
  }

  /**
   * Stop recording and generate replay data.
   * @param finalScore - Final score achieved
   * @param finalLevel - Final level reached
   * @param finalLines - Total lines cleared
   * @returns The complete replay data
   */
  stopRecording(
    finalScore: number,
    finalLevel: number,
    finalLines: number
  ): ReplayData {
    this.recording = false;
    const duration = performance.now() - this.startTime;

    return {
      id: generateReplayId(),
      seed: this.seed,
      events: [...this.events],
      finalScore,
      finalLevel,
      finalLines,
      date: new Date().toISOString(),
      duration,
    };
  }

  /**
   * Check if currently recording.
   */
  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Get the current recording seed.
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Get the number of recorded events.
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Create a new playback state for a replay.
   * @param replay - The replay data to play
   * @returns Initial playback state
   */
  static createPlaybackState(replay: ReplayData): ReplayPlaybackState {
    return {
      replay,
      currentTime: 0,
      nextEventIndex: 0,
      paused: false,
      speed: DEFAULT_REPLAY_SPEED,
      finished: false,
    };
  }

  /**
   * Update playback state and return any triggered events.
   * @param state - Current playback state (mutated by this method)
   * @param deltaTime - Time elapsed since last update (ms)
   * @returns Array of input actions triggered during this update
   * @mutates state - Updates currentTime, nextEventIndex, and finished properties
   */
  static updatePlayback(
    state: ReplayPlaybackState,
    deltaTime: number
  ): InputAction[] {
    // Ignore negative deltaTime (invalid input)
    if (state.paused || state.finished || deltaTime < 0) {
      return [];
    }

    const triggeredActions: InputAction[] = [];
    const adjustedDelta = deltaTime * state.speed;
    state.currentTime += adjustedDelta;

    // Process all events up to current time
    while (state.nextEventIndex < state.replay.events.length) {
      const event = state.replay.events[state.nextEventIndex];
      if (!event || event.timestamp > state.currentTime) {
        break;
      }

      triggeredActions.push(event.action);
      state.nextEventIndex++;
    }

    // Check if playback is finished
    if (state.nextEventIndex >= state.replay.events.length) {
      // Allow a bit more time for the final piece to lock
      if (state.currentTime >= state.replay.duration) {
        state.finished = true;
      }
    }

    return triggeredActions;
  }

  /**
   * Set playback speed.
   * @param state - Playback state to modify
   * @param speed - New playback speed
   * @mutates state - Updates speed property
   */
  static setSpeed(state: ReplayPlaybackState, speed: ReplaySpeed): void {
    state.speed = speed;
  }

  /**
   * Pause playback.
   * @param state - Playback state to modify
   * @mutates state - Sets paused to true
   */
  static pause(state: ReplayPlaybackState): void {
    state.paused = true;
  }

  /**
   * Resume playback.
   * @param state - Playback state to modify
   * @mutates state - Sets paused to false
   */
  static resume(state: ReplayPlaybackState): void {
    state.paused = false;
  }

  /**
   * Toggle pause state.
   * @param state - Playback state to modify
   * @mutates state - Toggles paused property
   */
  static togglePause(state: ReplayPlaybackState): void {
    state.paused = !state.paused;
  }

  /**
   * Get progress as a percentage (0-100).
   * @param state - Playback state
   * @returns Progress percentage
   */
  static getProgress(state: ReplayPlaybackState): number {
    if (state.replay.duration === 0) return 100;
    return Math.min(100, (state.currentTime / state.replay.duration) * 100);
  }

  /**
   * Format time as MM:SS.
   * @param ms - Time in milliseconds
   * @returns Formatted time string
   */
  static formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
