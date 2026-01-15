/**
 * ReplaySystem Tests
 * @module systems/ReplaySystem.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReplaySystem } from './ReplaySystem.ts';
import type { ReplayData, ReplayPlaybackState } from '../types/index.ts';

describe('ReplaySystem', () => {
  let replaySystem: ReplaySystem;

  beforeEach(() => {
    replaySystem = new ReplaySystem();
  });

  describe('Recording', () => {
    it('should start recording with a seed', () => {
      replaySystem.startRecording(12345);

      expect(replaySystem.isRecording()).toBe(true);
      expect(replaySystem.getSeed()).toBe(12345);
      expect(replaySystem.getEventCount()).toBe(0);
    });

    it('should record input actions', () => {
      replaySystem.startRecording(12345);

      replaySystem.recordAction('moveLeft');
      replaySystem.recordAction('moveRight');
      replaySystem.recordAction('hardDrop');

      expect(replaySystem.getEventCount()).toBe(3);
    });

    it('should not record actions when not recording', () => {
      replaySystem.recordAction('moveLeft');

      expect(replaySystem.getEventCount()).toBe(0);
    });

    it('should stop recording and return replay data', () => {
      replaySystem.startRecording(12345);
      replaySystem.recordAction('moveLeft');
      replaySystem.recordAction('hardDrop');

      const replayData = replaySystem.stopRecording(1000, 5, 20);

      expect(replaySystem.isRecording()).toBe(false);
      expect(replayData.seed).toBe(12345);
      expect(replayData.events).toHaveLength(2);
      expect(replayData.finalScore).toBe(1000);
      expect(replayData.finalLevel).toBe(5);
      expect(replayData.finalLines).toBe(20);
      expect(replayData.id).toMatch(/^replay_\d+_[a-z0-9]+$/);
      expect(replayData.date).toBeTruthy();
      expect(replayData.duration).toBeGreaterThan(0);
    });

    it('should record actions with timestamps', () => {
      replaySystem.startRecording(12345);
      replaySystem.recordAction('moveLeft');

      const replayData = replaySystem.stopRecording(0, 1, 0);

      expect(replayData.events[0]?.timestamp).toBeGreaterThanOrEqual(0);
      expect(replayData.events[0]?.action).toBe('moveLeft');
    });

    it('should reset state when startRecording is called again', () => {
      replaySystem.startRecording(11111);
      replaySystem.recordAction('moveLeft');
      replaySystem.recordAction('moveRight');
      expect(replaySystem.getEventCount()).toBe(2);

      // Start recording again with new seed
      replaySystem.startRecording(22222);

      expect(replaySystem.isRecording()).toBe(true);
      expect(replaySystem.getSeed()).toBe(22222);
      expect(replaySystem.getEventCount()).toBe(0); // Events should be reset
    });
  });

  describe('Playback', () => {
    let mockReplay: ReplayData;
    let playbackState: ReplayPlaybackState;

    beforeEach(() => {
      mockReplay = {
        id: 'test_replay',
        seed: 12345,
        events: [
          { timestamp: 100, action: 'moveLeft' },
          { timestamp: 200, action: 'moveRight' },
          { timestamp: 300, action: 'hardDrop' },
          { timestamp: 500, action: 'rotateClockwise' },
        ],
        finalScore: 1000,
        finalLevel: 5,
        finalLines: 20,
        date: new Date().toISOString(),
        duration: 1000,
      };
      playbackState = ReplaySystem.createPlaybackState(mockReplay);
    });

    it('should create initial playback state', () => {
      expect(playbackState.replay).toBe(mockReplay);
      expect(playbackState.currentTime).toBe(0);
      expect(playbackState.nextEventIndex).toBe(0);
      expect(playbackState.paused).toBe(false);
      expect(playbackState.speed).toBe(1);
      expect(playbackState.finished).toBe(false);
    });

    it('should trigger events as time passes', () => {
      // Update to 150ms - should trigger first event
      const actions1 = ReplaySystem.updatePlayback(playbackState, 150);
      expect(actions1).toEqual(['moveLeft']);
      expect(playbackState.nextEventIndex).toBe(1);

      // Update to 350ms - should trigger second and third events
      const actions2 = ReplaySystem.updatePlayback(playbackState, 200);
      expect(actions2).toEqual(['moveRight', 'hardDrop']);
      expect(playbackState.nextEventIndex).toBe(3);
    });

    it('should respect playback speed', () => {
      ReplaySystem.setSpeed(playbackState, 2);

      // At 2x speed, 100ms real time = 200ms game time
      const actions = ReplaySystem.updatePlayback(playbackState, 100);
      expect(actions).toEqual(['moveLeft', 'moveRight']);
    });

    it('should not trigger events when paused', () => {
      ReplaySystem.pause(playbackState);

      const actions = ReplaySystem.updatePlayback(playbackState, 500);
      expect(actions).toEqual([]);
      expect(playbackState.currentTime).toBe(0);
    });

    it('should resume playback', () => {
      ReplaySystem.pause(playbackState);
      ReplaySystem.resume(playbackState);

      const actions = ReplaySystem.updatePlayback(playbackState, 150);
      expect(actions).toEqual(['moveLeft']);
    });

    it('should toggle pause state', () => {
      expect(playbackState.paused).toBe(false);

      ReplaySystem.togglePause(playbackState);
      expect(playbackState.paused).toBe(true);

      ReplaySystem.togglePause(playbackState);
      expect(playbackState.paused).toBe(false);
    });

    it('should mark playback as finished', () => {
      // Fast forward past all events and duration
      ReplaySystem.updatePlayback(playbackState, 1100);

      expect(playbackState.finished).toBe(true);
    });

    it('should mark finished at exact duration boundary', () => {
      // Update to exactly duration (1000ms)
      ReplaySystem.updatePlayback(playbackState, 1000);

      expect(playbackState.finished).toBe(true);
      expect(playbackState.nextEventIndex).toBe(4); // All events processed
    });

    it('should return empty array when already finished', () => {
      // First, finish the playback
      ReplaySystem.updatePlayback(playbackState, 1100);
      expect(playbackState.finished).toBe(true);

      // Subsequent calls should return empty array and not change state
      const actions = ReplaySystem.updatePlayback(playbackState, 100);
      expect(actions).toEqual([]);
      expect(playbackState.currentTime).toBe(1100); // Should not change
    });

    it('should calculate progress percentage', () => {
      expect(ReplaySystem.getProgress(playbackState)).toBe(0);

      ReplaySystem.updatePlayback(playbackState, 500);
      expect(ReplaySystem.getProgress(playbackState)).toBe(50);

      ReplaySystem.updatePlayback(playbackState, 500);
      expect(ReplaySystem.getProgress(playbackState)).toBe(100);
    });

    it('should cap progress at 100% when currentTime exceeds duration', () => {
      // Fast forward way past duration
      ReplaySystem.updatePlayback(playbackState, 2000);

      expect(ReplaySystem.getProgress(playbackState)).toBe(100);
    });

    it('should handle empty replay gracefully', () => {
      const emptyReplay: ReplayData = {
        id: 'empty',
        seed: 0,
        events: [],
        finalScore: 0,
        finalLevel: 1,
        finalLines: 0,
        date: new Date().toISOString(),
        duration: 0,
      };
      const state = ReplaySystem.createPlaybackState(emptyReplay);

      const actions = ReplaySystem.updatePlayback(state, 100);
      expect(actions).toEqual([]);
      expect(state.finished).toBe(true);
      expect(ReplaySystem.getProgress(state)).toBe(100);
    });
  });

  describe('Time Formatting', () => {
    it('should format time as MM:SS', () => {
      expect(ReplaySystem.formatTime(0)).toBe('00:00');
      expect(ReplaySystem.formatTime(5000)).toBe('00:05');
      expect(ReplaySystem.formatTime(65000)).toBe('01:05');
      expect(ReplaySystem.formatTime(3600000)).toBe('60:00');
    });
  });

  describe('Speed Options', () => {
    it('should support 0.5x speed', () => {
      const mockReplay: ReplayData = {
        id: 'test',
        seed: 0,
        events: [{ timestamp: 100, action: 'moveLeft' }],
        finalScore: 0,
        finalLevel: 1,
        finalLines: 0,
        date: new Date().toISOString(),
        duration: 1000,
      };
      const state = ReplaySystem.createPlaybackState(mockReplay);
      ReplaySystem.setSpeed(state, 0.5);

      // At 0.5x speed, 100ms real time = 50ms game time
      const actions1 = ReplaySystem.updatePlayback(state, 100);
      expect(actions1).toEqual([]);

      // Need 200ms real time to reach 100ms game time
      const actions2 = ReplaySystem.updatePlayback(state, 100);
      expect(actions2).toEqual(['moveLeft']);
    });
  });
});
