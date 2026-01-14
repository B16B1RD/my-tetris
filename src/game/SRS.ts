/**
 * Super Rotation System (SRS)
 * @module game/SRS
 * @description Implements the Tetris Guideline-compliant rotation system with wall kicks.
 */

import type { RotationState, Position, TetrominoType } from '../types/index.ts';
import type { Tetromino } from './Tetromino.ts';
import type { Board } from './Board.ts';

/**
 * Rotation direction for wall kick data lookup.
 */
export type RotationDirection = 'clockwise' | 'counterClockwise';

/**
 * Wall kick offset data.
 * Each entry represents a (dx, dy) offset to try when the initial rotation fails.
 */
type WallKickOffsets = readonly Position[];

/**
 * Wall kick data for all rotation transitions.
 * Key format: "{fromState}{toState}" (e.g., "01" for 0→1 clockwise rotation)
 */
type WallKickTable = Record<string, WallKickOffsets>;

/**
 * Wall kick data for J, L, S, T, Z tetrominoes.
 * Per SRS specification.
 */
const JLSTZ_WALL_KICKS: WallKickTable = {
  // 0→R (clockwise)
  '01': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 },
  ],
  // R→2 (clockwise)
  '12': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
  ],
  // 2→L (clockwise)
  '23': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
  // L→0 (clockwise)
  '30': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -2 },
    { x: -1, y: -2 },
  ],
  // R→0 (counter-clockwise)
  '10': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
  ],
  // 2→R (counter-clockwise)
  '21': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 },
  ],
  // L→2 (counter-clockwise)
  '32': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -2 },
    { x: -1, y: -2 },
  ],
  // 0→L (counter-clockwise)
  '03': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
};

/**
 * Wall kick data for I tetromino.
 * I piece has different wall kick offsets per SRS specification.
 */
const I_WALL_KICKS: WallKickTable = {
  // 0→R (clockwise)
  '01': [
    { x: 0, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 1 },
    { x: 1, y: -2 },
  ],
  // R→2 (clockwise)
  '12': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: -2 },
    { x: 2, y: 1 },
  ],
  // 2→L (clockwise)
  '23': [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: -1 },
    { x: -1, y: 2 },
  ],
  // L→0 (clockwise)
  '30': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 2 },
    { x: -2, y: -1 },
  ],
  // R→0 (counter-clockwise)
  '10': [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: -1 },
    { x: -1, y: 2 },
  ],
  // 2→R (counter-clockwise)
  '21': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 2 },
    { x: -2, y: -1 },
  ],
  // L→2 (counter-clockwise)
  '32': [
    { x: 0, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 1 },
    { x: 1, y: -2 },
  ],
  // 0→L (counter-clockwise)
  '03': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: -2 },
    { x: 2, y: 1 },
  ],
};

/**
 * Result of a rotation attempt.
 */
export interface RotationResult {
  /** Whether the rotation was successful */
  success: boolean;
  /** The wall kick offset that was applied (if any) */
  kickOffset: Position | null;
  /** Index of the wall kick test that succeeded (0 = no kick, 1-4 = kick) */
  kickIndex: number;
}

/**
 * Get the appropriate wall kick table for a tetromino type.
 * @param type - The tetromino type
 * @returns The wall kick table for this piece type
 */
function getWallKickTable(type: TetrominoType): WallKickTable {
  return type === 'I' ? I_WALL_KICKS : JLSTZ_WALL_KICKS;
}

/**
 * Get the target rotation state.
 * @param current - Current rotation state
 * @param direction - Rotation direction
 * @returns Target rotation state
 */
export function getTargetRotation(
  current: RotationState,
  direction: RotationDirection
): RotationState {
  if (direction === 'clockwise') {
    return ((current + 1) % 4) as RotationState;
  }
  return ((current + 3) % 4) as RotationState;
}

/**
 * Attempt to rotate a tetromino using SRS wall kicks.
 * @param tetromino - The tetromino to rotate
 * @param board - The game board for collision detection
 * @param direction - The rotation direction
 * @returns Result indicating success and the kick offset applied
 */
export function tryRotation(
  tetromino: Tetromino,
  board: Board,
  direction: RotationDirection
): RotationResult {
  // O-piece doesn't rotate (always succeeds with no change)
  if (tetromino.type === 'O') {
    return { success: true, kickOffset: null, kickIndex: 0 };
  }

  const fromState = tetromino.rotation;
  const toState = getTargetRotation(fromState, direction);
  const transitionKey = `${fromState}${toState}`;

  const wallKickTable = getWallKickTable(tetromino.type);
  const offsets = wallKickTable[transitionKey];

  if (!offsets) {
    return { success: false, kickOffset: null, kickIndex: -1 };
  }

  // Create a test piece to try rotations
  const testPiece = tetromino.clone();
  testPiece.setRotation(toState);

  // Try each wall kick offset
  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];
    if (!offset) continue;

    testPiece.setPosition({
      x: tetromino.position.x + offset.x,
      y: tetromino.position.y + offset.y,
    });

    if (board.canPlaceTetromino(testPiece)) {
      // Apply the successful rotation to the original tetromino
      tetromino.setRotation(toState);
      tetromino.setPosition(testPiece.position);
      return {
        success: true,
        kickOffset: i === 0 ? null : offset,
        kickIndex: i,
      };
    }
  }

  // All wall kick tests failed
  return { success: false, kickOffset: null, kickIndex: -1 };
}

/**
 * Rotate a tetromino clockwise using SRS.
 * @param tetromino - The tetromino to rotate
 * @param board - The game board for collision detection
 * @returns true if rotation succeeded, false otherwise
 */
export function rotateClockwise(tetromino: Tetromino, board: Board): boolean {
  return tryRotation(tetromino, board, 'clockwise').success;
}

/**
 * Rotate a tetromino counter-clockwise using SRS.
 * @param tetromino - The tetromino to rotate
 * @param board - The game board for collision detection
 * @returns true if rotation succeeded, false otherwise
 */
export function rotateCounterClockwise(
  tetromino: Tetromino,
  board: Board
): boolean {
  return tryRotation(tetromino, board, 'counterClockwise').success;
}

/**
 * Export wall kick tables for testing purposes.
 */
export const WALL_KICK_DATA = {
  JLSTZ: JLSTZ_WALL_KICKS,
  I: I_WALL_KICKS,
} as const;
