/**
 * T-Spin Detection
 * @module game/TSpin
 * @description Implements T-Spin detection using the 3-corner rule per Tetris Guideline.
 */

import type { Position, RotationState, TSpinType } from '../types/index.ts';
import type { Tetromino } from './Tetromino.ts';
import type { Board } from './Board.ts';

// Re-export TSpinType for convenience
export type { TSpinType } from '../types/index.ts';

/** T-piece center offset within the 4x4 matrix */
const T_CENTER_OFFSET: Position = { x: 1, y: 1 };

/** Wall kick index that triggers T-Spin Mini (5th test, 0-indexed) */
const TSPIN_MINI_KICK_INDEX = 4;

/** Minimum corners required for T-Spin detection */
const MIN_CORNERS_FOR_TSPIN = 3;

/**
 * Result of T-Spin detection.
 */
export interface TSpinResult {
  /** Type of T-Spin detected */
  type: TSpinType;
  /** Whether the last move was a rotation */
  wasRotation: boolean;
}

/**
 * Corner positions relative to T-piece center for each rotation state.
 * The T-piece center is at position (1, 1) in its 4x4 matrix.
 *
 * Corner layout (relative to center):
 *   A (front-left)   B (front-right)
 *          [center]
 *   C (back-left)    D (back-right)
 *
 * "Front" corners are in the direction the T is pointing.
 */
const T_CORNERS: Record<RotationState, { front: Position[]; back: Position[] }> = {
  // State 0: T points up
  //   [*]   <- front corners at (-1, -1) and (1, -1)
  // [*][T][*]
  //   [ ]   <- back corners at (-1, 1) and (1, 1)
  0: {
    front: [{ x: -1, y: -1 }, { x: 1, y: -1 }],
    back: [{ x: -1, y: 1 }, { x: 1, y: 1 }],
  },
  // State 1: T points right (R)
  //   [*][ ]   <- front corner at (1, -1) relative to center
  // [*][T][*]  <- center at offset (1, 1) in 4x4 matrix
  //   [*][ ]   <- front corner at (1, 1) relative to center
  1: {
    front: [{ x: 1, y: -1 }, { x: 1, y: 1 }],
    back: [{ x: -1, y: -1 }, { x: -1, y: 1 }],
  },
  // State 2: T points down (180°)
  //   [ ]   <- back corners at (-1, -1) and (1, -1)
  // [*][T][*]
  //   [*]   <- front corners at (-1, 1) and (1, 1)
  2: {
    front: [{ x: -1, y: 1 }, { x: 1, y: 1 }],
    back: [{ x: -1, y: -1 }, { x: 1, y: -1 }],
  },
  // State 3: T points left (L)
  //   [ ][*]   <- corners at (-1, -1) and (0, -1)
  //     [*][T] <- center is at (1, 1) relative to piece position
  //   [ ][*]   <- corners at (-1, 1) and (0, 1)
  3: {
    front: [{ x: -1, y: -1 }, { x: -1, y: 1 }],
    back: [{ x: 1, y: -1 }, { x: 1, y: 1 }],
  },
};

/**
 * Check if a corner position is filled (either occupied by a locked piece or out of bounds).
 * @param board - The game board
 * @param centerX - X coordinate of the T-piece center
 * @param centerY - Y coordinate of the T-piece center
 * @param offset - Corner offset relative to center
 * @returns true if the corner is filled or out of bounds
 */
function isCornerFilled(
  board: Board,
  centerX: number,
  centerY: number,
  offset: Position
): boolean {
  const x = centerX + offset.x;
  const y = centerY + offset.y;

  // Out of bounds counts as filled
  if (!board.isInBounds(x, y)) {
    return true;
  }

  return !board.isCellEmpty(x, y);
}

/**
 * Get the center position of a T-piece.
 * The center is at T_CENTER_OFFSET in the piece's local 4x4 matrix.
 * @param tetromino - The T-piece tetromino
 * @returns The center position in board coordinates
 */
function getTCenter(tetromino: Tetromino): Position {
  return {
    x: tetromino.position.x + T_CENTER_OFFSET.x,
    y: tetromino.position.y + T_CENTER_OFFSET.y,
  };
}

/**
 * Detect T-Spin using the 3-corner rule.
 *
 * T-Spin is detected when:
 * 1. The piece is a T-piece
 * 2. The last successful move was a rotation
 * 3. At least 3 of the 4 corners around the T-piece center are filled
 *
 * T-Spin Mini is detected when:
 * - 3 corners are filled, but NOT both front corners
 * - OR the rotation used wall kick test 4 (kickIndex >= 4)
 *
 * Full T-Spin is detected when:
 * - 3+ corners are filled AND both front corners are filled
 *
 * @param tetromino - The T-piece that just locked
 * @param board - The game board (should be checked BEFORE locking the piece)
 * @param wasRotation - Whether the last action was a rotation
 * @param kickIndex - The wall kick test index that succeeded (0 = no kick)
 * @returns T-Spin detection result
 */
export function detectTSpin(
  tetromino: Tetromino,
  board: Board,
  wasRotation: boolean,
  kickIndex: number
): TSpinResult {
  // Must be a T-piece
  if (tetromino.type !== 'T') {
    return { type: 'none', wasRotation };
  }

  // Must have rotated as the last action
  if (!wasRotation) {
    return { type: 'none', wasRotation };
  }

  const center = getTCenter(tetromino);
  const rotation = tetromino.rotation;
  const corners = T_CORNERS[rotation];

  if (!corners) {
    return { type: 'none', wasRotation };
  }

  // Count filled corners
  let filledCount = 0;
  let frontFilledCount = 0;

  // Check front corners
  for (const offset of corners.front) {
    if (isCornerFilled(board, center.x, center.y, offset)) {
      filledCount++;
      frontFilledCount++;
    }
  }

  // Check back corners
  for (const offset of corners.back) {
    if (isCornerFilled(board, center.x, center.y, offset)) {
      filledCount++;
    }
  }

  // 3-corner rule: need at least 3 corners filled
  if (filledCount < MIN_CORNERS_FOR_TSPIN) {
    return { type: 'none', wasRotation };
  }

  // T-Spin Mini conditions:
  // 1. Used wall kick test 4 or higher (5th+ test, 0-indexed)
  // 2. OR only 1 front corner is filled (not both)
  if (kickIndex >= TSPIN_MINI_KICK_INDEX || frontFilledCount < 2) {
    return { type: 'mini', wasRotation };
  }

  // Full T-Spin: both front corners filled
  return { type: 'full', wasRotation };
}

/**
 * Create a human-readable description of the T-Spin result with line clears.
 * @param tspinType - The type of T-Spin
 * @param linesCleared - Number of lines cleared
 * @returns Description string
 */
export function getTSpinDescription(tspinType: TSpinType, linesCleared: number): string {
  if (tspinType === 'none') {
    switch (linesCleared) {
      case 0:
        return '';
      case 1:
        return 'Single';
      case 2:
        return 'Double';
      case 3:
        return 'Triple';
      case 4:
        return 'Tetris';
      default:
        return `${linesCleared} Lines`;
    }
  }

  const prefix = tspinType === 'mini' ? 'T-Spin Mini' : 'T-Spin';

  switch (linesCleared) {
    case 0:
      return prefix;
    case 1:
      return `${prefix} Single`;
    case 2:
      return `${prefix} Double`;
    case 3:
      return `${prefix} Triple`;
    default:
      return `${prefix} ${linesCleared} Lines`;
  }
}
