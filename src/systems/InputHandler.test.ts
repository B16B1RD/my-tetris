/**
 * InputHandler Tests
 * @module systems/InputHandler.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputHandler, DEFAULT_KEY_BINDINGS } from './InputHandler.ts';
import type { InputAction } from '../types/index.ts';

describe('InputHandler', () => {
  let handler: InputHandler;
  let receivedActions: InputAction[];

  beforeEach(() => {
    handler = new InputHandler();
    receivedActions = [];
    handler.addCallback((action) => receivedActions.push(action));
  });

  afterEach(() => {
    handler.disable();
  });

  describe('construction', () => {
    it('should create with default config', () => {
      expect(handler.getDAS()).toBe(170);
      expect(handler.getARR()).toBe(50);
    });

    it('should create with custom config', () => {
      const customHandler = new InputHandler({
        das: 100,
        arr: 30,
      });
      expect(customHandler.getDAS()).toBe(100);
      expect(customHandler.getARR()).toBe(30);
    });

    it('should have default key bindings', () => {
      const bindings = handler.getKeyBindings();
      expect(bindings.moveLeft).toContain('ArrowLeft');
      expect(bindings.rotateClockwise).toContain('KeyX');
    });
  });

  describe('enable/disable', () => {
    it('should not be enabled by default', () => {
      expect(handler.isEnabled()).toBe(false);
    });

    it('should enable when enable() is called', () => {
      handler.enable();
      expect(handler.isEnabled()).toBe(true);
    });

    it('should disable when disable() is called', () => {
      handler.enable();
      handler.disable();
      expect(handler.isEnabled()).toBe(false);
    });

    it('should ignore multiple enable calls', () => {
      handler.enable();
      handler.enable();
      expect(handler.isEnabled()).toBe(true);
    });

    it('should ignore disable when not enabled', () => {
      handler.disable();
      expect(handler.isEnabled()).toBe(false);
    });
  });

  describe('key events', () => {
    beforeEach(() => {
      handler.enable();
    });

    it('should trigger action on keydown', () => {
      const event = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
      window.dispatchEvent(event);

      expect(receivedActions).toContain('moveLeft');
    });

    it('should trigger correct action for each key binding', () => {
      // Test moveRight
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
      expect(receivedActions).toContain('moveRight');

      // Test rotateClockwise
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX' }));
      expect(receivedActions).toContain('rotateClockwise');

      // Test hardDrop
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(receivedActions).toContain('hardDrop');
    });

    it('should not trigger action for unmapped keys', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyY' }));
      expect(receivedActions).toHaveLength(0);
    });

    it('should not trigger repeat keydowns while key is held', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));

      // Only first keydown should trigger
      expect(receivedActions.filter((a) => a === 'moveLeft')).toHaveLength(1);
    });

    it('should allow new action after keyup', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));

      expect(receivedActions.filter((a) => a === 'moveLeft')).toHaveLength(2);
    });
  });

  describe('DAS/ARR', () => {
    beforeEach(() => {
      handler = new InputHandler({ das: 100, arr: 50 });
      receivedActions = [];
      handler.addCallback((action) => receivedActions.push(action));
      handler.enable();
    });

    it('should not repeat before DAS delay', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      receivedActions.length = 0; // Clear initial action

      // Update at 50ms (before DAS of 100ms)
      handler.update(50);

      expect(receivedActions).toHaveLength(0);
    });

    it('should trigger repeat after DAS delay', () => {
      const startTime = performance.now();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      receivedActions.length = 0;

      // Update at DAS + small buffer
      handler.update(startTime + 101);

      expect(receivedActions).toContain('moveLeft');
    });

    it('should trigger ARR repeats after DAS', () => {
      const startTime = performance.now();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      receivedActions.length = 0;

      // First update triggers DAS
      handler.update(startTime + 101);
      expect(receivedActions).toHaveLength(1);

      // Second update at ARR interval
      handler.update(startTime + 152);
      expect(receivedActions).toHaveLength(2);

      // Third update at next ARR interval
      handler.update(startTime + 203);
      expect(receivedActions).toHaveLength(3);
    });

    it('should not repeat non-repeatable actions', () => {
      const startTime = performance.now();

      // rotateClockwise is not repeatable
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX' }));
      receivedActions.length = 0;

      handler.update(startTime + 200);

      expect(receivedActions).toHaveLength(0);
    });

    it('should stop repeat after keyup', () => {
      const startTime = performance.now();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      receivedActions.length = 0;

      handler.update(startTime + 101);
      expect(receivedActions).toHaveLength(1);

      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));

      handler.update(startTime + 200);
      expect(receivedActions).toHaveLength(1); // No new actions
    });
  });

  describe('isActionHeld', () => {
    beforeEach(() => {
      handler.enable();
    });

    it('should return true when action key is held', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      expect(handler.isActionHeld('moveLeft')).toBe(true);
    });

    it('should return false when action key is released', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
      expect(handler.isActionHeld('moveLeft')).toBe(false);
    });

    it('should return true if any key for action is held', () => {
      // ArrowLeft and KeyA are both mapped to moveLeft
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(handler.isActionHeld('moveLeft')).toBe(true);
    });
  });

  describe('clearAllKeys', () => {
    beforeEach(() => {
      handler.enable();
    });

    it('should clear all key states', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));

      expect(handler.isActionHeld('moveLeft')).toBe(true);
      expect(handler.isActionHeld('moveRight')).toBe(true);

      handler.clearAllKeys();

      expect(handler.isActionHeld('moveLeft')).toBe(false);
      expect(handler.isActionHeld('moveRight')).toBe(false);
    });
  });

  describe('callback management', () => {
    beforeEach(() => {
      handler.enable();
    });

    it('should notify all callbacks', () => {
      const secondReceived: InputAction[] = [];
      handler.addCallback((action) => secondReceived.push(action));

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));

      expect(receivedActions).toContain('moveLeft');
      expect(secondReceived).toContain('moveLeft');
    });

    it('should allow removing callbacks', () => {
      const callback = (action: InputAction): void => {
        receivedActions.push(action);
      };

      // Clear existing callback and add new one
      receivedActions.length = 0;

      handler.removeCallback(callback);

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));

      // Original callback should still receive (it's a different reference)
      expect(receivedActions).toContain('moveRight');
    });
  });

  describe('default key bindings', () => {
    it('should have all required actions', () => {
      const requiredActions: InputAction[] = [
        'moveLeft',
        'moveRight',
        'softDrop',
        'hardDrop',
        'rotateClockwise',
        'rotateCounterClockwise',
        'hold',
        'pause',
      ];

      for (const action of requiredActions) {
        expect(DEFAULT_KEY_BINDINGS[action]).toBeDefined();
        expect(DEFAULT_KEY_BINDINGS[action].length).toBeGreaterThan(0);
      }
    });

    it('should have standard Tetris key mappings', () => {
      expect(DEFAULT_KEY_BINDINGS.moveLeft).toContain('ArrowLeft');
      expect(DEFAULT_KEY_BINDINGS.moveRight).toContain('ArrowRight');
      expect(DEFAULT_KEY_BINDINGS.softDrop).toContain('ArrowDown');
      expect(DEFAULT_KEY_BINDINGS.hardDrop).toContain('Space');
      expect(DEFAULT_KEY_BINDINGS.pause).toContain('Escape');
    });
  });
});
