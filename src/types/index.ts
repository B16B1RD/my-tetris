/**
 * Tetris Game Type Definitions
 */

/** Tetromino types following Tetris Guideline */
export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/** Rotation states (0 = spawn, 1 = R, 2 = 2, 3 = L) */
export type RotationState = 0 | 1 | 2 | 3;

/** Position on the game board */
export interface Position {
  x: number;
  y: number;
}

/** A single cell on the board */
export interface Cell {
  filled: boolean;
  color: string | null;
}

/** Game board dimensions */
export interface BoardConfig {
  width: number;
  height: number;
  bufferHeight: number;
}

/** Tetromino shape matrix (4x4) */
export type ShapeMatrix = readonly (readonly number[])[];

/** Tetromino definition */
export interface TetrominoDef {
  type: TetrominoType;
  color: string;
  shapes: readonly ShapeMatrix[];
}

/** Active tetromino state */
export interface ActiveTetromino {
  type: TetrominoType;
  position: Position;
  rotation: RotationState;
}

/** Game state */
export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

/** Score action types */
export type ScoreAction =
  | 'single'
  | 'double'
  | 'triple'
  | 'tetris'
  | 'tspin'
  | 'tspin-mini'
  | 'tspin-single'
  | 'tspin-double'
  | 'tspin-triple'
  | 'softdrop'
  | 'harddrop';

/** Game statistics */
export interface GameStats {
  score: number;
  level: number;
  lines: number;
  combo: number;
  backToBack: boolean;
}

/** Input action types */
export type InputAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateClockwise'
  | 'rotateCounterClockwise'
  | 'hold'
  | 'pause';

/** Key binding configuration */
export type KeyBindings = Record<InputAction, string[]>;

/** Replay event */
export interface ReplayEvent {
  timestamp: number;
  action: InputAction;
}

/** Replay data */
export interface ReplayData {
  seed: number;
  events: ReplayEvent[];
  finalScore: number;
  finalLevel: number;
  finalLines: number;
  date: string;
}

/** High score entry */
export interface HighScoreEntry {
  name: string;
  score: number;
  level: number;
  lines: number;
  date: string;
}

/** Canvas rendering context (nullable for safety) */
export type RenderingContext = CanvasRenderingContext2D | null;

/** Game configuration */
export interface GameConfig {
  canvas: {
    width: number;
    height: number;
    cellSize: number;
  };
  timing: {
    lockDelay: number;
    das: number;
    arr: number;
  };
  scoring: {
    softDropMultiplier: number;
    hardDropMultiplier: number;
  };
}

/** Default game configuration */
export const DEFAULT_CONFIG: GameConfig = {
  canvas: {
    width: 400,
    height: 600,
    cellSize: 24,
  },
  timing: {
    lockDelay: 500,
    das: 170,
    arr: 50,
  },
  scoring: {
    softDropMultiplier: 1,
    hardDropMultiplier: 2,
  },
};

/** Board configuration */
export const BOARD_CONFIG: BoardConfig = {
  width: 10,
  height: 20,
  bufferHeight: 4,
};
