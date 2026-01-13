/**
 * Tetromino definitions and operations
 * @module game/Tetromino
 * @description Defines the 7 standard tetrominoes with SRS-compliant shapes and colors.
 */

import type {
  TetrominoType,
  TetrominoDef,
  ShapeMatrix,
  RotationState,
  Position,
} from '../types/index.ts';

/**
 * Standard Guideline colors for each tetromino type.
 * Colors are defined as CSS color strings.
 */
export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#00f0f0', // Cyan
  O: '#f0f000', // Yellow
  T: '#a000f0', // Purple
  S: '#00f000', // Green
  Z: '#f00000', // Red
  J: '#0000f0', // Blue
  L: '#f0a000', // Orange
} as const;

/**
 * I-tetromino shape matrices for all 4 rotation states.
 * Using 4x4 matrix as per SRS specification.
 */
const I_SHAPES: readonly ShapeMatrix[] = [
  // State 0 (spawn)
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 1 (R - clockwise)
  [
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
  ],
  // State 2 (180°)
  [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
  ],
  // State 3 (L - counter-clockwise)
  [
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
  ],
];

/**
 * O-tetromino shape matrices for all 4 rotation states.
 * O-piece doesn't visually change but has 4 states for consistency.
 */
const O_SHAPES: readonly ShapeMatrix[] = [
  // All states are identical for O-piece
  [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
];

/**
 * T-tetromino shape matrices for all 4 rotation states.
 */
const T_SHAPES: readonly ShapeMatrix[] = [
  // State 0 (spawn)
  [
    [0, 1, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 1 (R)
  [
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 2 (180°)
  [
    [0, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 3 (L)
  [
    [0, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
];

/**
 * S-tetromino shape matrices for all 4 rotation states.
 */
const S_SHAPES: readonly ShapeMatrix[] = [
  // State 0 (spawn)
  [
    [0, 1, 1, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 1 (R)
  [
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 0],
  ],
  // State 2 (180°)
  [
    [0, 0, 0, 0],
    [0, 1, 1, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 3 (L)
  [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
];

/**
 * Z-tetromino shape matrices for all 4 rotation states.
 */
const Z_SHAPES: readonly ShapeMatrix[] = [
  // State 0 (spawn)
  [
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 1 (R)
  [
    [0, 0, 1, 0],
    [0, 1, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 2 (180°)
  [
    [0, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  // State 3 (L)
  [
    [0, 1, 0, 0],
    [1, 1, 0, 0],
    [1, 0, 0, 0],
    [0, 0, 0, 0],
  ],
];

/**
 * J-tetromino shape matrices for all 4 rotation states.
 */
const J_SHAPES: readonly ShapeMatrix[] = [
  // State 0 (spawn)
  [
    [1, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 1 (R)
  [
    [0, 1, 1, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 2 (180°)
  [
    [0, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 0],
  ],
  // State 3 (L)
  [
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
  ],
];

/**
 * L-tetromino shape matrices for all 4 rotation states.
 */
const L_SHAPES: readonly ShapeMatrix[] = [
  // State 0 (spawn)
  [
    [0, 0, 1, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 1 (R)
  [
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  // State 2 (180°)
  [
    [0, 0, 0, 0],
    [1, 1, 1, 0],
    [1, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // State 3 (L)
  [
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
];

/**
 * Complete tetromino definitions for all 7 types.
 */
export const TETROMINO_DEFS: Record<TetrominoType, TetrominoDef> = {
  I: { type: 'I', color: TETROMINO_COLORS.I, shapes: I_SHAPES },
  O: { type: 'O', color: TETROMINO_COLORS.O, shapes: O_SHAPES },
  T: { type: 'T', color: TETROMINO_COLORS.T, shapes: T_SHAPES },
  S: { type: 'S', color: TETROMINO_COLORS.S, shapes: S_SHAPES },
  Z: { type: 'Z', color: TETROMINO_COLORS.Z, shapes: Z_SHAPES },
  J: { type: 'J', color: TETROMINO_COLORS.J, shapes: J_SHAPES },
  L: { type: 'L', color: TETROMINO_COLORS.L, shapes: L_SHAPES },
} as const;

/**
 * All tetromino types as an array for iteration.
 */
export const ALL_TETROMINO_TYPES: readonly TetrominoType[] = [
  'I',
  'O',
  'T',
  'S',
  'Z',
  'J',
  'L',
] as const;

/**
 * Represents an active tetromino piece on the game board.
 */
export class Tetromino {
  readonly type: TetrominoType;
  readonly color: string;
  private _rotation: RotationState;
  private _position: Position;

  constructor(type: TetrominoType, position?: Position) {
    this.type = type;
    this.color = TETROMINO_COLORS[type];
    this._rotation = 0;
    this._position = position ?? { x: 3, y: 0 };
  }

  /** Current rotation state (0-3) */
  get rotation(): RotationState {
    return this._rotation;
  }

  /** Current position on the board */
  get position(): Position {
    return { ...this._position };
  }

  /** Current shape matrix based on rotation state */
  get shape(): ShapeMatrix {
    const shapes = TETROMINO_DEFS[this.type].shapes;
    const shape = shapes[this._rotation];
    if (!shape) {
      throw new Error(`Invalid rotation state: ${this._rotation}`);
    }
    return shape;
  }

  /**
   * Get cell positions that this tetromino occupies in board coordinates.
   * @returns Array of positions relative to the board
   */
  getCells(): Position[] {
    const cells: Position[] = [];
    const shape = this.shape;

    for (let row = 0; row < shape.length; row++) {
      const shapeRow = shape[row];
      if (!shapeRow) continue;
      for (let col = 0; col < shapeRow.length; col++) {
        if (shapeRow[col] === 1) {
          cells.push({
            x: this._position.x + col,
            y: this._position.y + row,
          });
        }
      }
    }

    return cells;
  }

  /**
   * Move the tetromino by the given delta.
   * @param dx - Horizontal movement (positive = right)
   * @param dy - Vertical movement (positive = down)
   */
  move(dx: number, dy: number): void {
    this._position.x += dx;
    this._position.y += dy;
  }

  /**
   * Set the tetromino's position directly.
   * @param position - New position
   */
  setPosition(position: Position): void {
    this._position = { ...position };
  }

  /**
   * Rotate the tetromino clockwise.
   */
  rotateClockwise(): void {
    this._rotation = ((this._rotation + 1) % 4) as RotationState;
  }

  /**
   * Rotate the tetromino counter-clockwise.
   */
  rotateCounterClockwise(): void {
    this._rotation = ((this._rotation + 3) % 4) as RotationState;
  }

  /**
   * Set the rotation state directly.
   * @param rotation - New rotation state
   */
  setRotation(rotation: RotationState): void {
    this._rotation = rotation;
  }

  /**
   * Create a copy of this tetromino.
   */
  clone(): Tetromino {
    const copy = new Tetromino(this.type, { ...this._position });
    copy._rotation = this._rotation;
    return copy;
  }
}
