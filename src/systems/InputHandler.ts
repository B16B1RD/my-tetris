/**
 * Input Handler
 * @module systems/InputHandler
 * @description Manages keyboard input with DAS (Delayed Auto Shift) and ARR (Auto Repeat Rate).
 */

import type { InputAction, KeyBindings } from '../types/index.ts';
import { DEFAULT_CONFIG } from '../types/index.ts';

/**
 * State of a held key for DAS/ARR processing.
 */
interface KeyState {
  /** Whether the key is currently pressed */
  pressed: boolean;
  /** Timestamp when the key was first pressed */
  pressedAt: number;
  /** Whether DAS has been activated for this key */
  dasActivated: boolean;
  /** Timestamp of the last ARR repeat */
  lastRepeat: number;
}

/**
 * Default key bindings following common Tetris conventions.
 */
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft: ['ArrowLeft', 'KeyA'],
  moveRight: ['ArrowRight', 'KeyD'],
  softDrop: ['ArrowDown', 'KeyS'],
  hardDrop: ['Space', 'ArrowUp'],
  rotateClockwise: ['KeyX', 'KeyE'],
  rotateCounterClockwise: ['KeyZ', 'ControlLeft', 'ControlRight', 'KeyQ'],
  hold: ['ShiftLeft', 'ShiftRight', 'KeyC'],
  pause: ['Escape', 'KeyP', 'F1'],
};

/**
 * Actions that support DAS/ARR auto-repeat.
 */
const REPEATABLE_ACTIONS: readonly InputAction[] = [
  'moveLeft',
  'moveRight',
  'softDrop',
];

/**
 * Callback type for input actions.
 */
export type InputCallback = (action: InputAction) => void;

/**
 * Input handler configuration.
 */
export interface InputHandlerConfig {
  /** Delayed Auto Shift in milliseconds */
  das?: number;
  /** Auto Repeat Rate in milliseconds */
  arr?: number;
  /** Key bindings */
  keyBindings?: KeyBindings;
}

/**
 * Handles keyboard input for Tetris gameplay.
 * Implements DAS (Delayed Auto Shift) and ARR (Auto Repeat Rate) for smooth controls.
 */
export class InputHandler {
  private readonly das: number;
  private readonly arr: number;
  private readonly keyBindings: KeyBindings;

  private readonly keyStates = new Map<string, KeyState>();
  private readonly keyToAction = new Map<string, InputAction>();
  private readonly actionCallbacks = new Set<InputCallback>();

  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private enabled = false;

  constructor(config: InputHandlerConfig = {}) {
    const {
      das = DEFAULT_CONFIG.timing.das,
      arr = DEFAULT_CONFIG.timing.arr,
      keyBindings = DEFAULT_KEY_BINDINGS,
    } = config;

    this.das = das;
    this.arr = arr;
    this.keyBindings = keyBindings;

    this.buildKeyToActionMap();
  }

  /**
   * Build reverse lookup map from key codes to actions.
   */
  private buildKeyToActionMap(): void {
    this.keyToAction.clear();
    for (const [action, keys] of Object.entries(this.keyBindings)) {
      for (const key of keys) {
        this.keyToAction.set(key, action as InputAction);
      }
    }
  }

  /**
   * Add a callback for input actions.
   * @param callback - Function to call when an action is triggered
   */
  addCallback(callback: InputCallback): void {
    this.actionCallbacks.add(callback);
  }

  /**
   * Remove a callback for input actions.
   * @param callback - The callback to remove
   */
  removeCallback(callback: InputCallback): void {
    this.actionCallbacks.delete(callback);
  }

  /**
   * Start listening for keyboard events.
   */
  enable(): void {
    if (this.enabled) return;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);

    this.enabled = true;
  }

  /**
   * Stop listening for keyboard events.
   */
  disable(): void {
    if (!this.enabled) return;

    if (this.boundKeyDown) {
      window.removeEventListener('keydown', this.boundKeyDown);
    }
    if (this.boundKeyUp) {
      window.removeEventListener('keyup', this.boundKeyUp);
    }

    this.boundKeyDown = null;
    this.boundKeyUp = null;
    this.keyStates.clear();
    this.enabled = false;
  }

  /**
   * Check if input handling is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Handle keydown events.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const action = this.keyToAction.get(event.code);
    if (!action) return;

    // Prevent browser defaults for game keys
    event.preventDefault();

    const existingState = this.keyStates.get(event.code);
    if (existingState?.pressed) {
      // Key is already pressed (held), ignore repeat keydown events
      return;
    }

    // Record key press
    const now = performance.now();
    this.keyStates.set(event.code, {
      pressed: true,
      pressedAt: now,
      dasActivated: false,
      lastRepeat: now,
    });

    // Trigger immediate action
    this.triggerAction(action);
  }

  /**
   * Handle keyup events.
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const action = this.keyToAction.get(event.code);
    if (!action) return;

    // Clear key state
    this.keyStates.delete(event.code);
  }

  /**
   * Trigger an action and notify all callbacks.
   */
  private triggerAction(action: InputAction): void {
    for (const callback of this.actionCallbacks) {
      callback(action);
    }
  }

  /**
   * Update DAS/ARR state and trigger repeat actions.
   * Should be called every frame from the game loop.
   * @param currentTime - Current timestamp (from performance.now() or game loop)
   */
  update(currentTime: number): void {
    for (const [keyCode, state] of this.keyStates) {
      if (!state.pressed) continue;

      const action = this.keyToAction.get(keyCode);
      if (!action || !REPEATABLE_ACTIONS.includes(action)) continue;

      const elapsed = currentTime - state.pressedAt;

      if (!state.dasActivated) {
        // Check if DAS delay has passed
        if (elapsed >= this.das) {
          state.dasActivated = true;
          state.lastRepeat = currentTime;
          this.triggerAction(action);
        }
      } else {
        // DAS activated, check ARR timing
        const sinceLastRepeat = currentTime - state.lastRepeat;
        if (sinceLastRepeat >= this.arr) {
          state.lastRepeat = currentTime;
          this.triggerAction(action);
        }
      }
    }
  }

  /**
   * Check if a specific action's key is currently held.
   * @param action - The action to check
   * @returns true if any key for this action is pressed
   */
  isActionHeld(action: InputAction): boolean {
    const keys = this.keyBindings[action];
    for (const key of keys) {
      const state = this.keyStates.get(key);
      if (state?.pressed) {
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all pressed key states.
   * Useful when the game loses focus or is paused.
   */
  clearAllKeys(): void {
    this.keyStates.clear();
  }

  /**
   * Get the current DAS value.
   */
  getDAS(): number {
    return this.das;
  }

  /**
   * Get the current ARR value.
   */
  getARR(): number {
    return this.arr;
  }

  /**
   * Get the current key bindings.
   */
  getKeyBindings(): KeyBindings {
    return { ...this.keyBindings };
  }
}
